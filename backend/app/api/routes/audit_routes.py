from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from backend.app.database.connection import get_db
from backend.app.database.models import AuditLog, LoginAttempt, SecurityAlert, User, BlockchainRecord
from backend.app.blockchain.verification import verify_blockchain_chain
from backend.app.security.rbac import get_current_user_optional, require_roles

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/summary")
def get_audit_summary(db: Session = Depends(get_db)):
    """
    Returns high-level security & audit metrics calculated from real database records.
    """
    total_events = db.query(AuditLog).count()
    failed_logins = db.query(LoginAttempt).filter(LoginAttempt.success == False).count()
    successful_logins = db.query(LoginAttempt).filter(LoginAttempt.success == True).count()
    security_alerts_count = db.query(SecurityAlert).count()
    
    # Specific action breakdown
    investigator_actions = db.query(AuditLog).filter(
        or_(
            AuditLog.action.ilike("%MATCH%"),
            AuditLog.action.ilike("%CASE%"),
            AuditLog.action.ilike("%ENTITY%"),
            AuditLog.action.ilike("%EVIDENCE%"),
            AuditLog.action.ilike("%NOTE%")
        )
    ).count()

    entity_decisions = db.query(AuditLog).filter(
        or_(
            AuditLog.action.ilike("%ENTITY_MATCH%"),
            AuditLog.action.ilike("%RESOLUTION%")
        )
    ).count()

    report_accesses = db.query(AuditLog).filter(
        or_(
            AuditLog.action == "REPORT_GENERATED",
            AuditLog.action == "REPORT_VIEWED"
        )
    ).count()

    dossier_accesses = db.query(AuditLog).filter(
        or_(
            AuditLog.action == "DOSSIER_VIEWED",
            AuditLog.action == "DOSSIER_GENERATED"
        )
    ).count()

    unauthorized_attempts = db.query(AuditLog).filter(
        or_(
            AuditLog.status == "FAILED",
            AuditLog.status == "UNAUTHORIZED",
            AuditLog.severity.in_(["HIGH", "CRITICAL"])
        )
    ).count()

    # Blockchain integrity status if any records exist
    blocks = db.query(BlockchainRecord).all()
    chain_status = verify_blockchain_chain(blocks)

    return {
        "totalEvents": total_events,
        "failedLogins": failed_logins,
        "successfulLogins": successful_logins,
        "securityAlerts": security_alerts_count,
        "investigatorActions": investigator_actions,
        "entityDecisions": entity_decisions,
        "reportAccessCount": report_accesses,
        "dossierAccessCount": dossier_accesses,
        "unauthorizedAttempts": unauthorized_attempts,
        "integrityStatus": "VERIFIED_INTACT" if chain_status.get("intact", True) else "COMPROMISED",
        "brokenBlockIndex": chain_status.get("broken_index"),
    }

@router.get("/events")
def list_audit_events(
    action: Optional[str] = None,
    resource: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns filtered and paginated audit events.
    """
    q = db.query(AuditLog)

    if action and action != "ALL":
        q = q.filter(AuditLog.action == action)
    if resource and resource != "ALL":
        q = q.filter(AuditLog.resource == resource)
    if status_filter and status_filter != "ALL":
        q = q.filter(AuditLog.status == status_filter.upper())
    if severity and severity != "ALL":
        q = q.filter(AuditLog.severity == severity.upper())
    if user_id:
        q = q.filter(AuditLog.userId == user_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                AuditLog.action.ilike(term),
                AuditLog.detail.ilike(term),
                AuditLog.resource.ilike(term),
                AuditLog.resourceId.ilike(term),
                AuditLog.userId.ilike(term),
                AuditLog.role.ilike(term),
                AuditLog.ip.ilike(term)
            )
        )
    if startDate:
        try:
            start_dt = datetime.fromisoformat(startDate.replace("Z", "+00:00"))
            q = q.filter(AuditLog.createdAt >= start_dt)
        except Exception:
            pass
    if endDate:
        try:
            end_dt = datetime.fromisoformat(endDate.replace("Z", "+00:00"))
            q = q.filter(AuditLog.createdAt <= end_dt)
        except Exception:
            pass

    total = q.count()
    rows = q.order_by(desc(AuditLog.createdAt)).offset(offset).limit(limit).all()

    # Enrich with user info where available
    user_ids = {r.userId for r in rows if r.userId}
    user_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {u.id: {"name": u.name, "email": u.email, "role": u.role} for u in users}

    results = []
    for r in rows:
        actor_info = user_map.get(r.userId, {})
        results.append({
            "id": r.id,
            "eventId": f"AUD-{r.id[:8].upper()}",
            "action": r.action,
            "detail": r.detail,
            "resource": r.resource or "System",
            "resourceId": r.resourceId,
            "status": r.status,
            "severity": r.severity or "INFO",
            "role": r.role or actor_info.get("role", "INVESTIGATOR"),
            "actor": actor_info.get("name") or actor_info.get("email") or r.userId or "Investigator",
            "actorId": r.userId,
            "ip": r.ip or "127.0.0.1",
            "userAgent": r.userAgent,
            "previousState": r.previousState,
            "newState": r.newState,
            "caseId": r.caseId,
            "timestamp": r.createdAt.isoformat() if r.createdAt else None,
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": results
    }

@router.get("/events/{event_id}")
def get_audit_event_detail(event_id: str, db: Session = Depends(get_db)):
    """
    Returns full details of a specific audit event.
    """
    ev = db.query(AuditLog).filter(
        or_(
            AuditLog.id == event_id,
            AuditLog.id.startswith(event_id.replace("AUD-", "").lower())
        )
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Audit event not found")

    actor = None
    if ev.userId:
        u = db.query(User).filter(User.id == ev.userId).first()
        if u:
            actor = {"id": u.id, "name": u.name, "email": u.email, "role": u.role}

    return {
        "id": ev.id,
        "eventId": f"AUD-{ev.id[:8].upper()}",
        "action": ev.action,
        "detail": ev.detail,
        "resource": ev.resource or "System",
        "resourceId": ev.resourceId,
        "status": ev.status,
        "severity": ev.severity or "INFO",
        "role": ev.role or (actor.get("role") if actor else "INVESTIGATOR"),
        "actor": actor.get("name") if actor else (ev.userId or "Investigator"),
        "actorEmail": actor.get("email") if actor else None,
        "ip": ev.ip or "127.0.0.1",
        "userAgent": ev.userAgent,
        "previousState": ev.previousState,
        "newState": ev.newState,
        "caseId": ev.caseId,
        "timestamp": ev.createdAt.isoformat() if ev.createdAt else None,
    }

@router.get("/login-attempts")
def list_login_attempts(limit: int = 50, db: Session = Depends(get_db)):
    attempts = db.query(LoginAttempt).order_by(desc(LoginAttempt.attemptAt)).limit(limit).all()
    return [
        {
            "id": a.id,
            "email": a.email,
            "success": a.success,
            "ip": a.ip,
            "reason": a.reason,
            "attemptAt": a.attemptAt.isoformat() if a.attemptAt else None,
            "userId": a.userId
        }
        for a in attempts
    ]

@router.get("/security-alerts")
def list_security_alerts(limit: int = 50, db: Session = Depends(get_db)):
    alerts = db.query(SecurityAlert).order_by(desc(SecurityAlert.createdAt)).limit(limit).all()
    return [
        {
            "id": s.id,
            "severity": s.severity,
            "type": s.type,
            "message": s.message,
            "detail": s.detail,
            "createdAt": s.createdAt.isoformat() if s.createdAt else None,
            "resolved": s.resolved,
            "resolvedAt": s.resolvedAt.isoformat() if s.resolvedAt else None,
            "userId": s.userId
        }
        for s in alerts
    ]
