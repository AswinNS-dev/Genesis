from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class UserResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    role: str
    status: str
    failedLogins: int = 0
    createdAt: datetime

class TokenResponseSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponseSchema
