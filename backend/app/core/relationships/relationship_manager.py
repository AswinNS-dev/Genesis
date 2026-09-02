from typing import Optional
from sqlalchemy.orm import Session
from backend.app.database.models import Relationship

class RelationshipManager:
    def __init__(self, db: Session):
        self.db = db

    def link_entities(
        self,
        source_id: str,
        target_id: str,
        rel_type: str,
        label: Optional[str] = None,
        strength: int = 50,
        case_id: Optional[str] = None
    ) -> Relationship:
        rel = Relationship(
            sourceId=source_id,
            targetId=target_id,
            type=rel_type.upper(),
            label=label,
            strength=strength,
            caseId=case_id,
        )
        self.db.add(rel)
        self.db.commit()
        self.db.refresh(rel)
        return rel
