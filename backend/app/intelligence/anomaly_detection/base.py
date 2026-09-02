from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseAnomalyDetector(ABC):
    @abstractmethod
    def detect(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        pass
