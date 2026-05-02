"""Smoke tests for AlliéFile critical endpoints (run against live backend)."""
import time
import requests


def _register(base_url, email, retries=3):
    """Register with retry on rate limit (429)."""
    for i in range(retries):
        r = requests.post(f"{base_url}/api/auth/register", json={
            "name": "Pytest User", "email": email, "password": "PytestPass123!",
        }, timeout=10)
        if r.status_code == 200:
            return r
        if r.status_code == 429 and i < retries - 1:
            time.sleep(65)
            continue
        return r
    return r


def test_health(base_url):
    r = requests.get(f"{base_url}/api/health", timeout=5)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") in ("healthy", "OK", "ok")


def test_get_plans_returns_essentiel_and_pro(base_url):
    r = requests.get(f"{base_url}/api/payments/plans", timeout=5)
    assert r.status_code == 200, r.text
    plans = r.json()["plans"]
    assert plans["standard"]["name"] == "Essentiel"
    assert plans["standard"]["price_monthly"] == 14.90
    assert plans["premium"]["name"] == "Pro"
    assert plans["premium"]["price_monthly"] == 39.90


def test_register_and_login(base_url, unique_email):
    r = _register(base_url, unique_email)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    assert token

    r = requests.post(f"{base_url}/api/auth/login", json={
        "email": unique_email, "password": "PytestPass123!",
    }, timeout=10)
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_duplicate_registration_rejected(base_url, unique_email):
    r1 = _register(base_url, unique_email)
    assert r1.status_code == 200, r1.text
    r2 = requests.post(f"{base_url}/api/auth/register", json={
        "name": "Dup", "email": unique_email, "password": "PytestPass123!",
    }, timeout=10)
    assert r2.status_code == 400


def test_plan_alias_essentiel_accepted(base_url, unique_email):
    """The public slug 'essentiel' must be accepted by validate-promo."""
    r = _register(base_url, unique_email)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]

    r = requests.post(
        f"{base_url}/api/payments/validate-promo",
        json={"code": "DOES_NOT_EXIST_XYZ", "plan_id": "essentiel"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    # Must NOT say "Plan invalide"
    assert r.status_code in (400, 200), r.text
    if r.status_code == 400:
        assert "Plan invalide" not in r.text


def test_admin_endpoint_requires_admin(base_url, unique_email):
    """Non-admin users must get 403 on /admin/* endpoints."""
    r = _register(base_url, unique_email)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    r = requests.get(f"{base_url}/api/admin/stats",
                     headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert r.status_code == 403


def test_webhook_endpoint_reachable(base_url):
    """Webhook endpoint must be reachable (returns 200 or 400, never 404)."""
    r = requests.post(f"{base_url}/api/webhook/stripe", data=b"{}", timeout=5)
    assert r.status_code != 404, f"Webhook endpoint not registered: {r.text}"
