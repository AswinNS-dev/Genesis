from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User, Entity, InvestigationCase
from backend.app.security.rbac import get_current_user

router = APIRouter(prefix="/search", tags=["search"])

@router.get("")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    pattern = f"%{q}%"
    cases = db.query(InvestigationCase).filter(
        (InvestigationCase.title.ilike(pattern)) |
        (InvestigationCase.caseId.ilike(pattern)) |
        (InvestigationCase.description.ilike(pattern))
    ).limit(10).all()

    entities = db.query(Entity).filter(
        (Entity.name.ilike(pattern)) |
        (Entity.aliases.ilike(pattern)) |
        (Entity.value.ilike(pattern))
    ).limit(10).all()

    return {
        "query": q,
        "cases": [{"id": c.id, "caseId": c.caseId, "title": c.title, "status": c.status} for c in cases],
        "entities": [{"id": e.id, "name": e.name, "type": e.type, "riskScore": e.riskScore} for e in entities],
    }
