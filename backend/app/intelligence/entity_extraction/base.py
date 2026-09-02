from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel

class ExtractionItem(BaseModel):
    type: str
    value: str
    context: Optional[str] = None
    confidence: int = 85

class BaseExtractionEngine(ABC):
    @abstractmethod
    def extract(self, text: str, hints: Optional[List[str]] = None) -> List[ExtractionItem]:
        pass
