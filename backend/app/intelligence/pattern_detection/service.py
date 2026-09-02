from typing import List, Dict, Any

class PatternDetectionService:
    def detect_patterns(self, locations: List[Dict[str, Any]], calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        patterns = []
        for loc in locations:
            if len(loc.get("entities", [])) >= 2:
                patterns.append({
                    "type": "REPEATED_LOCATION",
                    "title": f"Multiple subjects co-located at {loc.get('name')}",
                    "summary": f"Subjects {', '.join(loc.get('entities'))} recorded at {loc.get('name')}.",
                    "severity": "HIGH",
                    "entities": loc.get("entities"),
                    "relevance": 90,
                })
        return patterns
