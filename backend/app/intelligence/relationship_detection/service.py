from typing import List, Dict, Any
from backend.app.intelligence.relationship_detection.base import BaseRelationshipDetector

class RelationshipDetectionService(BaseRelationshipDetector):
    def detect_relationships(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        rels = []
        for e in events:
            if "source" in e and "target" in e:
                rels.append({
                    "source": e["source"],
                    "target": e["target"],
                    "type": e.get("type", "CASE"),
                    "strength": e.get("strength", 50),
                })
        return rels
