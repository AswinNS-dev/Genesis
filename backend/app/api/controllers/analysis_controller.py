from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.ai.summarizer import CaseSummarizer
from backend.app.database.models import InvestigationCase

class AnalysisController:
    def __init__(self, db: Session):
        self.db = db
        self.summarizer = CaseSummarizer()

    def analyze_case(self, case_id: str) -> Dict[str, Any]:
        case = self.db.query(InvestigationCase).filter(
            (InvestigationCase.id == case_id) | (InvestigationCase.caseId == case_id)
        ).first()
        if not case:
            raise ValueError("Case not found")

        return self.summarizer.summarize({
            "caseId": case.caseId,
            "entities": [e.name for e in case.entities],
        })
