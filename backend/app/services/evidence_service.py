from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.core.evidence.evidence_manager import EvidenceManager
from backend.app.database.repositories import EvidenceRepository
from backend.app.database.models import EvidenceDocument

class EvidenceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EvidenceRepository(db)
        self.manager = EvidenceManager(db)

    def list_evidence(self, case_id: Optional[str] = None) -> List[EvidenceDocument]:
        return self.repo.list(case_id=case_id)

    def verify(self, doc_id: str, verifier: str = "System") -> Dict[str, Any]:
        return self.manager.verify_integrity(doc_id, verifier)
