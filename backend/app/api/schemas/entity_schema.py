from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EntityCreateSchema(BaseModel):
    name: str
    type: str
    aliases: Optional[List[str]] = []
    value: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    riskScore: Optional[int] = 0
    caseId: Optional[str] = None

class EntityResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    type: str
    aliases: Optional[str] = None
    value: Optional[str] = None
    metadata_json: Optional[str] = None
    riskScore: int = 0
    caseId: Optional[str] = None
    createdAt: datetime
