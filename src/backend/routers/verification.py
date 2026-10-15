from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from threading import Lock
import base64
from core.database import get_db
from core.dependencies import get_current_user
from core.hmac_auth import verify_hmac
from core.audit import log_event
from models.models import User, EnrolledFace
from schemas.schemas import VerifyResponse, MatchResult, VerifyRequest
from datetime import datetime
from faiss_engine.faiss_manager import faiss_manager
from faiss_engine.face_engine import get_embedding_from_bytes   # ← your face_engine
from routers.admin import require_admin

router = APIRouter(prefix="/verify", tags=["Verification"])  # HMAC temporarily disabled: dependencies=[Depends(verify_hmac)]

SIMILARITY_THRESHOLD = 0.40   # cosine similarity — tune this (0.0 → 1.0)
verification_count = 0
verification_count_lock = Lock()


def increment_verification_count() -> int:
    global verification_count
    with verification_count_lock:
        verification_count += 1
        return verification_count


def _verify_face(
    payload: VerifyRequest,
    request: Request,
    db: Session,
    current_user: User,
    allowed_db_ids: set[int] | None,
):
    increment_verification_count()
    ip = f"{request.client.host}:{request.client.port}" if request.client else None

    try:
        image_bytes = base64.b64decode(payload.image, validate=True)
    except Exception:
        log_event(db, "verify", success=False, user_id=current_user.id,
                   email=current_user.email, detail="invalid base64 image data",
                   ip_address=ip)
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")

    if allowed_db_ids is not None and not allowed_db_ids:
        log_event(db, "verify", success=False, user_id=current_user.id,
                  email=current_user.email, detail="user has no enrolled faces",
                  ip_address=ip)
        return VerifyResponse(
            match_found=False,
            best_match=None,
            message="You need to enroll a face before verification.",
        )

    embedding = get_embedding_from_bytes(image_bytes)

    results = faiss_manager.search(embedding, top_k=5, allowed_db_ids=allowed_db_ids)
    if not results:
        log_event(db, "verify", success=False, user_id=current_user.id,
                   email=current_user.email, detail="no faces enrolled in system",
                   ip_address=ip)
        return VerifyResponse(
            match_found=False, 
            best_match=None,
            message="No faces enrolled in the system yet."
            )

    best_db_id, best_score = max(results, key=lambda result: result[1])

    if best_score < SIMILARITY_THRESHOLD:
        log_event(db, "verify", success=False, user_id=current_user.id,
                   email=current_user.email,
                   detail=f"no match, best similarity {best_score:.2%}",
                   ip_address=ip)
        return VerifyResponse(
            match_found=False, 
            best_match=None,
            message=f"No match found. Closest similarity was {best_score:.2%}."
            )

    enrolled = db.query(EnrolledFace).filter(EnrolledFace.id == best_db_id).first()
    if not enrolled:
        log_event(db, "verify", success=False, user_id=current_user.id,
                   email=current_user.email,
                   detail="match found in index but db record missing",
                   ip_address=ip)
        return VerifyResponse(
            match_found=False, 
            best_match=None,
            message="Match found in index but database record is missing."
            )
    
    enrolled.is_verified = True
    enrolled.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(enrolled)

    log_event(db, "verify", success=True, user_id=current_user.id,
               email=current_user.email,
               detail=f"matched enrolled_id={enrolled.id} score={best_score:.2%}",
               ip_address=ip)
    
    match = MatchResult(
        enrolled_id=enrolled.id,
        full_name=enrolled.full_name,
        gender=enrolled.gender,
        matric_number=enrolled.matric_number,
        program=enrolled.program,
        image_base64=enrolled.image_base64,      # ← return base64 string directly
        similarity_score=round(best_score * 100, 2),
        match_found=True,
    )
    return VerifyResponse(
        match_found=True, 
        best_match=match,
        message=f"Match found — {best_score:.2%} similarity."
        )


@router.post("/", response_model=VerifyResponse)
def verify_face(
    payload: VerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owned_ids = {
        face_id
        for (face_id,) in db.query(EnrolledFace.id).filter(
            EnrolledFace.enrolled_by == current_user.id,
        ).all()
    }
    return _verify_face(payload, request, db, current_user, owned_ids)


@router.post("/admin", response_model=VerifyResponse)
def admin_verify_face(
    payload: VerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return _verify_face(payload, request, db, admin, None)