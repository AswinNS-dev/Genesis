from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database.models import (
    InvestigationCase, CaseNote, CaseActivity, Entity, Relationship,
    TimelineEvent, CommunicationRecord, TransactionRecord, LocationRecord,
    EvidenceDocument
)
from backend.app.database.supabase_service import supabase_db

class CaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, status: Optional[str] = None, search: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        # Fetch from real Supabase fir_cases
        supa_cases = supabase_db.list_cases(limit=limit, offset=offset, status=status, search=search)
        if supa_cases:
            return supa_cases

        # Fallback to local DB if Supabase returns nothing
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
        rows = q.order_by(InvestigationCase.createdAt.desc()).all()
        results = []
        for c in rows:
            results.append({
                "id": c.id,
                "caseId": c.caseId,
                "title": c.title,
                "description": c.description,
                "status": c.status,
                "classification": c.classification,
                "category": c.category,
                "caseSource": c.caseSource,
                "jurisdiction": c.jurisdiction,
                "assignedInvestigator": c.assignedInvestigator,
                "createdAt": c.createdAt.isoformat() if c.createdAt else None,
                "updatedAt": c.updatedAt.isoformat() if c.updatedAt else None,
                "entityCount": len(c.entities) if hasattr(c, "entities") and c.entities else 0,
                "documentCount": len(c.documents) if hasattr(c, "documents") and c.documents else 0,
            })
        return results

    def get_by_id(self, case_id: str) -> Optional[Dict[str, Any]]:
        supa_case = supabase_db.get_case_by_id(case_id)
        if supa_case:
            return supa_case
        c = self.db.query(InvestigationCase).filter(
            or_(InvestigationCase.id == case_id, InvestigationCase.caseId == case_id)
        ).first()
        if not c:
            return None
        return {
            "id": c.id,
            "caseId": c.caseId,
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "classification": c.classification,
            "category": c.category,
            "caseSource": c.caseSource,
            "jurisdiction": c.jurisdiction,
            "assignedInvestigator": c.assignedInvestigator,
            "createdAt": c.createdAt.isoformat() if c.createdAt else None,
            "updatedAt": c.updatedAt.isoformat() if c.updatedAt else None,
            "entityCount": len(c.entities) if hasattr(c, "entities") and c.entities else 0,
            "documentCount": len(c.documents) if hasattr(c, "documents") and c.documents else 0,
        }

    def create(self, **kwargs) -> Dict[str, Any]:
        # Insert directly into Supabase fir_cases
        try:
            return supabase_db.create_case(kwargs)
        except Exception as e:
            print(f"Supabase create_case error: {e}")
            case = InvestigationCase(**kwargs)
            self.db.add(case)
            self.db.commit()
            self.db.refresh(case)
            return {
                "id": case.id,
                "caseId": case.caseId,
                "title": case.title,
                "description": case.description,
                "status": case.status,
                "classification": case.classification,
                "category": case.category,
                "caseSource": case.caseSource,
                "jurisdiction": case.jurisdiction,
                "assignedInvestigator": case.assignedInvestigator,
                "createdAt": case.createdAt.isoformat() if case.createdAt else None,
                "updatedAt": case.updatedAt.isoformat() if case.updatedAt else None,
                "entityCount": 0,
                "documentCount": 0,
            }

    def update(self, case_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        case = self.db.query(InvestigationCase).filter(
            or_(InvestigationCase.id == case_id, InvestigationCase.caseId == case_id)
        ).first()
        if case:
            for k, v in kwargs.items():
                if v is not None and hasattr(case, k):
                    setattr(case, k, v)
            self.db.commit()
            self.db.refresh(case)
            return self.get_by_id(case.id)
        return self.get_by_id(case_id)

    # Sub-resource getters
    def get_network(self, case_id: str) -> Dict[str, Any]:
        return supabase_db.get_network_graph(case_id)

    def get_timeline(self, case_id: str) -> List[Dict[str, Any]]:
        return supabase_db.get_case_timeline(case_id)

    def get_communications(self, case_id: str) -> List[Dict[str, Any]]:
        return supabase_db.get_case_communications(case_id)

    def get_transactions(self, case_id: str) -> List[Dict[str, Any]]:
        return supabase_db.get_case_transactions(case_id)

    def get_locations(self, case_id: str) -> List[Dict[str, Any]]:
        return supabase_db.get_case_locations(case_id)

    def get_summary(self, case_id: str) -> Dict[str, Any]:
        return supabase_db.get_case_summary_stats(case_id)
