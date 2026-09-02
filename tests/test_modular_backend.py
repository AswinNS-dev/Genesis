import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_modular_backend_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_modular_backend_auth_and_cases():
    login_res = client.post("/api/auth/login", json={
        "email": "admin@crimeintel.demo",
        "password": "Admin@1234"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    cases_res = client.get("/api/cases", headers=headers)
    assert cases_res.status_code == 200
    assert len(cases_res.json()) >= 1

    chain_res = client.get("/api/blockchain", headers=headers)
    assert chain_res.status_code == 200

    graph_res = client.get("/api/analysis/graph", headers=headers)
    assert graph_res.status_code == 200
    assert "nodes" in graph_res.json()
