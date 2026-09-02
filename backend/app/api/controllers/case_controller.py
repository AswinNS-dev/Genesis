from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.core.cases.case_manager import CaseManager
from backend.app.database.repositories.case_repository import CaseRepository
from backend.app.api.schemas.case_schema import CaseCreateSchema, CaseResponseSchema

class CaseController:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CaseRepository(db)
        self.manager = CaseManager(db)

    def get_cases(self, status: Optional[str] = None, search: Optional[str] = None) -> List[CaseResponseSchema]:
        cases = self.repo.list(status=status, search=search)
        results = []
        for c in cases:
            resp = CaseResponseSchema.model_validate(c)
            resp.entityCount = len(c.entities)
            resp.documentCount = len(c.documents)
            results.append(resp)
        return results

    def create_case(self, payload: CaseCreateSchema, user_id: Optional[str] = None) -> CaseResponseSchema:
        case = self.manager.create_case(
            title=payload.title,
            case_id=payload.caseId,
            description=payload.description,
            category=payload.category or "Financial Fraud",
            classification=payload.classification or "RESTRICTED",
            case_source=payload.caseSource,
            jurisdiction=payload.jurisdiction,
            assigned_investigator=payload.assignedInvestigator,
            user_id=user_id,
        )
        resp = CaseResponseSchema.model_validate(case)
        resp.entityCount = 0
        resp.documentCount = 0
        return resp
