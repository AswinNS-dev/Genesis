from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.entity_repository import EntityRepository
from backend.app.api.schemas.entity_schema import EntityCreateSchema, EntityResponseSchema
from pydantic import BaseModel

class EntityPatchSchema(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    value: Optional[str] = None
    riskScore: Optional[int] = None
    caseId: Optional[str] = None

router = APIRouter(prefix="/entities", tags=["entities"])

@router.get("", response_model=List[EntityResponseSchema])
def list_entities_endpoint(
    type: Optional[str] = None,
    search: Optional[str] = None,
    caseId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    repo = EntityRepository(db)
    entities = repo.list(entity_type=type, search=search, case_id=caseId)
    return [EntityResponseSchema.model_validate(e) for e in entities]

@router.get("/{entity_id}", response_model=EntityResponseSchema)
def get_entity_endpoint(entity_id: str, db: Session = Depends(get_db)):
    repo = EntityRepository(db)
    entity = repo.get_by_id(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return EntityResponseSchema.model_validate(entity)

@router.post("", response_model=EntityResponseSchema)
def create_entity_endpoint(payload: EntityCreateSchema, db: Session = Depends(get_db)):
    repo = EntityRepository(db)
    ent = repo.create(
        name=payload.name,
        type=payload.type.upper(),
        value=payload.value,
        riskScore=payload.riskScore or 0,
        caseId=payload.caseId
    )
    return EntityResponseSchema.model_validate(ent)

@router.patch("/{entity_id}", response_model=EntityResponseSchema)
def patch_entity_endpoint(entity_id: str, payload: EntityPatchSchema, db: Session = Depends(get_db)):
    repo = EntityRepository(db)
    updated = repo.update(entity_id, **payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Entity not found")
    return EntityResponseSchema.model_validate(updated)
