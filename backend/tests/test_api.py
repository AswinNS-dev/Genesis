import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_api_auth_login():
    res = client.post("/api/auth/login", json={
        "email": "admin@crimeintel.demo",
        "password": "Admin@1234"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    assert token is not None

def test_api_search():
    # Login
    login_res = client.post("/api/auth/login", json={
        "email": "admin@crimeintel.demo",
        "password": "Admin@1234"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/search?q=Rahul", headers=headers)
    assert res.status_code == 200
    assert "entities" in res.json()
