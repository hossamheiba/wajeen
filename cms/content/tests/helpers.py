"""Shared fixtures. Every test runs against the *real* site content."""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient


def load_repository_messages(locale: str) -> dict:
    """Read src/messages/{locale}.json. Read-only, always."""
    path = Path(settings.MESSAGES_DIR) / f"{locale}.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def import_real_content() -> None:
    call_command("import_messages", verbosity=0)


def make_editor(username: str = "editor", password: str = "correct-horse-battery") :
    User = get_user_model()
    return User.objects.create_user(
        username=username, password=password, is_staff=True
    )


def login(client: APIClient, username: str = "editor", password: str = "correct-horse-battery"):
    """Fetch the CSRF token, then log in the way a browser would."""
    client.get("/api/v1/admin/auth/csrf/")
    token = client.cookies.get(settings.CSRF_COOKIE_NAME)
    response = client.post(
        "/api/v1/admin/auth/login/",
        {"username": username, "password": password},
        format="json",
        **({"HTTP_X_CSRFTOKEN": token.value} if token else {}),
    )
    return response


def csrf_token(client: APIClient) -> str:
    client.get("/api/v1/admin/auth/csrf/")
    cookie = client.cookies.get(settings.CSRF_COOKIE_NAME)
    return cookie.value if cookie else ""
