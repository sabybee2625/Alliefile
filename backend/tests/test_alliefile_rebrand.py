"""Tests for AlliéFile rebrand: plans, register email, promo aliases."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://legal-saas-v1.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def test_user(api):
    """Create a fresh user and return token + creds."""
    ts = int(time.time())
    email = f"TEST_alliefile_{ts}@test.com"
    password = "TestPass123!"
    name = "AlliéFile Tester"
    r = api.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": password, "name": name})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and len(data["access_token"]) > 0
    assert data["user"]["email"] == email
    assert data["user"]["plan"] == "free"
    return {"email": email, "password": password, "name": name, "token": data["access_token"], "id": data["user"]["id"]}


# ---------------- Plans ----------------
class TestPlans:
    def test_get_plans_essentiel_pro(self, api):
        r = api.get(f"{BASE_URL}/api/payments/plans")
        assert r.status_code == 200
        data = r.json()
        plans = data["plans"]
        # Internal keys "standard"/"premium" exposed publicly as Essentiel/Pro
        assert "standard" in plans
        assert "premium" in plans
        assert plans["standard"]["name"] == "Essentiel"
        assert plans["standard"]["slug"] == "essentiel"
        assert plans["standard"]["price_monthly"] == 14.90
        assert plans["standard"]["price_yearly"] == 149.00
        assert plans["premium"]["name"] == "Pro"
        assert plans["premium"]["slug"] == "pro"
        assert plans["premium"]["price_monthly"] == 39.90
        assert plans["premium"]["price_yearly"] == 399.00


# ---------------- Auth / Register email ----------------
class TestAuthRegister:
    def test_register_returns_token_with_email_fire_and_forget(self, test_user):
        # Fixture itself asserts register success (email is fire-and-forget, no error)
        assert test_user["token"]

    def test_login_after_register(self, api, test_user):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
        assert r.status_code == 200, f"login failed: {r.text}"
        data = r.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_user["email"]


# ---------------- Promo validate-promo with alias ----------------
class TestPromoAliases:
    def _auth_headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def test_validate_promo_essentiel_alias_invalid_code(self, api, test_user):
        r = api.post(
            f"{BASE_URL}/api/payments/validate-promo",
            json={"code": "BIDONXYZ123", "plan_id": "essentiel"},
            headers=self._auth_headers(test_user["token"])
        )
        # Must NOT return "Plan invalide" -- alias must resolve
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"
        body = r.json()
        detail = (body.get("detail") or "").lower() if isinstance(body, dict) else ""
        assert "plan invalide" not in detail, f"alias not resolved: {body}"
        assert "code" in detail or "invalide" in detail or "expir" in detail

    def test_validate_promo_standard_internal_invalid_code(self, api, test_user):
        r = api.post(
            f"{BASE_URL}/api/payments/validate-promo",
            json={"code": "BIDONXYZ123", "plan_id": "standard"},
            headers=self._auth_headers(test_user["token"])
        )
        assert r.status_code == 400
        body = r.json()
        detail = (body.get("detail") or "").lower() if isinstance(body, dict) else ""
        assert "plan invalide" not in detail

    def test_validate_promo_pro_alias_invalid_code(self, api, test_user):
        r = api.post(
            f"{BASE_URL}/api/payments/validate-promo",
            json={"code": "BIDONXYZ123", "plan_id": "pro"},
            headers=self._auth_headers(test_user["token"])
        )
        assert r.status_code == 400
        body = r.json()
        detail = (body.get("detail") or "").lower() if isinstance(body, dict) else ""
        assert "plan invalide" not in detail


# ---------------- Checkout with alias ----------------
class TestCheckoutAlias:
    def _auth_headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def test_checkout_essentiel_alias_not_plan_invalide(self, api, test_user):
        r = api.post(
            f"{BASE_URL}/api/payments/checkout",
            json={"plan_id": "essentiel", "billing_period": "monthly"},
            headers=self._auth_headers(test_user["token"])
        )
        # 503 (Stripe non configuré) is acceptable; 400 'Plan invalide' is NOT.
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        detail = (body.get("detail") or "").lower() if isinstance(body, dict) else ""
        assert "plan invalide" not in detail, f"alias should be accepted: status={r.status_code} body={body}"
        assert r.status_code in (200, 500, 503), f"unexpected status {r.status_code}: {body}"
