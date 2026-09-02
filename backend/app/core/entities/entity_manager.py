import json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import Entity, Relationship

class EntityManager:
    def __init__(self, db: Session):
        self.db = db

    def create_entity(
        self,
        name: str,
        entity_type: str,
        aliases: Optional[List[str]] = None,
        value: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        risk_score: int = 0,
        case_id: Optional[str] = None
    ) -> Entity:
        entity = Entity(
            name=name,
            type=entity_type.upper(),
            aliases=json.dumps(aliases) if aliases else None,
            value=value,
            metadata_json=json.dumps(metadata) if metadata else None,
            riskScore=risk_score,
            caseId=case_id,
        )
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity
