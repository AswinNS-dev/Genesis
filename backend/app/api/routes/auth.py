from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User, LoginAttempt, AuditLog
from backend.app.database.supabase_service import supabase_db
from backend.app.security.authentication import verify_password, create_access_token, get_password_hash
from backend.app.security.rbac import get_current_user, get_current_user_optional
from backend.app.api.schemas.auth_schema import LoginSchema, TokenResponseSchema, UserResponseSchema

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_DEMO_PASSWORDS = {
    "admin@crimeintel.demo": "Admin@1234",
    "investigator@crimeintel.demo": "Investigator@1234",
    "analyst@crimeintel.demo": "Analyst@1234",
    "viewer@crimeintel.demo": "Viewer@1234"
}

@router.get("/demo-users")
def get_demo_users(db: Session = Depends(get_db)):
    """
    Fetches real demo users from Supabase, enriched with demo credentials so anyone can test easily.
    """
    supabase_users = []
    try:
        raw_users = supabase_db._get("User")
        if isinstance(raw_users, list) and len(raw_users) > 0:
            supabase_users = raw_users
    except Exception as e:
        print(f"Notice: Supabase user query fallback to local DB: {e}")

    # Fallback to local DB if Supabase query had 0 users
    if not supabase_users:
        db_users = db.query(User).all()
        supabase_users = [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "status": u.status
            }
            for u in db_users
        ]

    # Map with credentials and descriptions for UI
    results = []
    role_badges = {
        "ADMIN": {"title": "Chief Inspector / Admin", "desc": "Full system control, user access, and audit logs"},
        "INVESTIGATOR": {"title": "Lead Investigator", "desc": "Case management, suspect tracking, and timeline analysis"},
        "ANALYST": {"title": "Forensic Intelligence Analyst", "desc": "Graph clustering, anomaly detection, and link analysis"},
        "VIEWER": {"title": "Field Officer / Observer", "desc": "Read-only access to dossiers, evidence, and public reports"}
    }

    for u in supabase_users:
        email = u.get("email", "")
        role = (u.get("role") or "VIEWER").upper()
        role_info = role_badges.get(role, {"title": role, "desc": "CrimeIntel Platform Access"})
        
        results.append({
            "id": u.get("id"),
            "email": email,
            "name": u.get("name"),
            "role": role,
            "roleTitle": role_info["title"],
            "description": role_info["desc"],
            "defaultPassword": DEFAULT_DEMO_PASSWORDS.get(email, "Demo@1234"),
            "status": u.get("status", "ACTIVE")
        })

    return {
        "source": "Supabase Cloud Database",
        "count": len(results),
        "demoUsers": results
    }

@router.post("/login", response_model=TokenResponseSchema)
def login(payload: LoginSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    
    # 1. Look up in local DB
    user = db.query(User).filter(User.email == email_clean).first()

    # 2. If not found in local DB, check Supabase
    if not user:
        try:
            sb_users = supabase_db._get("User", params={"email": f"eq.{email_clean}"})
            if isinstance(sb_users, list) and len(sb_users) > 0:
                sb_u = sb_users[0]
                user = User(
                    id=sb_u.get("id"),
                    email=sb_u.get("email"),
                    name=sb_u.get("name"),
                    passwordHash=sb_u.get("passwordHash") or get_password_hash(payload.password),
                    role=sb_u.get("role", "VIEWER"),
                    status=sb_u.get("status", "ACTIVE")
                )
                db.add(user)
                db.commit()
                db.refresh(user)
        except Exception as e:
            print(f"Supabase login lookup error: {e}")

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent") if request else None

    if not user or not verify_password(payload.password, user.passwordHash):
        # Demo password direct match fallback for quick testing
        demo_pwd = DEFAULT_DEMO_PASSWORDS.get(email_clean)
        if user and demo_pwd and payload.password == demo_pwd:
            pass  # Allowed for standard demo password
        else:
            if user:
                user.failedLogins = (user.failedLogins or 0) + 1
                from backend.app.security.threat_detection import evaluate_login_threats
                evaluate_login_threats(db, user)

            attempt = LoginAttempt(email=payload.email, success=False, reason="Invalid credentials", ip=client_ip, userAgent=user_agent, userId=user.id if user else None)
            audit = AuditLog(
                action="LOGIN_FAILED",
                detail=f"Failed authentication attempt for {payload.email}",
                userId=user.id if user else None,
                ip=client_ip,
                userAgent=user_agent,
                status="FAILED",
                severity="HIGH" if user and user.failedLogins >= 3 else "MEDIUM",
                resource="Authentication",
                resourceId=payload.email,
                role=user.role if user else "UNKNOWN"
            )
            db.add(attempt)
            db.add(audit)
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user.failedLogins = 0
    attempt = LoginAttempt(email=payload.email, success=True, userId=user.id, ip=client_ip, userAgent=user_agent)
    audit = AuditLog(
        action="LOGIN_SUCCESS",
        detail=f"Officer {user.name} ({user.role}) successfully authenticated",
        userId=user.id,
        ip=client_ip,
        userAgent=user_agent,
        status="SUCCESS",
        severity="INFO",
        resource="Authentication",
        resourceId=user.id,
        role=user.role
    )
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

@router.post("/logout")
def logout(request: Request, response: Response, user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    response.delete_cookie(key="access_token")
    if user:
        client_ip = request.client.host if request and request.client else "127.0.0.1"
        audit = AuditLog(
            action="LOGOUT",
            detail=f"Officer {user.name} signed out",
            userId=user.id,
            ip=client_ip,
            status="SUCCESS",
            severity="INFO",
            resource="Authentication",
            resourceId=user.id,
            role=user.role
        )
        db.add(audit)
        db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponseSchema)
def get_me(user: User = Depends(get_current_user)):
    return UserResponseSchema.model_validate(user)
