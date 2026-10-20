from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Optional, List


# ── Auth ─

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    admin_mode: bool = False


class TokenResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str

class LoginResponse(BaseModel):
    message: str
    user_id: int
    full_name: str
    email: Optional[EmailStr] = None
    is_admin: bool = False


class UserProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    current_password: str = Field(min_length=1, max_length=128)


class UserPasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# ── Enrollment ─

class EnrollResponse(BaseModel):
    message: str
    enrolled_id: int
    full_name: str
    matric_number: str
    faiss_index_id: int

class EnrollRequest(BaseModel):
    full_name: str
    gender: str
    program: str
    matric_number: str
    images: List[str] = Field(min_length=1, max_length=3)
    
# ── Verification 

class MatchResult(BaseModel):
    enrolled_id: int
    full_name: str
    gender: Optional[str]
    matric_number: str
    program: Optional[str] = None
    image_base64: str
    similarity_score: float
    match_found: bool

class VerifyRequest(BaseModel):
    image: str

class VerifyResponse(BaseModel):
    match_found: bool
    best_match: Optional[MatchResult]
    message: str


# ── Dashboard 

class DashboardActivity(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    event_type: str
    success: bool
    detail: Optional[str] = None
    created_at: datetime

class DashboardStats(BaseModel):
    total_enrolled: int
    total_verified: int
    user_full_name: str
    recent_activity: List[DashboardActivity] = Field(default_factory=list)
