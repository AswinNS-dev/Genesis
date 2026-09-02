from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database.models import Entity

class EntityRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, entity_type: Optional[str] = None, search: Optional[str] = None, case_id: Optional[str] = None) -> List[Entity]:
        q = self.db.query(Entity)
        if entity_type and entity_type.upper() != "ALL":
            q = q.filter(Entity.type == entity_type.upper())
        if case_id:
            q = q.filter(Entity.caseId == case_id)
        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    Entity.name.ilike(term),
                    Entity.value.ilike(term),
                    Entity.aliases.ilike(term),
                )
            )
        return q.order_by(Entity.createdAt.desc()).all()

    def get_by_id(self, entity_id: str) -> Optional[Entity]:
        return self.db.query(Entity).filter(Entity.id == entity_id).first()

    def create(self, **kwargs) -> Entity:
        entity = Entity(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update(self, entity_id: str, **kwargs) -> Optional[Entity]:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None
        for k, v in kwargs.items():
            if v is not None and hasattr(entity, k):
                setattr(entity, k, v)
        self.db.commit()
        self.db.refresh(entity)
        return entity
