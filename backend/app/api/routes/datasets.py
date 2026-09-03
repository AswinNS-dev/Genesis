from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, Request, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user_optional
from backend.app.api.controllers.dataset_controller import DatasetController

router = APIRouter(prefix="/datasets", tags=["datasets"])

class IngestJsonPayload(BaseModel):
    name: str
    sourceType: str = "GENERIC_CSV"
    analysisScope: str = "COMBINED"
    caseId: Optional[str] = None
    rawText: Optional[str] = None
    rows: Optional[List[Dict[str, Any]]] = None

class IngestSamplePayload(BaseModel):
    sampleType: str = "CDR"  # CDR, TRANSACTION, LOCATION, ENTITY
    caseId: Optional[str] = None

@router.get("/summary")
def get_datasets_summary_endpoint(db: Session = Depends(get_db)):
    ctrl = DatasetController(db)
    return ctrl.get_summary()

@router.get("")
def list_datasets_endpoint(
    caseId: Optional[str] = None,
    search: Optional[str] = None,
    sourceType: Optional[str] = Query(None, alias="sourceType"),
    db: Session = Depends(get_db)
):
    ctrl = DatasetController(db)
    return ctrl.list_datasets(case_id=caseId, search=search, source_type=sourceType)

@router.post("/ingest")
async def ingest_dataset_file_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    name: Optional[str] = Form(None),
    sourceType: Optional[str] = Form("GENERIC_CSV"),
    caseId: Optional[str] = Form(None),
    analysisScope: Optional[str] = Form("COMBINED"),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ctrl = DatasetController(db)
    file_content = None
    file_name = None

    if file:
        file_content = await file.read()
        file_name = file.filename
        if not name:
            name = file.filename.rsplit(".", 1)[0].replace("_", " ").title()

    if not name:
        name = "Forensic Ingestion Dataset"

    client_ip = request.client.host if request and request.client else "127.0.0.1"

    try:
        dataset = ctrl.ingest_dataset(
            name=name,
            source_type=sourceType or "GENERIC_CSV",
            file_content=file_content,
            file_name=file_name,
            case_id=caseId,
            analysis_scope=analysisScope or "COMBINED",
            user_id=user.id if user else None,
            role=user.role if user else "INVESTIGATOR",
            ip=client_ip
        )
        return {"success": True, "dataset": dataset}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest-json")
def ingest_dataset_json_endpoint(
    payload: IngestJsonPayload,
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ctrl = DatasetController(db)
    client_ip = request.client.host if request and request.client else "127.0.0.1"
    try:
        dataset = ctrl.ingest_dataset(
            name=payload.name,
            source_type=payload.sourceType,
            raw_text=payload.rawText,
            raw_rows=payload.rows,
            case_id=payload.caseId,
            analysis_scope=payload.analysisScope,
            user_id=user.id if user else None,
            role=user.role if user else "INVESTIGATOR",
            ip=client_ip
        )
        return {"success": True, "dataset": dataset}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sample")
def ingest_sample_dataset_endpoint(
    payload: IngestSamplePayload,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ctrl = DatasetController(db)
    try:
        dataset = ctrl.ingest_sample(
            sample_type=payload.sampleType,
            case_id=payload.caseId,
            user_id=user.id if user else None,
            role=user.role if user else "INVESTIGATOR"
        )
        return {"success": True, "dataset": dataset}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}")
def get_dataset_detail_endpoint(dataset_id: str, db: Session = Depends(get_db)):
    ctrl = DatasetController(db)
    ds = ctrl.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds

@router.get("/{dataset_id}/records")
def get_dataset_records_endpoint(
    dataset_id: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    ctrl = DatasetController(db)
    return ctrl.get_records(dataset_id, limit=limit, offset=offset, search=search)

@router.delete("/{dataset_id}")
def delete_dataset_endpoint(
    dataset_id: str,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ctrl = DatasetController(db)
    success = ctrl.delete_dataset(
        dataset_id,
        user_id=user.id if user else None,
        role=user.role if user else "INVESTIGATOR"
    )
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"success": True, "message": "Dataset deleted successfully"}
