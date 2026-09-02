from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseRelationshipDetector(ABC):
    @abstractmethod
    def detect_relationships(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        pass
