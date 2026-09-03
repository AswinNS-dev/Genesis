import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from backend.app.database.models import Dataset, DatasetRecord, DatasetEntity

class DatasetRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, case_id: Optional[str] = None, search: Optional[str] = None, source_type: Optional[str] = None) -> List[Dataset]:
        q = self.db.query(Dataset)
        if case_id:
            q = q.filter(Dataset.caseId == case_id)
        if source_type and source_type != "ALL":
            q = q.filter(Dataset.sourceType == source_type)
        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    Dataset.name.ilike(term),
                    Dataset.fileName.ilike(term),
                    Dataset.sourceType.ilike(term),
                    Dataset.analysisScope.ilike(term)
                )
            )
        return q.order_by(desc(Dataset.createdAt)).all()

    def get_by_id(self, dataset_id: str) -> Optional[Dataset]:
        return self.db.query(Dataset).filter(Dataset.id == dataset_id).first()

    def create(self, dataset: Dataset) -> Dataset:
        self.db.add(dataset)
        self.db.flush()
        return dataset

    def delete(self, dataset_id: str) -> bool:
        dataset = self.get_by_id(dataset_id)
        if not dataset:
            return False
        self.db.delete(dataset)
        self.db.commit()
        return True

    def get_records(self, dataset_id: str, limit: int = 50, offset: int = 0, search: Optional[str] = None) -> Dict[str, Any]:
        q = self.db.query(DatasetRecord).filter(DatasetRecord.datasetId == dataset_id)
        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    DatasetRecord.raw.ilike(term),
                    DatasetRecord.normalized.ilike(term),
                    DatasetRecord.matchStatus.ilike(term)
                )
            )
        total = q.count()
        rows = q.order_by(DatasetRecord.rowIndex.asc()).offset(offset).limit(limit).all()

        records = []
        for r in rows:
            raw_data = {}
            if r.raw:
                try:
                    raw_data = json.loads(r.raw)
                except Exception:
                    raw_data = {"raw": r.raw}

            normalized_data = {}
            if r.normalized:
                try:
                    normalized_data = json.loads(r.normalized)
                except Exception:
                    normalized_data = {"normalized": r.normalized}

            records.append({
                "id": r.id,
                "rowIndex": r.rowIndex,
                "raw": raw_data,
                "normalized": normalized_data,
                "matchStatus": r.matchStatus,
                "matchConfidence": r.matchConfidence,
                "matchReasons": r.matchReasons,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None
            })

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "records": records
        }

    def get_summary(self) -> Dict[str, Any]:
        total_datasets = self.db.query(Dataset).count()
        total_records = self.db.query(func.sum(Dataset.recordCount)).scalar() or 0
        
        # Source type counts
        source_counts: Dict[str, int] = {}
        for st, cnt in self.db.query(Dataset.sourceType, func.count(Dataset.id)).group_by(Dataset.sourceType).all():
            source_counts[st or "OTHER"] = cnt

        return {
            "totalDatasets": total_datasets,
            "totalRecords": total_records,
            "sourceBreakdown": source_counts,
        }
