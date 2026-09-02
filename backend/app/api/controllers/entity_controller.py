from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.core.entities.entity_manager import EntityManager
from backend.app.database.repositories.entity_repository import EntityRepository
from backend.app.api.schemas.entity_schema import EntityCreateSchema, EntityResponseSchema

class EntityController:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EntityRepository(db)
        self.manager = EntityManager(db)

    def get_entities(self, entity_type: Optional[str] = None, search: Optional[str] = None) -> List[EntityResponseSchema]:
        entities = self.repo.list(entity_type=entity_type, search=search)
        return [EntityResponseSchema.model_validate(e) for e in entities]

    def create_entity(self, payload: EntityCreateSchema) -> EntityResponseSchema:
        ent = self.manager.create_entity(
            name=payload.name,
            entity_type=payload.type,
            aliases=payload.aliases,
            value=payload.value,
            metadata=payload.metadata,
            risk_score=payload.riskScore or 0,
            case_id=payload.caseId,
        )
        return EntityResponseSchema.model_validate(ent)
