from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel

class MatchCandidateResult(BaseModel):
    entityAId: str
    entityBId: str
    confidence: int
    reasons: List[str]

class BaseEntityMatcher(ABC):
    @abstractmethod
    def match(self, entity_a: Dict[str, Any], entity_b: Dict[str, Any]) -> MatchCandidateResult:
        pass
