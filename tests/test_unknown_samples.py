import os
import sys

_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_current_dir, ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.security.rbac import get_current_user

# Mock User for bypassing auth
class MockUser:
    id = "test-user-123"
    email = "investigator@crimeintel.gov"
    role = "INVESTIGATOR"

app.dependency_overrides[get_current_user] = lambda: MockUser()
client = TestClient(app)

def test_unknown_samples():
    print("=== Testing with completely NEW unknown samples ===")

    # 1. Summarizer with a strange, unstructured new case
    print("\n--- 1. Summarizer (Unseen Complex Text) ---")
    unseen_case_text = """
    Incident: 2026-XQ-99
    Details: Suspect John Doe (Alias: 'Ghost') was seen swapping a heavy duffel bag 
    near the old railway overpass at 03:00 AM on Sunday. Two unknown vehicles (Plates: XYZ-1234, ABC-9999) 
    fled the scene rapidly when local patrol approached. A drone captured thermal signatures of 3 other individuals.
    Status: High Alert.
    """
    res = client.post("/api/intelligence/summarizer/summarize", json={"case_context": unseen_case_text})
    print(res.json().get("summary", "Error"))

    # 2. Location Analysis with an unknown person id
    print("\n--- 2. Location Analysis (Unknown Person ID) ---")
    res = client.post("/api/intelligence/location/analyze", json={"person_id": "UNKNOWN-PERSON-999"})
    print(res.json())
    
    # 3. Explainability on a weird arbitrary edge case feature value
    print("\n--- 3. Explainability (Extreme Values) ---")
    res = client.post("/api/intelligence/explain/prediction", json={
        "feature_name": "night_visit_ratio",
        "feature_value": 0.99,
        "direction": "positive",
        "person_id": "P-999"
    })
    print(res.json().get("human_explanation", "Error"))

if __name__ == "__main__":
    test_unknown_samples()
