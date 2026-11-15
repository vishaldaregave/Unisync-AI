"""Liveness endpoint behaviour."""

from __future__ import annotations

from app.main import create_app
from fastapi.testclient import TestClient


def test_healthz_reports_ok() -> None:
    client = TestClient(create_app())

    response = client.get("/healthz")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "unisync-api"
    assert "version" in body
