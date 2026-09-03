import csv
import io
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User, Dataset, DatasetRecord
from backend.app.security.rbac import get_current_user, require_roles
from backend.app.api.controllers.dataset_controller import DatasetController
from backend.app.api.schemas.dataset_schema import DatasetResponseSchema

router = APIRouter(prefix="/datasets", tags=["datasets"])

INGEST_BATCH_SIZE = 500  # rows per DB batch insert


@router.get("", response_model=List[DatasetResponseSchema])
def list_datasets_endpoint(
    caseId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    ctrl = DatasetController(db)
    return ctrl.list_datasets(case_id=caseId)


@router.post("/ingest", response_model=DatasetResponseSchema)
async def ingest_dataset_endpoint(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    caseId: Optional[str] = Form(None),
    analysisScope: Optional[str] = Form("COMBINED"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("INVESTIGATOR", "ADMIN"))
):
    """
    Ingest a CSV dataset.  Records are streamed and inserted in batches
    so large files (100k+ rows) do not require loading everything into RAM.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or "upload.csv"
    dataset_name = name or filename

    # ---- 1. Create the Dataset header record ----
    dataset = Dataset(
        name=dataset_name,
        sourceType="CSV",
        fileName=filename,
        status="UPLOADED",
        recordCount=0,
        analysisScope=(analysisScope or "COMBINED").upper(),
        createdById=user.id,
        caseId=caseId or None,
    )
    db.add(dataset)
    db.flush()  # get dataset.id before inserting records

    # ---- 2. Stream-parse and batch-insert rows ----
    try:
        text = content.decode("utf-8", errors="ignore")
        reader = csv.DictReader(io.StringIO(text))
        batch: List[DatasetRecord] = []
        total = 0

        for idx, row in enumerate(reader):
            raw_json = json.dumps(row)
            # Basic normalisation: strip whitespace from values
            normalized = {k: v.strip() if isinstance(v, str) else v for k, v in row.items()}
            normalized_json = json.dumps(normalized)

            record = DatasetRecord(
                datasetId=dataset.id,
                rowIndex=idx,
                raw=raw_json,
                normalized=normalized_json,
                matchStatus="UNMATCHED",
                matchConfidence=0,
            )
            batch.append(record)
            total += 1

            if len(batch) >= INGEST_BATCH_SIZE:
                db.add_all(batch)
                db.flush()
                batch = []

        if batch:
            db.add_all(batch)
            db.flush()

        dataset.recordCount = total
        dataset.status = "READY"
        db.commit()
        db.refresh(dataset)

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(exc)}")

    return DatasetResponseSchema.model_validate(dataset)


@router.get("/{dataset_id}", response_model=DatasetResponseSchema)
def get_dataset_endpoint(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ctrl = DatasetController(db)
    datasets = ctrl.repo.list()
    ds = next((d for d in datasets if d.id == dataset_id), None)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetResponseSchema.model_validate(ds)


@router.delete("/{dataset_id}")
def delete_dataset_endpoint(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("INVESTIGATOR", "ADMIN"))
):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db.delete(ds)
    db.commit()
    return {"success": True, "deleted": dataset_id}
