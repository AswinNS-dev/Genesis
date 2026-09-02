from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import Entity, EntityMatch, Relationship, TimelineEvent

class EntityRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, entity_type: Optional[str] = None, search: Optional[str] = None, case_id: Optional[str] = None) -> List[Entity]:
        q = self.db.query(Entity)
        if entity_type:
            q = q.filter(Entity.type == entity_type.upper())
        if case_id:
            q = q.filter(Entity.caseId == case_id)
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                (Entity.name.ilike(pattern)) |
                (Entity.aliases.ilike(pattern)) |
                (Entity.value.ilike(pattern))
            )
        return q.order_by(Entity.name.asc()).all()

    def get_by_id(self, entity_id: str) -> Optional[Entity]:
        return self.db.query(Entity).filter(Entity.id == entity_id).first()

    def create(self, entity: Entity) -> Entity:
        self.db.add(entity)
        self.db.flush()
        return entity
