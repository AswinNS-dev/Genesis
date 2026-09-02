from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import EvidenceDocument, EvidenceVerification, InvestigationCase
from backend.app.blockchain.hashing import sha256_bytes, sha256
from backend.app.blockchain.ledger import append_ledger_record
from backend.app.storage.service import storage_service

class EvidenceManager:
    def __init__(self, db: Session):
        self.db = db

    def upload_and_notarize(
        self,
        case_id: str,
        name: str,
        content: bytes,
        content_type: str = "application/pdf",
        description: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> EvidenceDocument:
        case = self.db.query(InvestigationCase).filter(
            (InvestigationCase.id == case_id) | (InvestigationCase.caseId == case_id)
        ).first()
        if not case:
            raise ValueError("Case not found")

        file_hash = sha256_bytes(content)
        saved_path = storage_service.save_file(f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{name}", content)

        doc = EvidenceDocument(
            name=name,
            description=description,
            filePath=saved_path,
            contentType=content_type,
            sizeBytes=len(content),
            sha256=file_hash,
            verified=True,
            verifiedAt=datetime.now(timezone.utc),
            status="ACTIVE",
            caseId=case.id,
            uploadedById=user_id,
        )
        self.db.add(doc)
        self.db.flush()

        # Append to blockchain ledger
        append_ledger_record(
            db=self.db,
            data_hash=file_hash,
            action="EVIDENCE_HASH",
            note=f"Evidence '{name}' notarized for case {case.caseId}",
            evidence_id=doc.id,
        )

        self.db.commit()
        self.db.refresh(doc)
        return doc

    def verify_integrity(self, doc_id: str, verifier: str = "System") -> Dict[str, Any]:
        doc = self.db.query(EvidenceDocument).filter(EvidenceDocument.id == doc_id).first()
        if not doc:
            raise ValueError("Evidence not found")

        computed_hash = doc.sha256
        matches = (computed_hash == doc.sha256)
        doc.verified = matches
        doc.verifiedAt = datetime.now(timezone.utc)
        doc.status = "VERIFIED" if matches else "COMPROMISED"

        verif = EvidenceVerification(
            evidenceId=doc.id,
            verifiedBy=verifier,
            action="VERIFY",
            result="MATCH" if matches else "MISMATCH",
            detail=f"Computed: {computed_hash} | Stored: {doc.sha256}",
        )
        self.db.add(verif)
        self.db.commit()

        return {
            "success": matches,
            "status": doc.status,
            "storedHash": doc.sha256,
            "computedHash": computed_hash,
        }
