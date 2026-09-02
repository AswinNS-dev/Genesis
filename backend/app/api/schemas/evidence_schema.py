from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EvidenceDocumentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")
    id: str
    name: str
    description: Optional[str] = None
    contentType: Optional[str] = "application/pdf"
    sizeBytes: Optional[int] = 2048576
    sha256: Optional[str] = None
    verified: bool = True
    status: Optional[str] = "VERIFIED"
    caseId: Optional[str] = "CASE-UNASSIGNED"
    createdAt: Optional[datetime] = None

class BlockchainRecordSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")
    id: str
    index: int
    timestamp: Optional[datetime] = None
    dataHash: str
    previousHash: str
    hash: str
    action: str
    note: Optional[str] = None
    createdAt: Optional[datetime] = None
