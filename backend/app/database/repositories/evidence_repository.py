from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import EvidenceDocument, BlockchainRecord, EvidenceVerification

class EvidenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, case_id: Optional[str] = None) -> List[EvidenceDocument]:
        q = self.db.query(EvidenceDocument)
        if case_id:
            q = q.filter(EvidenceDocument.caseId == case_id)
        return q.order_by(EvidenceDocument.createdAt.desc()).all()

    def get_by_id(self, doc_id: str) -> Optional[EvidenceDocument]:
        return self.db.query(EvidenceDocument).filter(EvidenceDocument.id == doc_id).first()

    def create(self, doc: EvidenceDocument) -> EvidenceDocument:
        self.db.add(doc)
        self.db.flush()
        return doc

    def list_blocks(self) -> List[BlockchainRecord]:
        return self.db.query(BlockchainRecord).order_by(BlockchainRecord.index.asc()).all()

    def add_block(self, block: BlockchainRecord) -> BlockchainRecord:
        self.db.add(block)
        self.db.flush()
        return block
