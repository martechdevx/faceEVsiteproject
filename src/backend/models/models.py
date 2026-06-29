from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(150), nullable=False)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # one user → many enrolled faces
    enrolled_faces = relationship("EnrolledFace", back_populates="owner", cascade="all, delete")


class EnrolledFace(Base):
    __tablename__ = "enrolled_faces"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(150), nullable=False)
    matric_number = Column(String(50), nullable=False)
    gender        = Column(String(20), nullable=False)
    image_path    = Column(String(500), nullable=False)   # path to stored image
    faiss_index_id = Column(Integer, nullable=False)      # position in FAISS index
    enrolled_by   = Column(Integer, ForeignKey("users.id"), nullable=False)
    enrolled_at   = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="enrolled_faces")
