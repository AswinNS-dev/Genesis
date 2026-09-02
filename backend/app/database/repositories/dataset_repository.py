from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import Dataset, DatasetRecord, DatasetEntity

class DatasetRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, case_id: Optional[str] = None) -> List[Dataset]:
        q = self.db.query(Dataset)
        if case_id:
            q = q.filter(Dataset.caseId == case_id)
        return q.order_by(Dataset.createdAt.desc()).all()

    def get_by_id(self, dataset_id: str) -> Optional[Dataset]:
        return self.db.query(Dataset).filter(Dataset.id == dataset_id).first()

    def create(self, dataset: Dataset) -> Dataset:
        self.db.add(dataset)
        self.db.flush()
        return dataset
