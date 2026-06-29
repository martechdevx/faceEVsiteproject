import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from core.config import settings
from models.models import User, EnrolledFace
from schemas.schemas import EnrollResponse
from faiss_engine.faiss_manager import faiss_manager
from faiss_engine.face_engine import get_embedding_from_bytes   # ← your face_engine

router = APIRouter(prefix="/enroll", tags=["Enrollment"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


@router.post("/", response_model=EnrollResponse, status_code=status.HTTP_201_CREATED)
async def enroll_face(
    full_name: str = Form(...),
    gender: str = Form(...),
    matric_number: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file extension
    ext = os.path.splitext(image.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload a JPG or PNG or JPEG",
        )

    image_bytes = await image.read()

    # ── Extract embedding via face_engine.py ───────────────────────────────
    embedding = get_embedding_from_bytes(image_bytes)

    # ── Save image to disk ─────────────────────────────────────────────────
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(save_path, "wb") as f:
        f.write(image_bytes)

    # ── Add to FAISS (placeholder id first) ───────────────────────────────
    faiss_position = faiss_manager.add_embedding(embedding, db_row_id=0)

    # ── Save metadata to MySQL ─────────────────────────────────────────────
    enrolled = EnrolledFace(
        full_name=full_name,
        gender=gender,
        matric_number=matric_number,
        image_path=save_path,
        faiss_index_id=faiss_position,
        enrolled_by=current_user.id,
    )
    db.add(enrolled)
    db.commit()
    db.refresh(enrolled)

    # ── Update FAISS metadata with real DB row id ──────────────────────────
    faiss_manager.metadata[faiss_position] = enrolled.id
    faiss_manager._save()

    return EnrollResponse(
        message="Face enrolled successfully.",
        enrolled_id=enrolled.id,
        matric_number=enrolled.matric_number,
        full_name=enrolled.full_name,
        faiss_index_id=faiss_position,
    )
