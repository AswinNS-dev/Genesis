from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.database.repositories.dataset_repository import DatasetRepository
from backend.app.api.schemas.dataset_schema import DatasetResponseSchema

class DatasetController:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DatasetRepository(db)

    def list_datasets(self, case_id: Optional[str] = None) -> List[DatasetResponseSchema]:
        datasets = self.repo.list(case_id=case_id)
        return [DatasetResponseSchema.model_validate(d) for d in datasets]
