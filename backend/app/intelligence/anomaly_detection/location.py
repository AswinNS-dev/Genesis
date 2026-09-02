from typing import List, Dict, Any
from backend.app.intelligence.anomaly_detection.base import BaseAnomalyDetector

class LocationAnomalyDetector(BaseAnomalyDetector):
    def detect(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        anomalies = []
        for loc in data:
            if loc.get("speed_kmh", 0) > 120:
                anomalies.append({
                    "type": "GEO_DISCREPANCY",
                    "title": "Infeasible transit speed detected between cell pings",
                    "severity": "MEDIUM",
                    "details": loc,
                })
        return anomalies
