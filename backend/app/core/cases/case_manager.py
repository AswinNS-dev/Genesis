from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.database.models import InvestigationCase, CaseNote, CaseActivity, AuditLog

class CaseManager:
    def __init__(self, db: Session):
        self.db = db

    def generate_case_id(self) -> str:
        year = datetime.now(timezone.utc).year
        count = self.db.query(InvestigationCase).count() + 1
        return f"CR-{year}-{1000 + count}"

    def create_case(
        self,
        title: str,
        case_id: Optional[str] = None,
        description: Optional[str] = None,
        category: str = "Financial Fraud",
        classification: str = "RESTRICTED",
        case_source: Optional[str] = None,
        jurisdiction: Optional[str] = None,
        assigned_investigator: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> InvestigationCase:
        cid = case_id or self.generate_case_id()
        case = InvestigationCase(
            caseId=cid,
            title=title,
            description=description,
            status="OPEN",
            classification=classification,
            category=category,
            caseSource=case_source,
            jurisdiction=jurisdiction,
            assignedInvestigator=assigned_investigator,
            createdById=user_id,
        )
        self.db.add(case)
        self.db.flush()

        # Log Activity & Audit
        act = CaseActivity(
            caseId=case.id,
            action="CASE_INITIALIZED",
            detail=f"Case {case.caseId} registered",
            actor=user_id or "System",
        )
        self.db.add(act)

        audit = AuditLog(
            action="CREATE_CASE",
            detail=f"Created case {case.caseId}: {case.title}",
            caseId=case.id,
            userId=user_id,
            status="SUCCESS",
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(case)
        return case

    def add_note(self, case_id: str, body: str, author_name: str, user_id: Optional[str] = None) -> CaseNote:
        case = self.db.query(InvestigationCase).filter(
            (InvestigationCase.id == case_id) | (InvestigationCase.caseId == case_id)
        ).first()
        if not case:
            raise ValueError("Case not found")

        note = CaseNote(caseId=case.id, body=body, author=author_name, authorId=user_id)
        self.db.add(note)

        act = CaseActivity(caseId=case.id, action="NOTE_ADDED", detail=f"Note by {author_name}", actor=author_name)
        self.db.add(act)
        self.db.commit()
        self.db.refresh(note)
        return note
