from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user, require_roles
from backend.app.api.controllers.case_controller import CaseController
from backend.app.api.schemas.case_schema import CaseCreateSchema, CaseResponseSchema, CaseNoteCreateSchema, CaseNoteResponseSchema

router = APIRouter(prefix="/cases", tags=["cases"])

@router.get("", response_model=List[CaseResponseSchema])
def list_cases_endpoint(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ctrl = CaseController(db)
    return ctrl.get_cases(status=status, search=search)

@router.post("", response_model=CaseResponseSchema)
def create_case_endpoint(
    payload: CaseCreateSchema,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("INVESTIGATOR", "ADMIN"))
):
    ctrl = CaseController(db)
    return ctrl.create_case(payload, user_id=user.id)

@router.post("/{case_id}/notes", response_model=CaseNoteResponseSchema)
def add_case_note_endpoint(
    case_id: str,
    payload: CaseNoteCreateSchema,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("INVESTIGATOR", "ADMIN"))
):
    ctrl = CaseController(db)
    try:
        note = ctrl.manager.add_note(case_id, payload.body, author_name=user.name, user_id=user.id)
        return CaseNoteResponseSchema.model_validate(note)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
