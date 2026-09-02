from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CaseCreateSchema(BaseModel):
    title: str
    caseId: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = "Financial Fraud"
    classification: Optional[str] = "RESTRICTED"
    caseSource: Optional[str] = None
    jurisdiction: Optional[str] = None
    assignedInvestigator: Optional[str] = None

class CaseNoteCreateSchema(BaseModel):
    body: str

class CaseNoteResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    body: str
    author: Optional[str] = None
    createdAt: datetime

class CaseResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    caseId: str
    title: str
    description: Optional[str] = None
    status: str
    classification: str
    category: Optional[str] = None
    caseSource: Optional[str] = None
    jurisdiction: Optional[str] = None
    assignedInvestigator: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    entityCount: Optional[int] = 0
    documentCount: Optional[int] = 0
