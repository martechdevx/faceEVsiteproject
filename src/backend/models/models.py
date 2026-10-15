from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    full_name     = Column(String(150), nullable=False)
    email         = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin      = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # one user → many enrolled faces
    enrolled_faces = relationship("EnrolledFace", back_populates="owner", cascade="all, delete")


class EnrolledFace(Base):
    __tablename__ = "enrolled_faces"

    id            = Column(Integer, primary_key=True)
    full_name     = Column(String(150), nullable=False)
    matric_number = Column(String(50), nullable=False)
    gender        = Column(String(20), nullable=False)
    program        = Column(String(20), nullable=False)
    image_base64    = Column(Text().with_variant(MEDIUMTEXT(), "mysql"), nullable=False)
    faiss_index_id = Column(Integer, nullable=False)      # position in FAISS index
    is_verified   = Column(Boolean, default=False, nullable=True)
    verified_at = Column(DateTime, default=datetime.utcnow)
    enrolled_by   = Column(Integer, ForeignKey("users.id"), nullable=False)
    enrolled_at   = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="enrolled_faces")


class EnrollmentClaim(Base):
    __tablename__ = "enrollment_claims"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True)
    event_type  = Column(String(30), nullable=False)   # signup | login | enroll | verify
    success     = Column(Boolean, default=True, nullable=False)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    email       = Column(String(255), nullable=True)
    detail      = Column(String(255), nullable=True)   # e.g. "invalid password", "match 92%"
    ip_address  = Column(String(45), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
 
    id          = Column(Integer, primary_key=True)
    token_hash  = Column(String(64), unique=True, nullable=False)  # sha256 hex digest, never store raw
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at  = Column(DateTime, nullable=False)
    revoked     = Column(Boolean, default=False, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)