from typing import Optional
from sqlalchemy.orm import Session
from backend.app.database.models import AuditLog

def log_action(
    db: Session,
    action: str,
    detail: Optional[str] = None,
    case_id: Optional[str] = None,
    user_id: Optional[str] = None,
    ip: Optional[str] = None,
    status: str = "SUCCESS"
) -> AuditLog:
    log = AuditLog(
        action=action,
        detail=detail,
        caseId=case_id,
        userId=user_id,
        ip=ip,
        status=status,
    )
    db.add(log)
    db.flush()
    return log
