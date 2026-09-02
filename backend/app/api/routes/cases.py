from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.case_repository import CaseRepository
from backend.app.api.schemas.case_schema import (
    CaseCreateSchema, CaseResponseSchema, CaseNoteCreateSchema, CaseNoteResponseSchema
)
from pydantic import BaseModel

class CasePatchSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    classification: Optional[str] = None
    category: Optional[str] = None
    jurisdiction: Optional[str] = None
    assignedInvestigator: Optional[str] = None

router = APIRouter(prefix="/cases", tags=["cases"])

@router.get("", response_model=List[CaseResponseSchema])
def list_cases_endpoint(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    repo = CaseRepository(db)
    cases = repo.list(status=status, search=search)
    results = []
    for c in cases:
        resp = CaseResponseSchema.model_validate(c)
        resp.entityCount = len(c.entities)
        resp.documentCount = len(c.documents)
        results.append(resp)
    return results

@router.get("/{case_id}", response_model=CaseResponseSchema)
def get_case_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    case = repo.get_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    resp = CaseResponseSchema.model_validate(case)
    resp.entityCount = len(case.entities)
    resp.documentCount = len(case.documents)
    return resp

@router.post("", response_model=CaseResponseSchema)
def create_case_endpoint(payload: CaseCreateSchema, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    from backend.app.database.models import InvestigationCase
    count = db.query(InvestigationCase).count()
    cid = payload.caseId or f"CR-2026-{1000 + count + 1}"
    case = repo.create(
        title=payload.title,
        caseId=cid,
        description=payload.description,
        category=payload.category or "Financial Fraud",
        classification=payload.classification or "RESTRICTED",
        caseSource=payload.caseSource,
        jurisdiction=payload.jurisdiction,
        assignedInvestigator=payload.assignedInvestigator,
        status="OPEN"
    )
    resp = CaseResponseSchema.model_validate(case)
    resp.entityCount = 0
    resp.documentCount = 0
    return resp

@router.patch("/{case_id}", response_model=CaseResponseSchema)
def patch_case_endpoint(case_id: str, payload: CasePatchSchema, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    updated = repo.update(case_id, **payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Case not found")
    resp = CaseResponseSchema.model_validate(updated)
    resp.entityCount = len(updated.entities)
    resp.documentCount = len(updated.documents)
    return resp

# Case Sub-resources
@router.get("/{case_id}/summary")
def get_case_summary_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    summary = repo.get_summary(case_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Case not found")
    return summary

@router.get("/{case_id}/network")
def get_case_network_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    return repo.get_network(case_id)

@router.get("/{case_id}/timeline")
def get_case_timeline_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    events = repo.get_timeline(case_id)
    return [{
        "id": e.id,
        "type": e.type,
        "summary": e.summary,
        "detail": e.detail,
        "eventAt": e.eventAt.isoformat() if e.eventAt else None,
        "createdAt": e.createdAt.isoformat() if e.createdAt else None,
    } for e in events]

@router.get("/{case_id}/communications")
def get_case_communications_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    comms = repo.get_communications(case_id)
    return [{
        "id": c.id,
        "caller": c.caller,
        "receiver": c.receiver,
        "callerName": c.callerName,
        "receiverName": c.receiverName,
        "type": c.type,
        "durationSec": c.durationSec,
        "timestamp": c.timestamp.isoformat() if c.timestamp else None,
        "cellTower": c.cellTower,
        "isAnomaly": c.isAnomaly,
        "anomalyReason": c.anomalyReason,
    } for c in comms]

@router.get("/{case_id}/transactions")
def get_case_transactions_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    txns = repo.get_transactions(case_id)
    return [{
        "id": t.id,
        "sender": t.sender,
        "receiver": t.receiver,
        "senderAccount": t.senderAccount,
        "receiverAccount": t.receiverAccount,
        "amount": t.amount,
        "currency": t.currency,
        "transactionType": t.transactionType,
        "timestamp": t.timestamp.isoformat() if t.timestamp else None,
        "isSuspicious": t.isSuspicious,
        "suspiciousReason": t.suspiciousReason,
    } for t in txns]

@router.get("/{case_id}/locations")
def get_case_locations_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    locs = repo.get_locations(case_id)
    return [{
        "id": l.id,
        "name": l.name,
        "address": l.address,
        "latitude": l.latitude,
        "longitude": l.longitude,
        "subjectName": l.subjectName,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        "sourceType": l.sourceType,
        "speedKmh": l.speedKmh,
    } for l in locs]

@router.post("/{case_id}/notes", response_model=CaseNoteResponseSchema)
def add_case_note_endpoint(case_id: str, payload: CaseNoteCreateSchema, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    case = repo.get_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    note = CaseNote(caseId=case.id, body=payload.body, author="Investigator")
    db.add(note)
    db.commit()
    db.refresh(note)
    return CaseNoteResponseSchema.model_validate(note)
