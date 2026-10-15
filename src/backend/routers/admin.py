import hashlib
import os

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from core.audit import log_event
from core.config import settings
from core.database import get_db
from core.dependencies import get_current_user
from models.models import AuditLog, EnrolledFace, EnrollmentClaim, RefreshToken, User
from schemas.admin import (
    AdminAccountResponse,
    AdminPasswordUpdate,
    AdminProfileUpdate,
    GrantAdminRequest,
    MessageResponse,
)
from core.security import hash_password, verify_password
from core.security import hash_password
from faiss_engine.faiss_manager import faiss_manager

router = APIRouter(prefix="/admin", tags=["Admin management"])


def _admin_emails() -> set[str]:
    return settings.admin_emails


def _activity_payload(entry: AuditLog, actor_name: str | None) -> dict:
    return {
        "id": entry.id,
        "event_type": entry.event_type,
        "success": entry.success,
        "actor_id": entry.user_id,
        "actor_name": actor_name,
        "actor_email": entry.email,
        "detail": entry.detail,
        "created_at": entry.created_at,
    }


def _remove_enrollment_image_files(images: list[str]) -> None:
    if not images or not os.path.isdir(settings.UPLOAD_DIR):
        return
    image_hashes = {hashlib.sha256(image.encode("ascii")).digest() for image in images}
    for entry in os.scandir(settings.UPLOAD_DIR):
        if not entry.is_file() or not entry.name.endswith(".txt"):
            continue
        try:
            with open(entry.path, "rb") as image_file:
                file_hash = hashlib.sha256(image_file.read()).digest()
            if file_hash in image_hashes:
                os.remove(entry.path)
        except OSError:
            continue


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin and current_user.email.lower() not in _admin_emails():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    admin_filters = [User.is_admin.is_(True)]
    if _admin_emails():
        admin_filters.append(func.lower(User.email).in_(_admin_emails()))

    try:
        faiss_total = faiss_manager.total
        faiss_ready = True
    except Exception:
        faiss_total = None
        faiss_ready = False

    return {
        "total_users": db.query(User).count(),
        "total_admins": db.query(User).filter(or_(*admin_filters)).count(),
        "total_enrolled": db.query(EnrolledFace).count(),
        "successful_verifications": db.query(AuditLog).filter(
            AuditLog.event_type == "verify",
            AuditLog.success.is_(True),
        ).count(),
        "failed_logins": db.query(AuditLog).filter(
            AuditLog.event_type == "login",
            AuditLog.success.is_(False),
        ).count(),
        "database_status": "online",
        "faiss_ready": faiss_ready,
        "faiss_total": faiss_total,
        "admin_allowlist_configured": bool(_admin_emails()),
        "request_signing_configured": bool(
            settings.HMAC_SECRET
            and settings.HMAC_SECRET != "replace_with_a_long_random_hmac_secret_key"
        ),
    }


@router.get("/activity")
def admin_activity(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    entries = (
        db.query(AuditLog)
        .filter(AuditLog.event_type != "login")
        .order_by(desc(AuditLog.created_at))
        .limit(100)
        .all()
    )
    actor_ids = {entry.user_id for entry in entries if entry.user_id is not None}
    users = db.query(User.id, User.full_name).filter(User.id.in_(actor_ids)).all() if actor_ids else []
    actor_names = {user_id: full_name for user_id, full_name in users}
    return [_activity_payload(entry, actor_names.get(entry.user_id)) for entry in entries]


@router.get("/enrollments")
def list_enrollments(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    groups = (
        db.query(
            EnrolledFace.enrolled_by.label("user_id"),
            func.max(EnrolledFace.full_name).label("full_name"),
            func.max(EnrolledFace.matric_number).label("matric_number"),
            func.max(EnrolledFace.program).label("program"),
            func.max(EnrolledFace.gender).label("gender"),
            func.count(EnrolledFace.id).label("face_count"),
            func.max(EnrolledFace.enrolled_at).label("enrolled_at"),
        )
        .group_by(EnrolledFace.enrolled_by)
        .order_by(desc("enrolled_at"))
    )
    total = db.query(func.count(func.distinct(EnrolledFace.enrolled_by))).scalar() or 0
    page = groups.offset(skip).limit(limit).all()
    user_ids = [item.user_id for item in page]
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    users_by_id = {account.id: account for account in users}

    return {
        "items": [
            {
                "user_id": item.user_id,
                "account_name": users_by_id[item.user_id].full_name,
                "account_email": users_by_id[item.user_id].email,
                "full_name": item.full_name,
                "matric_number": item.matric_number,
                "program": item.program,
                "gender": item.gender,
                "face_count": item.face_count,
                "enrolled_at": item.enrolled_at,
            }
            for item in page
            if item.user_id in users_by_id
        ],
        "total": total,
    }


@router.get("/enrollments/{user_id}/faces")
def list_enrollment_faces(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    faces = (
        db.query(EnrolledFace)
        .filter(EnrolledFace.enrolled_by == user_id)
        .order_by(EnrolledFace.enrolled_at.asc())
        .all()
    )
    if not faces:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found.")
    return [
        {
            "id": face.id,
            "image_base64": face.image_base64,
            "content_type": "image/png" if face.image_base64.startswith("iVBOR") else "image/jpeg",
            "enrolled_at": face.enrolled_at,
        }
        for face in faces
    ]


@router.delete("/enrollments/{user_id}", response_model=MessageResponse)
def delete_enrollment(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    saved_images = []
    face_count = 0
    with faiss_manager.lock:
        faces = (
            db.query(EnrolledFace)
            .filter(EnrolledFace.enrolled_by == user_id)
            .order_by(EnrolledFace.faiss_index_id.desc())
            .all()
        )
        if not faces:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found for this user.")

        for face in faces:
            position = face.faiss_index_id
            if position < 0 or position >= len(faiss_manager.metadata) or faiss_manager.metadata[position] != face.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The face index is out of sync. Rebuild the index before deleting this enrollment.",
                )

        snapshot = faiss_manager.snapshot()
        saved_images = [face.image_base64 for face in faces]
        face_count = len(faces)
        try:
            for face in faces:
                position = face.faiss_index_id
                faiss_manager.remove_embedding(position)
                db.query(EnrolledFace).filter(
                    EnrolledFace.faiss_index_id > position,
                ).update(
                    {EnrolledFace.faiss_index_id: EnrolledFace.faiss_index_id - 1},
                    synchronize_session=False,
                )

            db.query(EnrolledFace).filter(EnrolledFace.enrolled_by == user_id).delete(
                synchronize_session=False,
            )
            db.query(EnrollmentClaim).filter(EnrollmentClaim.user_id == user_id).delete(
                synchronize_session=False,
            )
            db.commit()
        except Exception:
            db.rollback()
            faiss_manager.restore(snapshot)
            raise

    _remove_enrollment_image_files(saved_images)
    owner = db.query(User).filter(User.id == user_id).first()
    log_event(
        db,
        "admin_enrollment_delete",
        user_id=admin.id,
        email=admin.email,
        detail=f"deleted {face_count} enrolled face(s) for {owner.email if owner else user_id}",
    )
    return MessageResponse(message="Enrollment deleted. The user may enroll again.")


@router.get("/me", response_model=AdminAccountResponse)
def get_admin_profile(admin: User = Depends(require_admin)):
    return {
        "id": admin.id,
        "full_name": admin.full_name,
        "email": admin.email,
        "created_at": admin.created_at,
        "is_admin": True,
    }


@router.patch("/me", response_model=AdminAccountResponse)
def update_admin_profile(
    payload: AdminProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    email = str(payload.email).strip().lower()
    duplicate = db.query(User).filter(
        func.lower(User.email) == email,
        User.id != admin.id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email is already in use.")

    previous_email = admin.email
    admin.full_name = payload.full_name.strip()
    admin.email = email
    admin.is_admin = True
    db.commit()
    db.refresh(admin)

    log_event(
        db,
        "admin_profile_update",
        user_id=admin.id,
        email=admin.email,
        detail=f"updated admin profile; previous email={previous_email}",
    )
    return admin


@router.patch("/me/password", response_model=MessageResponse)
def update_admin_password(
    payload: AdminPasswordUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not verify_password(payload.current_password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if verify_password(payload.new_password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current password.")

    admin.hashed_password = hash_password(payload.new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == admin.id).update(
        {RefreshToken.revoked: True},
        synchronize_session=False,
    )
    db.commit()

    log_event(
        db,
        "admin_password_change",
        user_id=admin.id,
        email=admin.email,
        detail="admin password changed; refresh sessions revoked",
    )
    return MessageResponse(message="Password updated. Other sessions have been signed out.")


@router.post("/users", response_model=AdminAccountResponse)
def grant_admin_access(
    payload: GrantAdminRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    email = str(payload.email).strip().lower()
    account = db.query(User).filter(func.lower(User.email) == email).first()
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered account uses that email. The user must sign up first.",
        )

    if account.full_name.strip().casefold() != payload.full_name.strip().casefold():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The name does not match the registered account for that email.",
        )

    if account.is_admin:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account already has admin access.",
        )

    account.is_admin = True
    db.commit()
    db.refresh(account)

    log_event(
        db,
        "admin_grant",
        user_id=admin.id,
        email=admin.email,
        detail=f"granted admin access to {account.email}",
    )
    return account


@router.get("/users", response_model=list[AdminAccountResponse])
def list_all_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Return safe details for every account in the users table."""
    users = (
        db.query(User)
        .order_by(User.created_at.asc())
        .all()
    )
    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "created_at": user.created_at,
            "is_admin": user.is_admin or user.email.lower() in _admin_emails(),
        }
        for user in users
    ]


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_account(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account from this endpoint.",
        )

    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    target_email = target.email
    db.query(RefreshToken).filter(RefreshToken.user_id == target.id).delete(
        synchronize_session=False
    )
    db.query(AuditLog).filter(AuditLog.user_id == target.id).update(
        {AuditLog.user_id: None}, synchronize_session=False
    )
    db.delete(target)
    db.commit()

    log_event(
        db,
        "admin_delete",
        user_id=admin.id,
        email=admin.email,
        detail=f"deleted account {target_email}",
    )
    return MessageResponse(message="Account deleted successfully.")