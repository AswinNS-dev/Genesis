from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import InvestigationCase, CaseNote, CaseActivity

class CaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, status: Optional[str] = None, search: Optional[str] = None) -> List[InvestigationCase]:
        q = self.db.query(InvestigationCase)
        if status:
            q = q.filter(InvestigationCase.status == status.upper())
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                (InvestigationCase.title.ilike(pattern)) |
                (InvestigationCase.caseId.ilike(pattern)) |
                (InvestigationCase.description.ilike(pattern))
            )
        return q.order_by(InvestigationCase.createdAt.desc()).all()

    def get_by_id(self, case_id: str) -> Optional[InvestigationCase]:
        return self.db.query(InvestigationCase).filter(
            (InvestigationCase.id == case_id) | (InvestigationCase.caseId == case_id)
        ).first()

    def create(self, case: InvestigationCase) -> InvestigationCase:
        self.db.add(case)
        self.db.flush()
        return case
