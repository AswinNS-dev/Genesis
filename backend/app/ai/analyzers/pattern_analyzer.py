from typing import List, Dict, Any

class PatternAnalyzer:
    def analyze(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [{"pattern": "CO_LOCATION", "confidence": 85}]
