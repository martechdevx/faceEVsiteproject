from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from models.models import User, EnrolledFace
from schemas.schemas import VerifyResponse, MatchResult
from faiss_engine.faiss_manager import faiss_manager
from faiss_engine.face_engine import get_embedding_from_bytes   # ← your face_engine

router = APIRouter(prefix="/verify", tags=["Verification"])

SIMILARITY_THRESHOLD = 0.40   # cosine similarity — tune this (0.0 → 1.0)


@router.post("/", response_model=VerifyResponse)
async def verify_face(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_bytes = await image.read()

    # ── Extract embedding via face_engine.py ───────────────────────────────
    embedding = get_embedding_from_bytes(image_bytes)

    # ── Search FAISS index ─────────────────────────────────────────────────
    results = faiss_manager.search(embedding, top_k=5)

    if not results:
        return VerifyResponse(
            match_found=False,
            best_match=None,
            message="No faces enrolled in the system yet.",
        )

    best_db_id, best_score = results[0]

    if best_score < SIMILARITY_THRESHOLD:
        return VerifyResponse(
            match_found=False,
            best_match=None,
            message=f"No match found. Closest similarity was {best_score:.2%}.",
        )

    # ── Fetch enrolled face record from MySQL ──────────────────────────────
    enrolled = db.query(EnrolledFace).filter(EnrolledFace.id == best_db_id).first()
    if not enrolled:
        return VerifyResponse(
            match_found=False,
            best_match=None,
            message="Match found in index but database record is missing.",
        )

    # Build public URL for the stored image
    image_filename = enrolled.image_path.split("/")[-1]
    image_url = f"/images/{image_filename}"

    match = MatchResult(
        enrolled_id=enrolled.id,
        full_name=enrolled.full_name,
        gender=enrolled.gender,
        matric_number=enrolled.matric_number,
        image_url=image_url,
        similarity_score=round(best_score * 100, 2),
        match_found=True,
    )

    return VerifyResponse(
        match_found=True,
        best_match=match,
        message=f"Match found — {best_score:.2%} similarity.",
    )
