from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user, require_roles
from backend.app.api.controllers.entity_controller import EntityController
from backend.app.api.schemas.entity_schema import EntityCreateSchema, EntityResponseSchema

router = APIRouter(prefix="/entities", tags=["entities"])

@router.get("", response_model=List[EntityResponseSchema])
def list_entities_endpoint(
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ctrl = EntityController(db)
    return ctrl.get_entities(entity_type=type, search=search)

@router.post("", response_model=EntityResponseSchema)
def create_entity_endpoint(
    payload: EntityCreateSchema,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("INVESTIGATOR", "ADMIN"))
):
    ctrl = EntityController(db)
    return ctrl.create_entity(payload)
