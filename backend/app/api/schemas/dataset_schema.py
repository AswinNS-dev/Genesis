from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DatasetResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    sourceType: str
    fileName: Optional[str] = None
    status: str
    recordCount: int
    analysisScope: str
    createdAt: datetime
