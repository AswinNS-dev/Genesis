from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user
from backend.app.api.controllers.dataset_controller import DatasetController
from backend.app.api.schemas.dataset_schema import DatasetResponseSchema

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("", response_model=List[DatasetResponseSchema])
def list_datasets_endpoint(
    caseId: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ctrl = DatasetController(db)
    return ctrl.list_datasets(case_id=caseId)
