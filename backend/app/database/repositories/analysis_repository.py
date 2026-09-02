import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import AnalysisResult, EntityMatch

class AnalysisRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_analysis_result(
        self,
        analysis_type: str,
        result: Dict[str, Any],
        case_id: Optional[str] = None,
        confidence: float = 0.90,
        model_name: Optional[str] = None,
        model_version: Optional[str] = "1.0",
        explanation: Optional[str] = None
    ) -> AnalysisResult:
        rec = AnalysisResult(
            analysisType=analysis_type,
            result=json.dumps(result),
            caseId=case_id,
            confidence=confidence,
            modelName=model_name,
            modelVersion=model_version,
            explanation=explanation
        )
        self.db.add(rec)
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def list_analysis_results(self, case_id: Optional[str] = None) -> List[AnalysisResult]:
        q = self.db.query(AnalysisResult)
        if case_id:
            q = q.filter(AnalysisResult.caseId == case_id)
        return q.order_by(AnalysisResult.createdAt.desc()).all()

    def save_entity_match(
        self,
        entity_a_id: str,
        entity_b_id: str,
        confidence: int,
        reasons: str,
        status: str = "PENDING"
    ) -> EntityMatch:
        match = EntityMatch(
            entityAId=entity_a_id,
            entityBId=entity_b_id,
            confidence=confidence,
            reasons=reasons,
            status=status
        )
        self.db.add(match)
        self.db.commit()
        self.db.refresh(match)
        return match

    def update_entity_match_status(self, match_id: str, status: str) -> Optional[EntityMatch]:
        match = self.db.query(EntityMatch).filter(EntityMatch.id == match_id).first()
        if not match:
            return None
        match.status = status.upper()
        self.db.commit()
        self.db.refresh(match)
        return match

    def list_entity_matches(self, status: Optional[str] = None) -> List[EntityMatch]:
        q = self.db.query(EntityMatch)
        if status:
            q = q.filter(EntityMatch.status == status.upper())
        return q.order_by(EntityMatch.createdAt.desc()).all()
