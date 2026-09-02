from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User, LoginAttempt, AuditLog
from backend.app.security.authentication import verify_password, create_access_token
from backend.app.security.rbac import get_current_user
from backend.app.api.schemas.auth_schema import LoginSchema, TokenResponseSchema, UserResponseSchema

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponseSchema)
def login(payload: LoginSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.passwordHash):
        attempt = LoginAttempt(email=payload.email, success=False, reason="Invalid credentials")
        db.add(attempt)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user.failedLogins = 0
    attempt = LoginAttempt(email=payload.email, success=True, userId=user.id)
    audit = AuditLog(action="LOGIN", detail="Successful sign-in", userId=user.id)
    db.add(attempt)
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role, "name": user.name})
    response.set_cookie(key="access_token", value=token, httponly=True, max_age=28800)

    return TokenResponseSchema(
        access_token=token,
        token_type="bearer",
        user=UserResponseSchema.model_validate(user)
    )

@router.get("/me", response_model=UserResponseSchema)
def get_me(user: User = Depends(get_current_user)):
    return UserResponseSchema.model_validate(user)
