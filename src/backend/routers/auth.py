from datetime import datetime
import logging
import os

from sqlalchemy import func, or_
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.audit import log_event
from core.config import settings
from core.database import get_db
from core.hmac_auth import verify_hmac
from core.security import (
    create_access_token,
    generate_refresh_token,
    get_current_user,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from models.models import RefreshToken, User
from schemas.schemas import (
    LoginRequest,
    LoginResponse,
    SignupRequest,
    TokenResponse,
    UserPasswordUpdate,
    UserProfileUpdate,
)

logger = logging.getLogger("auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

running_on_railway = os.environ.get("RUNNING_ON_RAILWAY", "").lower() == "true"
COOKIE_KWARGS = dict(
    httponly=True,
    secure=running_on_railway,
    samesite="none" if running_on_railway else "lax",
)


def _issue_tokens(response: Response, db: Session, user: User):
    """Creates a fresh access + refresh token pair, stores the refresh
    token's hash in the DB, and sets both as HttpOnly cookies."""
    db.query(RefreshToken).filter(
        or_(
            RefreshToken.revoked.is_(True),
            RefreshToken.expires_at <= datetime.utcnow(),
        )
    ).delete(synchronize_session=False)
    access_token = create_access_token({"sub": str(user.id)})

    raw_refresh, refresh_hash, expires_at = generate_refresh_token()
    db.add(RefreshToken(token_hash=refresh_hash, user_id=user.id, expires_at=expires_at))
    db.commit()

    # ── FIX: set path="/" on the refresh cookie too so the browser sends it
    #         to /auth/refresh. With path="/auth" the cookie IS sent to that
    #         path in theory, but some browsers/fetch clients scope it more
    #         strictly when the API is cross-origin. "/" is safest for dev.
    response.set_cookie("access_token",  access_token, max_age=15 * 60,          path="/", **COOKIE_KWARGS)
    response.set_cookie("refresh_token", raw_refresh,  max_age=7 * 24 * 60 * 60, path="/", **COOKIE_KWARGS)
    return access_token


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        logger.warning("SIGNUP FAIL for email=%s: email already registered", payload.email)
        log_event(
            db, "signup", success=False, email=payload.email,
            detail=f"email already registered; attempted name={payload.full_name}",
            ip_address=f"{request.client.host}:{request.client.port}" if request.client else None,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.warning("SIGNUP OK user_id=%s email=%s", user.id, user.email)
    log_event(
        db, "signup", success=True, user_id=user.id,
        detail=f"signup successful: {user.full_name}", email=user.email,
        ip_address=f"{request.client.host}:{request.client.port}" if request.client else None,
    )
    return {"message": "Account created successfully.", "user_id": user.id}


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning("LOGIN FAIL for email=%s", payload.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    is_admin = user.is_admin or user.email.lower() in settings.admin_emails
    if payload.admin_mode and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is not authorized for admin access.")

    logger.warning("LOGIN OK user_id=%s email=%s", user.id, user.email)
    _issue_tokens(response, db, user)

    return LoginResponse(message="Successfully logged in", user_id=user.id, full_name=user.full_name, email=user.email, is_admin=is_admin)


@router.post("/refresh", response_model=LoginResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token provided.")

    token_hash = hash_refresh_token(raw_token)
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not stored or stored.revoked or stored.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalid or expired.")

    # Rotate: revoke old, issue new pair
    stored.revoked = True
    db.commit()

    user = db.query(User).filter(User.id == stored.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    _issue_tokens(response, db, user)
    return LoginResponse(
        message="Token refreshed",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        is_admin=user.is_admin or user.email.lower() in settings.admin_emails,
    )


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        token_hash = hash_refresh_token(raw_token)
        stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if stored:
            stored.revoked = True
            db.commit()

    response.delete_cookie("access_token",  path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out."}


@router.get("/me", response_model=LoginResponse)
def me(current_user: User = Depends(get_current_user)):
    return LoginResponse(
        message="Authenticated",
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        is_admin=current_user.is_admin or current_user.email.lower() in settings.admin_emails,
    )


@router.patch("/me", response_model=LoginResponse)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    email = str(payload.email).strip().lower()
    duplicate = db.query(User).filter(
        func.lower(User.email) == email,
        User.id != current_user.id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email is already in use.")

    is_current_admin = current_user.is_admin or current_user.email.lower() in settings.admin_emails
    if not is_current_admin and email in settings.admin_emails:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email is reserved for an administrator account.",
        )

    previous_email = current_user.email
    current_user.full_name = payload.full_name.strip()
    current_user.email = email
    db.commit()
    db.refresh(current_user)

    log_event(
        db,
        "profile_update",
        user_id=current_user.id,
        email=current_user.email,
        detail=f"updated profile; previous email={previous_email}",
    )
    is_admin = current_user.is_admin or current_user.email.lower() in settings.admin_emails
    return LoginResponse(
        message="Profile updated.",
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        is_admin=is_admin,
    )


@router.patch("/me/password")
def update_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current password.")

    current_user.hashed_password = hash_password(payload.new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).update(
        {RefreshToken.revoked: True},
        synchronize_session=False,
    )
    db.commit()
    log_event(
        db,
        "password_change",
        user_id=current_user.id,
        email=current_user.email,
        detail="user password changed; refresh sessions revoked",
    )
    return {"message": "Password updated. Other sessions have been signed out."}


@router.post("/swagger-login", include_in_schema=False)
def swagger_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}