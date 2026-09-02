from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.core.entities.entity_manager import EntityManager
from backend.app.database.repositories import EntityRepository
from backend.app.database.models import Entity

class EntityService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EntityRepository(db)
        self.manager = EntityManager(db)

    def get_entities(self, entity_type: Optional[str] = None, search: Optional[str] = None) -> List[Entity]:
        return self.repo.list(entity_type=entity_type, search=search)
