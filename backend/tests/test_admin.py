"""Admin API tests — runs against live backend. Uses configured admin from ADMIN_EMAILS."""
import os
import time
import uuid
import requests
import pytest


ADMIN_EMAIL = "admin_test_1777718525@test.com"
ADMIN_PASSWORD = "AdminTest123!"


def _register(base_url, email, password="PytestPass123!", name="Pytest User"):
    for _ in range(2):
        r = requests.post(f"{base_url}/api/auth/register", json={
            "name": name, "email": email, "password": password,
        }, timeout=10)
        if r.status_code == 200:
            return r
        if r.status_code == 429:
            time.sleep(65)
            continue
        return r
    return r


def _login(base_url, email, password):
    r = requests.post(f"{base_url}/api/auth/login", json={"email": email, "password": password}, timeout=10)
    return r


@pytest.fixture(scope="module")
def admin_token(base_url):
    # Try login first; if fails, register.
    r = _login(base_url, ADMIN_EMAIL, ADMIN_PASSWORD)
    if r.status_code != 200:
        _register(base_url, ADMIN_EMAIL, ADMIN_PASSWORD, name="Admin Test")
        r = _login(base_url, ADMIN_EMAIL, ADMIN_PASSWORD)
    if r.status_code != 200:
        pytest.skip(f"Could not authenticate admin: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def user_token(base_url):
    email = f"pytest_nonadm_{int(time.time())}_{uuid.uuid4().hex[:6]}@test.com"
    r = _register(base_url, email)
    if r.status_code != 200:
        pytest.skip(f"Could not register test user: {r.status_code} {r.text}")
    return r.json()["access_token"]


# --- /admin/me ---

def test_admin_me_403_for_non_admin(base_url, user_token):
    r = requests.get(f"{base_url}/api/admin/me",
                     headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    assert r.status_code == 403


def test_admin_me_200_for_admin(base_url, admin_token):
    r = requests.get(f"{base_url}/api/admin/me",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["is_admin"] is True
    assert data["email"].lower() == ADMIN_EMAIL.lower()


# --- /admin/stats ---

def test_admin_stats_shape(base_url, admin_token):
    r = requests.get(f"{base_url}/api/admin/stats",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ["total_users", "users_by_plan", "total_dossiers", "total_pieces",
                "total_revenue_eur", "transactions_paid", "transactions_pending", "promo_codes_count"]:
        assert key in data, f"Missing key {key}"
    assert isinstance(data["users_by_plan"], dict)
    assert isinstance(data["total_users"], int)


# --- /admin/users ---

def test_admin_users_list_no_password_hash(base_url, admin_token):
    r = requests.get(f"{base_url}/api/admin/users?limit=10",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200, r.text
    users = r.json()
    assert isinstance(users, list)
    for u in users:
        assert "password_hash" not in u
        assert "id" in u and "email" in u and "plan" in u


def test_admin_users_search_filter(base_url, admin_token):
    r = requests.get(f"{base_url}/api/admin/users?q=admin_test&limit=10",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200, r.text
    users = r.json()
    assert any("admin_test" in (u.get("email") or "").lower() for u in users)


# --- /admin/users/{id}/plan ---

def test_admin_update_user_plan_essentiel_alias(base_url, admin_token):
    # Create a test user to modify
    email = f"TEST_adm_plan_{int(time.time())}_{uuid.uuid4().hex[:6]}@test.com"
    reg = _register(base_url, email)
    assert reg.status_code == 200, reg.text

    # Fetch via admin list
    r = requests.get(f"{base_url}/api/admin/users?q={email}",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200
    users = r.json()
    match = [u for u in users if u["email"].lower() == email.lower()]
    assert match, f"User {email} not found in admin list"
    uid = match[0]["id"]

    # Set plan=essentiel (public alias) -> should normalize to standard
    r = requests.patch(f"{base_url}/api/admin/users/{uid}/plan",
                       json={"plan": "essentiel"},
                       headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["plan"] == "standard", f"Expected normalization to 'standard', got {data}"

    # Verify persisted
    r = requests.get(f"{base_url}/api/admin/users?q={email}",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    match = [u for u in r.json() if u["email"].lower() == email.lower()]
    assert match[0]["plan"] == "standard"


def test_admin_update_user_plan_404(base_url, admin_token):
    r = requests.patch(f"{base_url}/api/admin/users/nonexistent-user-id/plan",
                       json={"plan": "pro"},
                       headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 404


def test_admin_update_user_plan_400(base_url, admin_token):
    r = requests.patch(f"{base_url}/api/admin/users/some-id/plan",
                       json={"plan": "super_duper"},
                       headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 400


# --- /admin/promo-codes ---

def test_admin_promo_crud_full_cycle(base_url, admin_token):
    code = f"TESTPROMO{int(time.time())}{uuid.uuid4().hex[:4].upper()}"

    # Create
    r = requests.post(f"{base_url}/api/admin/promo-codes",
                      json={"code": code, "discount_percent": 15},
                      headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["promo"]["code"] == code.upper()

    # List contains it
    r = requests.get(f"{base_url}/api/admin/promo-codes",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200
    promos = r.json()["promos"]
    assert any(p["code"] == code.upper() for p in promos)

    # Duplicate -> 400
    r = requests.post(f"{base_url}/api/admin/promo-codes",
                      json={"code": code, "discount_percent": 10},
                      headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 400

    # Missing discount -> 400
    r = requests.post(f"{base_url}/api/admin/promo-codes",
                      json={"code": code + "X"},
                      headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 400

    # Delete
    r = requests.delete(f"{base_url}/api/admin/promo-codes/{code}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200, r.text

    # Delete again -> 404
    r = requests.delete(f"{base_url}/api/admin/promo-codes/{code}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 404


# --- /admin/transactions ---

def test_admin_transactions_list(base_url, admin_token):
    r = requests.get(f"{base_url}/api/admin/transactions?status=paid",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "transactions" in data
    assert isinstance(data["transactions"], list)


# --- Stripe webhook ---

def test_webhook_checkout_session_completed(base_url):
    """Webhook must accept unsigned payload in dev and not 500/404."""
    payload = b'{"type":"checkout.session.completed","data":{"object":{"id":"cs_test_123"}}}'
    r = requests.post(f"{base_url}/api/webhook/stripe", data=payload,
                      headers={"Content-Type": "application/json"}, timeout=10)
    assert r.status_code != 404
    assert r.status_code != 500, r.text


def test_webhook_invoice_payment_succeeded(base_url):
    payload = b'{"type":"invoice.payment_succeeded","data":{"object":{"subscription":"sub_fake","customer":"cus_fake"}}}'
    r = requests.post(f"{base_url}/api/webhook/stripe", data=payload,
                      headers={"Content-Type": "application/json"}, timeout=10)
    assert r.status_code not in (404, 500), r.text


def test_webhook_subscription_deleted(base_url):
    payload = b'{"type":"customer.subscription.deleted","data":{"object":{"id":"sub_fake","customer":"cus_fake"}}}'
    r = requests.post(f"{base_url}/api/webhook/stripe", data=payload,
                      headers={"Content-Type": "application/json"}, timeout=10)
    assert r.status_code not in (404, 500), r.text
