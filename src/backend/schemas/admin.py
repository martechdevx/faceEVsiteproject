from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    created_at: datetime
    is_admin: bool


class GrantAdminRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    email: EmailStr


class AdminProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    email: EmailStr


class AdminPasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str