from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import InvestigationCase
from backend.app.blockchain.verification import verify_blockchain_chain

class ReportGenerator:
    def generate_report(self, db: Session, case_id: str) -> Dict[str, Any]:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.id == case_id) | (InvestigationCase.caseId == case_id)
        ).first()
        if not case:
            raise ValueError("Case not found")

        chain_records = [b for doc in case.documents for b in doc.blockchainRecords]
        chain_status = verify_blockchain_chain(chain_records)

        return {
            "reportId": f"REP-{case.caseId}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "case": {
                "caseId": case.caseId,
                "title": case.title,
                "status": case.status,
                "classification": case.classification,
                "category": case.category,
                "assignedInvestigator": case.assignedInvestigator,
            },
            "summaryMetrics": {
                "entityCount": len(case.entities),
                "relationshipCount": len(case.relationships),
                "evidenceCount": len(case.documents),
                "timelineEventCount": len(case.events),
                "blockchainIntegrity": "INTACT" if chain_status["intact"] else "COMPROMISED",
            },
            "entities": [{"name": e.name, "type": e.type, "riskScore": e.riskScore} for e in case.entities],
            "relationships": [{"source": r.source.name if r.source else "Unknown", "target": r.target.name if r.target else "Unknown", "type": r.type, "strength": r.strength} for r in case.relationships],
            "disclaimer": "CONFIDENTIAL INTELLIGENCE DOSSIER — Strictly for authorized law enforcement investigation."
        }
