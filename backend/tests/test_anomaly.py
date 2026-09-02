from backend.app.intelligence.anomaly_detection import (
    CommunicationAnomalyDetector,
    TransactionAnomalyDetector,
    LocationAnomalyDetector
)

def test_communication_anomaly_detection():
    detector = CommunicationAnomalyDetector()
    calls = [{"caller": "9876512345", "receiver": "9822013345", "hour": 2}]
    anomalies = detector.detect(calls)
    assert len(anomalies) == 1
    assert anomalies[0]["type"] == "UNUSUAL_COMMUNICATION_HOURS"

def test_transaction_anomaly_detection():
    detector = TransactionAnomalyDetector()
    txns = [{"amount": 500000, "sender": "Rahul", "receiver": "Amit"}]
    anomalies = detector.detect(txns)
    assert len(anomalies) == 1
    assert anomalies[0]["severity"] == "HIGH"
