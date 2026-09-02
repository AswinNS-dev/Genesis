from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AnalysisSummarySchema(BaseModel):
    overview: str
    keyEntities: List[str]
    majorRelationships: List[str]
    investigationAreas: List[str]
    caveat: str

class EvidenceDocumentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: Optional[str] = None
    contentType: str
    sizeBytes: int
    sha256: Optional[str] = None
    verified: bool
    status: str
    caseId: str
    createdAt: datetime

class BlockchainRecordSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    index: int
    timestamp: datetime
    dataHash: str
    previousHash: str
    hash: str
    action: str
    note: Optional[str] = None
    createdAt: datetime
