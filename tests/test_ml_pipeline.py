import os
import sys

# Ensure backend path is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_current_dir, ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.security.rbac import get_current_user
from backend.app.database.models import User

# Mock User for bypassing auth
class MockUser:
    id = "test-user-123"
    email = "investigator@crimeintel.gov"
    role = "INVESTIGATOR"

app.dependency_overrides[get_current_user] = lambda: MockUser()

client = TestClient(app)

def run_tests():
    print("Testing ML Pipeline Models...")
    
    # 1. Health Check
    res = client.get("/api/intelligence/health")
    print("\n[1] Health Check:", res.status_code)
    print(res.json())
    assert res.status_code == 200
    
    # 2. Location Analysis
    # Let's use a dummy person_id that likely exists, or handle the error gracefully
    res = client.post("/api/intelligence/location/analyze", json={
        "person_id": "P-123"
    })
    print("\n[2] Location Analysis:", res.status_code)
    print(res.json())
    assert res.status_code == 200
    
    # 3. Investigation Summarizer
    res = client.post("/api/intelligence/summarizer/summarize", json={
        "case_context": "Case: CASE-001\nType: Narcotics\nSeverity: HIGH\nLocation: Downtown Dock\nDescription: Large seizure of contraband.\nAssociated People: P-123, P-456"
    })
    print("\n[3] Investigation Summarizer:", res.status_code)
    print(res.json())
    assert res.status_code == 200
    
    # 4. Lead Generator
    res = client.post("/api/intelligence/leads/generate", json={
        "person_id": None
    })
    print("\n[4] Lead Generator (Top Leads):", res.status_code)
    data = res.json()
    print(f"Generated {len(data.get('leads', []))} leads (showing first 2):")
    print(data.get('leads', [])[:2] if data.get('leads') else "No leads generated")
    assert res.status_code == 200
    
    # 5. Explainability
    res = client.post("/api/intelligence/explain/prediction", json={
        "feature_name": "communication_frequency",
        "feature_value": 150,
        "direction": "positive",
        "person_id": "P-123"
    })
    print("\n[5] Explainability:", res.status_code)
    print(res.json())
    assert res.status_code == 200
    
    print("\nAll models tested successfully!")

if __name__ == "__main__":
    run_tests()
