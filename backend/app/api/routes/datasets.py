from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.dataset_repository import DatasetRepository
from backend.app.api.schemas.dataset_schema import DatasetResponseSchema

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("", response_model=List[DatasetResponseSchema])
def list_datasets_endpoint(
    caseId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    repo = DatasetRepository(db)
    return repo.list(case_id=caseId)
