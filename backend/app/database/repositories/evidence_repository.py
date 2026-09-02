from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import EvidenceDocument, BlockchainRecord
from backend.app.database.supabase_service import supabase_db

class EvidenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, case_id: Optional[str] = None) -> List[Dict[str, Any]]:
        # Fetch from real Supabase evidence_documents (1,000 records)
        supa_ev = supabase_db.list_evidence(case_id=case_id)
        if supa_ev:
            return supa_ev

        q = self.db.query(EvidenceDocument)
        if case_id:
            q = q.filter(EvidenceDocument.caseId == case_id)
        docs = q.order_by(EvidenceDocument.createdAt.desc()).all()
        return [{
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "caseId": d.caseId,
            "contentType": d.contentType,
            "sizeBytes": d.sizeBytes,
            "sha256": d.sha256,
            "verified": d.verified,
            "status": d.status,
            "createdAt": d.createdAt.isoformat() if d.createdAt else None,
        } for d in docs]

    def get_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        evidence_list = supabase_db.list_evidence()
        for ev in evidence_list:
            if ev["id"] == doc_id:
                return ev
        d = self.db.query(EvidenceDocument).filter(EvidenceDocument.id == doc_id).first()
        if not d:
            return None
        return {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "caseId": d.caseId,
            "contentType": d.contentType,
            "sizeBytes": d.sizeBytes,
            "sha256": d.sha256,
            "verified": d.verified,
            "status": d.status,
            "createdAt": d.createdAt.isoformat() if d.createdAt else None,
        }

    def create(self, doc: EvidenceDocument) -> EvidenceDocument:
        self.db.add(doc)
        self.db.flush()
        return doc

    def list_blocks(self) -> List[Dict[str, Any]]:
        # Generate real cryptographic blockchain ledger from verified evidence documents
        return supabase_db.get_blockchain_ledger(limit=30)

    def add_block(self, block: BlockchainRecord) -> BlockchainRecord:
        self.db.add(block)
        self.db.flush()
        return block
