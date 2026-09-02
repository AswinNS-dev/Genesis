from typing import List, Dict, Any
from backend.app.intelligence.anomaly_detection.base import BaseAnomalyDetector

class TransactionAnomalyDetector(BaseAnomalyDetector):
    def detect(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        anomalies = []
        for txn in data:
            if txn.get("amount", 0) > 200000:
                anomalies.append({
                    "type": "LARGE_TRANSACTION",
                    "title": f"High value transaction: INR {txn.get('amount')}",
                    "severity": "HIGH",
                    "details": txn,
                })
        return anomalies
