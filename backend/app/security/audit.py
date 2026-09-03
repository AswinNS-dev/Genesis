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
    status: str = "SUCCESS",
    severity: str = "INFO",
    resource: Optional[str] = None,
    resource_id: Optional[str] = None,
    role: Optional[str] = None,
    user_agent: Optional[str] = None,
    previous_state: Optional[str] = None,
    new_state: Optional[str] = None,
) -> AuditLog:
    """
    Records a comprehensive audit event in the database.
    Call db.commit() after calling this to persist.
    """
    log = AuditLog(
        action=action,
        detail=detail,
        caseId=case_id,
        userId=user_id,
        ip=ip,
        status=status,
        severity=severity,
        resource=resource,
        resourceId=resource_id,
        role=role,
        userAgent=user_agent,
        previousState=previous_state,
        newState=new_state,
    )
    db.add(log)
    db.flush()
    return log
