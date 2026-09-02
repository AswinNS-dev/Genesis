from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.database.repositories import DatasetRepository
from backend.app.database.models import Dataset

class DatasetService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DatasetRepository(db)

    def list_datasets(self, case_id: Optional[str] = None) -> List[Dataset]:
        return self.repo.list(case_id=case_id)
