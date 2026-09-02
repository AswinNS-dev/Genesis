import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_dashboard_summary_database_driven():
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_cases" in data
    assert "active_cases" in data
    assert "total_entities" in data
    assert "evidence_items" in data
    assert "ai_analyses" in data
    assert "pending_matches" in data
    assert data["total_cases"] >= 2
    assert data["total_entities"] >= 6

def test_cases_crud_and_sub_resources():
    # 1. List cases
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) >= 2
    case_id = cases[0]["id"]

    # 2. Get single case
    case_res = client.get(f"/api/cases/{case_id}")
    assert case_res.status_code == 200
    assert case_res.json()["id"] == case_id

    # 3. Create case
    new_case = client.post("/api/cases", json={
        "title": "Operation Apex Shadow",
        "description": "Cross-border illicit hawala network",
        "category": "Money Laundering",
        "assignedInvestigator": "Officer Priya Singh"
    })
    assert new_case.status_code == 200
    created_id = new_case.json()["id"]

    # 4. Patch case
    patch_res = client.patch(f"/api/cases/{created_id}", json={
        "status": "UNDER_INVESTIGATION"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "UNDER_INVESTIGATION"

    # 5. Sub-resources
    summary_res = client.get(f"/api/cases/{case_id}/summary")
    assert summary_res.status_code == 200
    assert "statistics" in summary_res.json()

    network_res = client.get(f"/api/cases/{case_id}/network")
    assert network_res.status_code == 200
    assert "nodes" in network_res.json()

    timeline_res = client.get(f"/api/cases/{case_id}/timeline")
    assert timeline_res.status_code == 200
    assert isinstance(timeline_res.json(), list)

    comms_res = client.get(f"/api/cases/{case_id}/communications")
    assert comms_res.status_code == 200
    assert isinstance(comms_res.json(), list)

    txns_res = client.get(f"/api/cases/{case_id}/transactions")
    assert txns_res.status_code == 200
    assert isinstance(txns_res.json(), list)

    locs_res = client.get(f"/api/cases/{case_id}/locations")
    assert locs_res.status_code == 200
    assert isinstance(locs_res.json(), list)

def test_entities_crud():
    # 1. List entities
    res = client.get("/api/entities")
    assert res.status_code == 200
    entities = res.json()
    assert len(entities) >= 6
    ent_id = entities[0]["id"]

    # 2. Patch entity
    patch_res = client.patch(f"/api/entities/{ent_id}", json={
        "riskScore": 95
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["riskScore"] == 95

def test_ml_persistence_and_match_review():
    # 1. Run NER
    ner_res = client.post("/api/intelligence/ner", json={
        "text": "Target Suresh Verma driving vehicle DL01AB1234 near Sector 18"
    })
    assert ner_res.status_code == 200
    assert len(ner_res.json()["entities"]) >= 1

    # 2. Run Entity Resolution
    er_res = client.post("/api/intelligence/entity-resolution", json={
        "extracted_entities": [{"name": "Rahul Kumar", "phone": "9876512345"}],
        "registry_candidates": []
    })
    assert er_res.status_code == 200
    assert len(er_res.json()["results"]) >= 1

    # 3. List matches & update status
    matches_res = client.get("/api/intelligence/entity-matches")
    assert matches_res.status_code == 200
    matches = matches_res.json()
    if matches:
        mid = matches[0]["id"]
        up_res = client.patch(f"/api/intelligence/entity-matches/{mid}", json={"status": "APPROVED"})
        assert up_res.status_code == 200
        assert up_res.json()["status"] == "APPROVED"

def test_blockchain_verification_endpoint():
    res = client.post("/api/blockchain/verify-chain")
    assert res.status_code == 200
    assert res.json()["status"] == "VALID"
