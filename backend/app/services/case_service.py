from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.core.cases.case_manager import CaseManager
from backend.app.database.repositories import CaseRepository
from backend.app.database.models import InvestigationCase

class CaseService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CaseRepository(db)
        self.manager = CaseManager(db)

    def get_cases(self, status: Optional[str] = None, search: Optional[str] = None) -> List[InvestigationCase]:
        return self.repo.list(status=status, search=search)

    def get_case(self, case_id: str) -> Optional[InvestigationCase]:
        return self.repo.get_by_id(case_id)
