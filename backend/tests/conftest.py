"""Pytest configuration — tests run against the live backend (supervisor)."""
import os
import time
import uuid
import pytest


BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:8001")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def unique_email():
    return f"pytest_{int(time.time())}_{uuid.uuid4().hex[:6]}@test.com"
