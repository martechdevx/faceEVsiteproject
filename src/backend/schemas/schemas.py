from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ── Auth ───────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str


# ── Enrollment ─────────────────────────────────────────────────────────────

class EnrollResponse(BaseModel):
    message: str
    enrolled_id: int
    full_name: str
    matric_number: str
    faiss_index_id: int


# ── Verification ───────────────────────────────────────────────────────────

class MatchResult(BaseModel):
    enrolled_id: int
    full_name: str
    gender: Optional[str]
    matric_number: str
    image_url: str
    similarity_score: float
    match_found: bool


class VerifyResponse(BaseModel):
    match_found: bool
    best_match: Optional[MatchResult]
    message: str


# ── Dashboard ──────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_enrolled: int
    total_verified: int
    user_full_name: str
