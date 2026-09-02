from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from backend.app.database.models import (
    InvestigationCase, CaseNote, CaseActivity, Entity, Relationship,
    TimelineEvent, CommunicationRecord, TransactionRecord, LocationRecord,
    EvidenceDocument, AnalysisResult, EntityMatch, AIAlert
)

class CaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, status: Optional[str] = None, search: Optional[str] = None) -> List[InvestigationCase]:
        q = self.db.query(InvestigationCase)
        if status and status.upper() != "ALL":
            q = q.filter(InvestigationCase.status == status.upper())
        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    InvestigationCase.title.ilike(term),
                    InvestigationCase.caseId.ilike(term),
                    InvestigationCase.description.ilike(term),
                    InvestigationCase.assignedInvestigator.ilike(term),
                )
            )
        return q.order_by(InvestigationCase.createdAt.desc()).all()

    def get_by_id(self, case_id: str) -> Optional[InvestigationCase]:
        return self.db.query(InvestigationCase).filter(
            or_(InvestigationCase.id == case_id, InvestigationCase.caseId == case_id)
        ).first()

    def create(self, **kwargs) -> InvestigationCase:
        case = InvestigationCase(**kwargs)
        self.db.add(case)
        self.db.commit()
        self.db.refresh(case)
        return case

    def update(self, case_id: str, **kwargs) -> Optional[InvestigationCase]:
        case = self.get_by_id(case_id)
        if not case:
            return None
        for k, v in kwargs.items():
            if v is not None and hasattr(case, k):
                setattr(case, k, v)
        self.db.commit()
        self.db.refresh(case)
        return case

    # Sub-resource getters
    def get_network(self, case_id: str) -> Dict[str, Any]:
        case = self.get_by_id(case_id)
        if not case:
            return {"nodes": [], "edges": []}
        
        nodes = [{
            "id": e.id,
            "label": e.name,
            "type": e.type,
            "riskScore": e.riskScore
        } for e in case.entities]

        edges = [{
            "id": r.id,
            "source": r.sourceId,
            "target": r.targetId,
            "type": r.type,
            "label": r.label,
            "strength": r.strength
        } for r in case.relationships]

        return {"nodes": nodes, "edges": edges}

    def get_timeline(self, case_id: str) -> List[TimelineEvent]:
        case = self.get_by_id(case_id)
        if not case:
            return []
        return self.db.query(TimelineEvent).filter(
            TimelineEvent.caseId == case.id
        ).order_by(TimelineEvent.eventAt.asc()).all()

    def get_communications(self, case_id: str) -> List[CommunicationRecord]:
        case = self.get_by_id(case_id)
        if not case:
            return []
        return self.db.query(CommunicationRecord).filter(
            CommunicationRecord.caseId == case.id
        ).order_by(CommunicationRecord.timestamp.desc()).all()

    def get_transactions(self, case_id: str) -> List[TransactionRecord]:
        case = self.get_by_id(case_id)
        if not case:
            return []
        return self.db.query(TransactionRecord).filter(
            TransactionRecord.caseId == case.id
        ).order_by(TransactionRecord.timestamp.desc()).all()

    def get_locations(self, case_id: str) -> List[LocationRecord]:
        case = self.get_by_id(case_id)
        if not case:
            return []
        return self.db.query(LocationRecord).filter(
            LocationRecord.caseId == case.id
        ).order_by(LocationRecord.timestamp.desc()).all()

    def get_summary(self, case_id: str) -> Dict[str, Any]:
        case = self.get_by_id(case_id)
        if not case:
            return {}

        return {
            "case": {
                "id": case.id,
                "caseId": case.caseId,
                "title": case.title,
                "description": case.description,
                "status": case.status,
                "classification": case.classification,
                "category": case.category,
                "assignedInvestigator": case.assignedInvestigator,
                "createdAt": case.createdAt.isoformat() if case.createdAt else None,
            },
            "statistics": {
                "entities": len(case.entities),
                "relationships": len(case.relationships),
                "timeline_events": len(case.events),
                "communications": len(case.communications),
                "transactions": len(case.transactions),
                "locations": len(case.locations),
                "evidence": len(case.documents),
                "analyses": len(case.analyses),
                "notes": len(case.notes),
            }
        }
