import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.intelligence.ner.service import NERService
from backend.app.intelligence.entity_resolution.normalizer import (
    normalize_name, normalize_phone, normalize_vehicle, normalize_location
)
from backend.app.intelligence.entity_resolution.similarity import exact_match, fuzzy_match, partial_match
from backend.app.intelligence.entity_resolution.resolver import (
    calculate_resolution_score,
    EntityResolutionService
)

client = TestClient(app)

def test_ner_service_extraction():
    ner = NERService()
    sample_text = "Subject Rahul Kumar driving vehicle DL01AB1234 was contacted on +919876512345 near Sector 18."
    res = ner.extract(sample_text)
    
    assert res["text"] == sample_text
    labels = {e["label"]: e["text"] for e in res["entities"]}
    
    assert "PERSON" in labels
    assert "VEHICLE" in labels
    assert "PHONE" in labels
    assert "LOCATION" in labels

def test_entity_resolution_normalizers():
    assert normalize_name("Dr. Rahul   Kumar") == "rahul kumar"
    assert normalize_phone("+91 98765-12345") == "9876512345"
    assert normalize_vehicle("dl-01-ab-1234") == "DL01AB1234"
    assert normalize_location("  Sector 18, NOIDA  ") == "sector 18 noida"

def test_similarity_metrics():
    assert exact_match("rahul kumar", "rahul kumar") == 1.0
    assert exact_match("rahul kumar", "amit sharma") == 0.0
    assert fuzzy_match("rahul kumar", "rahul kmar") > 0.85
    assert partial_match("rahul", "rahul kumar") > 0.50

def test_entity_resolution_scoring_match():
    extracted = {
        "name": "Rahul Kumar",
        "phone": "+91 98765-12345",
        "vehicle": "DL01AB1234",
        "location": "Sector 18"
    }
    candidate = {
        "id": "ENT-101",
        "name": "Rahul Kumar",
        "phone": "9876512345",
        "vehicle": "DL-01-AB-1234",
        "location": "Sector 18"
    }
    score_res = calculate_resolution_score(extracted, candidate)
    
    assert score_res["confidence"] >= 0.85
    assert score_res["decision"] == "HIGH_CONFIDENCE_MATCH"
    assert score_res["matched_entity_id"] == "ENT-101"

def test_entity_resolution_scoring_lead_review():
    extracted = {
        "name": "R. Kumar",
        "location": "Sector 18"
    }
    candidate = {
        "id": "ENT-102",
        "name": "Rahul Kumar",
        "location": "Sector 18"
    }
    score_res = calculate_resolution_score(extracted, candidate)
    
    assert score_res["confidence"] >= 0.60
    assert "POTENTIAL_LEAD" in score_res["decision"] or score_res["decision"] == "HIGH_CONFIDENCE_MATCH"

def test_intelligence_api_endpoints():
    login_res = client.post("/api/auth/login", json={
        "email": "admin@crimeintel.demo",
        "password": "Admin@1234"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Health check
    health_res = client.get("/api/intelligence/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    # 2. NER extraction endpoint
    ner_res = client.post("/api/intelligence/ner", json={
        "text": "Amit Sharma associated with ABC Logistics phone +919822013345"
    }, headers=headers)
    assert ner_res.status_code == 200
    ner_data = ner_res.json()
    assert len(ner_data["entities"]) >= 1

    # 3. Entity Resolution endpoint
    er_res = client.post("/api/intelligence/entity-resolution", json={
        "extracted_entities": [
            {"name": "Amit Sharma", "phone": "9822013345", "type": "PERSON"}
        ],
        "registry_candidates": [
            {"id": "ENT-201", "name": "Amit Sharma", "phone": "9822013345", "type": "PERSON"}
        ]
    }, headers=headers)
    assert er_res.status_code == 200
    results = er_res.json()["results"]
    assert len(results) == 1
    assert results[0]["matched_entity_id"] == "ENT-201"
