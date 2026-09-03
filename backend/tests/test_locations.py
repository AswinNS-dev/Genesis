import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.location_analysis_service import location_service

@pytest.fixture
def client():
    return TestClient(app)

def test_locations_hierarchy_endpoint(client):
    """Test /api/locations/hierarchy returns states and districts"""
    res = client.get("/api/locations/hierarchy")
    assert res.status_code == 200
    data = res.json()
    assert data["country"] == "India"
    assert "center" in data
    assert "zoom" in data
    assert len(data["states"]) > 0
    assert any(s["name"] == "Tamil Nadu" for s in data["states"])
    assert any(s["name"] == "Maharashtra" for s in data["states"])

def test_locations_cases_with_incidents_endpoint(client):
    """Test /api/locations/cases-with-incidents returns cases with incident metadata"""
    res = client.get("/api/locations/cases-with-incidents?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        c = data[0]
        assert "id" in c
        assert "hasIncidentDate" in c
        assert "title" in c

def test_hotspots_india_level(client):
    """Test /api/locations/hotspots at India level"""
    res = client.get("/api/locations/hotspots?level=india&category=ALL&time_range=all")
    assert res.status_code == 200
    data = res.json()
    assert data["level"] == "india"
    assert len(data["hotspots"]) > 0
    assert len(data["clusters"]) > 0
    assert "dataQuality" in data
    assert data["dataQuality"]["recordsAnalyzed"] > 0
    assert data["dataQuality"]["coveragePercent"] >= 0
    assert data["dataQuality"]["sourceCount"] > 0
    assert "Activity concentration" in data["dataQuality"]["attribution"]

def test_hotspots_state_level_drilldown(client):
    """Test drill-down to State level (e.g. Tamil Nadu)"""
    res = client.get("/api/locations/hotspots?level=state&state=Tamil%20Nadu&category=ALL")
    assert res.status_code == 200
    data = res.json()
    assert data["level"] == "state"
    assert data["filters"]["state"] == "Tamil Nadu"
    assert len(data["clusters"]) > 0
    for cl in data["clusters"]:
        assert cl["level"] == "district"
        assert cl["state"] == "Tamil Nadu"

def test_hotspots_district_level_drilldown(client):
    """Test drill-down to District level (e.g. Coimbatore)"""
    res = client.get("/api/locations/hotspots?level=district&state=Tamil%20Nadu&district=Coimbatore&category=ALL")
    assert res.status_code == 200
    data = res.json()
    assert data["level"] == "district"
    assert data["filters"]["district"] == "Coimbatore"
    assert len(data["clusters"]) > 0
    for cl in data["clusters"]:
        assert cl["level"] == "area"

def test_hotspots_category_filtering(client):
    """Test category filtering dynamically modifies results"""
    res_comm = client.get("/api/locations/hotspots?level=india&category=COMMUNICATION")
    assert res_comm.status_code == 200
    comm_data = res_comm.json()
    assert comm_data["filters"]["category"] == "COMMUNICATION"

    res_veh = client.get("/api/locations/hotspots?level=india&category=VEHICLE")
    assert res_veh.status_code == 200
    veh_data = res_veh.json()
    assert veh_data["filters"]["category"] == "VEHICLE"

def test_hotspots_time_filtering(client):
    """Test time-based filtering presets"""
    res_7d = client.get("/api/locations/hotspots?level=india&time_range=7d")
    assert res_7d.status_code == 200
    data_7d = res_7d.json()
    assert data_7d["filters"]["timeRange"] == "7d"
    assert data_7d["filters"]["dateFrom"] is not None

def test_hotspots_incident_comparison_with_and_without_date(client):
    """Test incident-date comparative window"""
    # 1. Test with a known FIR case
    cases_res = client.get("/api/locations/cases-with-incidents?limit=5")
    cases = cases_res.json()
    if len(cases) > 0:
        test_case = cases[0]
        res = client.get(f"/api/locations/hotspots?level=india&case_id={test_case['id']}&incident_window=3")
        assert res.status_code == 200
        data = res.json()
        inc = data["incidentComparison"]
        assert inc["case_id"] == test_case["id"]
        assert inc["window_days"] == 3
        if test_case["hasIncidentDate"]:
            assert inc["has_incident_date"] is True
            assert inc["window_start"] is not None
        else:
            assert inc["has_incident_date"] is False
            assert "No incident date" in (inc["message"] or "")

    # 2. Test with non-existent case
    res_non = client.get("/api/locations/hotspots?level=india&case_id=NON-EXISTENT-CASE")
    assert res_non.status_code == 200
    data_non = res_non.json()
    assert data_non["incidentComparison"]["has_incident_date"] is False

def test_data_quality_indicators(client):
    """Test data quality metrics are present and within valid ranges"""
    res = client.get("/api/locations/hotspots?level=india&category=ALL")
    assert res.status_code == 200
    dq = res.json()["dataQuality"]
    assert dq["recordsAnalyzed"] >= 0
    assert 0 <= dq["coveragePercent"] <= 100
    assert 0 <= dq["missingLocationPct"] <= 100
    assert dq["sourceCount"] >= 1
    assert len(dq["sourcesList"]) == dq["sourceCount"]
    assert "Activity concentration" in dq["attribution"]
