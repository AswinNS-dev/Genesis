import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_login():
    res = client.post("/api/auth/login", json={
        "email": "admin@crimeintel.demo",
        "password": "Admin@1234"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"

def test_get_cases():
    login_res = client.post("/api/auth/login", json={
        "email": "admin@crimeintel.demo",
        "password": "Admin@1234"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/cases", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_blockchain_verify():
    login_res = client.post("/api/auth/login", json={
        "email": "admin@crimeintel.demo",
        "password": "Admin@1234"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/blockchain/verify-chain", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "VALID"
