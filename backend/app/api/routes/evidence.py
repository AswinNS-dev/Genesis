from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.evidence_repository import EvidenceRepository
from backend.app.core.evidence.evidence_manager import EvidenceManager
from backend.app.api.schemas.evidence_schema import EvidenceDocumentSchema

router = APIRouter(prefix="/evidence", tags=["evidence"])

@router.get("", response_model=List[EvidenceDocumentSchema])
def list_evidence_endpoint(
    caseId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    repo = EvidenceRepository(db)
    return repo.list(case_id=caseId)

@router.post("/upload")
async def upload_evidence_endpoint(
    file: UploadFile = File(...),
    caseId: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    manager = EvidenceManager(db)
    content = await file.read()
    try:
        doc = manager.upload_and_notarize(
            case_id=caseId,
            name=file.filename or "evidence_file",
            content=content,
            content_type=file.content_type or "application/pdf",
            description=description,
            user_id=None,
        )
        return {"success": True, "document": EvidenceDocumentSchema.model_validate(doc)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{doc_id}/verify")
def verify_evidence_endpoint(
    doc_id: str,
    db: Session = Depends(get_db)
):
    manager = EvidenceManager(db)
    try:
        return manager.verify_integrity(doc_id, verifier="Forensic Validator")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
