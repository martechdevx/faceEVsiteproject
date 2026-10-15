import os
import uuid
import base64
import binascii
from typing import List
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from core.config import settings
from core.hmac_auth import verify_hmac
from core.audit import log_event
from models.models import User, EnrolledFace, EnrollmentClaim
from schemas.schemas import EnrollResponse, EnrollRequest
from faiss_engine.faiss_manager import faiss_manager
from faiss_engine.face_engine import get_embedding_from_bytes   # ←face_engine

router = APIRouter(prefix="/enroll", tags=["Enrollment"])  # HMAC temporarily disabled: dependencies=[Depends(verify_hmac)]

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_IMAGE_SIZE_BYTES = 100 * 1024
MAX_BASE64_IMAGE_LENGTH = 4 * ((MAX_IMAGE_SIZE_BYTES + 2) // 3)


def decode_enrollment_image(image: str) -> bytes:
    if len(image) > MAX_BASE64_IMAGE_LENGTH:
        raise HTTPException(status_code=400, detail="Max file size is 100KB.")
    try:
        image_bytes = base64.b64decode(image, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Invalid base64 image data.") from None
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Max file size is 100KB.")
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")
    return image_bytes


def validate_uploaded_images(images: List[UploadFile]) -> List[UploadFile]:
    if len(images) > 6:
        raise ValueError("You can enroll up to 6 images at once.")
    return images


@router.get("/status")
def enrollment_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    claim = db.query(EnrollmentClaim).filter(
        EnrollmentClaim.user_id == current_user.id,
    ).first()
    faces = db.query(EnrolledFace).filter(
        EnrolledFace.enrolled_by == current_user.id,
    )
    first_face = faces.order_by(EnrolledFace.enrolled_at.asc()).first()
    return {
        "enrolled": claim is not None or first_face is not None,
        "in_progress": claim is not None and first_face is None,
        "full_name": first_face.full_name if first_face else None,
        "face_count": faces.count(),
    }


@router.post("/", response_model=List[EnrollResponse], status_code=status.HTTP_201_CREATED)
def enroll_face(
    payload: EnrollRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []
    faiss_position = 0
    saved_files = []
    persisted_files = set()
    ip = f"{request.client.host}:{request.client.port}" if request.client else None
    decoded_images = [decode_enrollment_image(image) for image in payload.images]

    already_enrolled = db.query(EnrollmentClaim).filter(
        EnrollmentClaim.user_id == current_user.id,
    ).first() or db.query(EnrolledFace.id).filter(
        EnrolledFace.enrolled_by == current_user.id,
    ).first()
    if already_enrolled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled. Contact an administrator if you need to reenroll.",
        )

    db.add(EnrollmentClaim(user_id=current_user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled or your enrollment is in progress. Contact an administrator if you need to reenroll.",
        )

    try:
        for b64_string, image_bytes in zip(payload.images, decoded_images):
            embedding = get_embedding_from_bytes(image_bytes)

            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            save_path = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4().hex}.txt")
            with open(save_path, "w") as image_file:
                image_file.write(b64_string)
            saved_files.append(save_path)

            with faiss_manager.lock:
                faiss_position = faiss_manager.add_embedding(embedding, db_row_id=0)
                try:
                    enrolled = EnrolledFace(
                        full_name=payload.full_name,
                        gender=payload.gender,
                        program=payload.program,
                        matric_number=payload.matric_number,
                        image_base64=b64_string,
                        faiss_index_id=faiss_position,
                        enrolled_by=current_user.id,
                    )
                    db.add(enrolled)
                    db.commit()
                    db.refresh(enrolled)
                except Exception:
                    db.rollback()
                    faiss_manager.remove_embedding(faiss_position)
                    raise

                persisted_files.add(save_path)
                faiss_manager.metadata[faiss_position] = enrolled.id
                faiss_manager._save()

            results.append(
                EnrollResponse(
                    message=f"{len(results) + 1} face(s) enrolled successfully",
                    enrolled_id=enrolled.id,
                    matric_number=enrolled.matric_number,
                    full_name=payload.full_name,
                    faiss_index_id=faiss_position,
                )
            )
    except Exception:
        db.rollback()
        for path in saved_files:
            if path not in persisted_files and os.path.exists(path):
                os.remove(path)
        if not persisted_files:
            db.query(EnrollmentClaim).filter(
                EnrollmentClaim.user_id == current_user.id,
            ).delete(synchronize_session=False)
            db.commit()
        log_event(
            db,
            "enroll",
            success=False,
            user_id=current_user.id,
            email=current_user.email,
            detail=f"enrollment batch failed after {len(results)} of {len(payload.images)} images",
            ip_address=ip,
        )
        raise

    log_event(
        db,
        "enroll",
        success=True,
        user_id=current_user.id,
        email=current_user.email,
        detail=f"enrollment batch completed; {len(results)} face images",
        ip_address=ip,
    )

    return results