from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any
from backend.app.database.models import (
    InvestigationCase, Entity, EvidenceDocument,
    AnalysisResult, EntityMatch, AIAlert
)

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_summary(self) -> Dict[str, Any]:
        total_cases = self.db.query(func.count(InvestigationCase.id)).scalar() or 0
        active_cases = self.db.query(func.count(InvestigationCase.id)).filter(
            InvestigationCase.status.in_(["OPEN", "ACTIVE", "IN_PROGRESS", "UNDER_INVESTIGATION"])
        ).scalar() or 0
        total_entities = self.db.query(func.count(Entity.id)).scalar() or 0
        evidence_items = self.db.query(func.count(EvidenceDocument.id)).scalar() or 0
        ai_analyses = self.db.query(func.count(AnalysisResult.id)).scalar() or 0
        pending_matches = self.db.query(func.count(EntityMatch.id)).filter(
            EntityMatch.status == "PENDING"
        ).scalar() or 0
        alerts = self.db.query(func.count(AIAlert.id)).filter(
            AIAlert.read == False
        ).scalar() or 0

        return {
            "total_cases": total_cases,
            "active_cases": active_cases,
            "total_entities": total_entities,
            "evidence_items": evidence_items,
            "ai_analyses": ai_analyses,
            "pending_matches": pending_matches,
            "alerts": alerts
        }
