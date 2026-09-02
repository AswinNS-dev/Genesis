from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.authentication import decode_token

security_bearer = HTTPBearer(auto_error=False)

ROLE_LEVELS = {
    "VIEWER": 1,
    "ANALYST": 2,
    "INVESTIGATOR": 3,
    "ADMIN": 4,
}

def has_role(user_role: str, required_role: str) -> bool:
    return ROLE_LEVELS.get((user_role or "").upper(), 0) >= ROLE_LEVELS.get((required_role or "").upper(), 0)

async def get_current_user_optional(
    request: Request,
    auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    token = auth_creds.credentials if auth_creds else request.cookies.get("access_token")
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub") or payload.get("id")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()

async def get_current_user(user: Optional[User] = Depends(get_current_user_optional)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {user.status.lower()}",
        )
    return user

def require_roles(*allowed_roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "VIEWER").upper()
        if not any(has_role(user_role, role) for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires roles: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker
