from typing import List, Dict, Any
from backend.app.intelligence.anomaly_detection.base import BaseAnomalyDetector

class CommunicationAnomalyDetector(BaseAnomalyDetector):
    def detect(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        anomalies = []
        for call in data:
            if call.get("hour", 12) in [1, 2, 3, 4]:
                anomalies.append({
                    "type": "UNUSUAL_COMMUNICATION_HOURS",
                    "title": "Off-hours late night communication",
                    "severity": "HIGH",
                    "details": call,
                })
        return anomalies
