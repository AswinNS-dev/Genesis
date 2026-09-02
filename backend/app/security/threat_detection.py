from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.database.models import User, SecurityAlert

def evaluate_login_threats(db: Session, user: User) -> Optional[SecurityAlert]:
    if user.failedLogins >= 5:
        user.status = "LOCKED"
        user.lockedUntil = datetime.now(timezone.utc) + timedelta(minutes=15)
        alert = SecurityAlert(
            severity="HIGH",
            type="BRUTE_FORCE",
            message=f"Account {user.email} locked after multiple failed authentications",
            userId=user.id,
        )
        db.add(alert)
        db.flush()
        return alert
    return None
