import os
import uuid
import base64
import binascii
from typing import List
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from core.config import settings
from core.hmac_auth import verify_hmac
from core.audit import log_event
from core.enrollment_files import remove_enrollment_image_files
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
    if len(images) > 3:
        raise ValueError("You can enroll up to 3 images at once.")
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
    saved_files = []
    ip = f"{request.client.host}:{request.client.port}" if request.client else None
    decoded_images = [decode_enrollment_image(image) for image in payload.images]
    existing_face = db.query(EnrolledFace.id).filter(
        EnrolledFace.enrolled_by == current_user.id,
    ).first()
    existing_claim = db.query(EnrollmentClaim.user_id).filter(
        EnrollmentClaim.user_id == current_user.id,
    ).first()
    if existing_claim and not existing_face:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your enrollment is already in progress. Please wait before trying again.",
        )
    if existing_face and not payload.reenroll:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled. Choose re-enroll to replace your current enrollment.",
        )
    if payload.reenroll and not existing_face:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="There is no existing enrollment to replace. Submit a new enrollment instead.",
        )

    embeddings = [get_embedding_from_bytes(image_bytes) for image_bytes in decoded_images]
    old_images = []
    is_reenrollment = False

    with faiss_manager.lock:
        db.query(User).filter(User.id == current_user.id).with_for_update().first()
        old_faces = (
            db.query(EnrolledFace)
            .filter(EnrolledFace.enrolled_by == current_user.id)
            .order_by(EnrolledFace.faiss_index_id.desc())
            .all()
        )
        claim = db.query(EnrollmentClaim).filter(
            EnrollmentClaim.user_id == current_user.id,
        ).first()

        if claim and not old_faces:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Your enrollment is already in progress. Please wait before trying again.",
            )
        if old_faces and not payload.reenroll:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already enrolled. Choose re-enroll to replace your current enrollment.",
            )
        if payload.reenroll and not old_faces:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="There is no existing enrollment to replace. Submit a new enrollment instead.",
            )

        is_reenrollment = bool(old_faces)
        for face in old_faces:
            position = face.faiss_index_id
            if (
                position < 0
                or position >= len(faiss_manager.metadata)
                or faiss_manager.metadata[position] != face.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The face index is out of sync. Rebuild the index before replacing this enrollment.",
                )

        starting_faiss_count = len(faiss_manager.metadata)
        snapshot = faiss_manager.snapshot() if is_reenrollment else None
        old_images = [face.image_base64 for face in old_faces]
        started_new_claim = False
        try:
            if not claim:
                db.add(EnrollmentClaim(user_id=current_user.id))
                if not old_faces:
                    db.commit()
                started_new_claim = True

            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            for b64_string in payload.images:
                save_path = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4().hex}.txt")
                saved_files.append(save_path)
                with open(save_path, "w") as image_file:
                    image_file.write(b64_string)

            for face in old_faces:
                faiss_manager.remove_embedding(face.faiss_index_id)
                db.delete(face)

            for b64_string, embedding in zip(payload.images, embeddings):
                faiss_position = faiss_manager.add_embedding(embedding, db_row_id=0)
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
                db.flush()
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

            db.flush()
            if is_reenrollment:
                face_positions = {
                    face_id: position
                    for position, face_id in enumerate(faiss_manager.metadata)
                }
                position_updates = [
                    {"id": face_id, "faiss_index_id": face_positions[face_id]}
                    for face_id, _ in db.query(
                        EnrolledFace.id,
                        EnrolledFace.faiss_index_id,
                    ).all()
                ]
                if position_updates:
                    db.execute(update(EnrolledFace), position_updates)

            db.commit()
        except IntegrityError as exc:
            db.rollback()
            if snapshot is not None:
                faiss_manager.restore(snapshot)
            else:
                while len(faiss_manager.metadata) > starting_faiss_count:
                    faiss_manager.remove_embedding(len(faiss_manager.metadata) - 1)
            for path in saved_files:
                if os.path.exists(path):
                    os.remove(path)
            if started_new_claim:
                db.query(EnrollmentClaim).filter(
                    EnrollmentClaim.user_id == current_user.id,
                ).delete(synchronize_session=False)
                db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Your enrollment could not be started because another request is in progress.",
            ) from exc
        except Exception:
            db.rollback()
            if snapshot is not None:
                faiss_manager.restore(snapshot)
            else:
                while len(faiss_manager.metadata) > starting_faiss_count:
                    faiss_manager.remove_embedding(len(faiss_manager.metadata) - 1)
            for path in saved_files:
                if os.path.exists(path):
                    os.remove(path)
            if started_new_claim:
                db.query(EnrollmentClaim).filter(
                    EnrollmentClaim.user_id == current_user.id,
                ).delete(synchronize_session=False)
                db.commit()
            raise

    if is_reenrollment:
        remove_enrollment_image_files(old_images)
    log_event(
        db,
        "reenroll" if is_reenrollment else "enroll",
        success=True,
        user_id=current_user.id,
        email=current_user.email,
        detail=f"{'re-enrollment' if is_reenrollment else 'enrollment'} completed; {len(results)} face images",
        ip_address=ip,
    )

    return results