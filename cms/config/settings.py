"""
Django settings for the Wjeen CMS backend.

Stage 3B: content storage, deep patching, publish/rollback, and a read API.
The Next.js site still reads src/messages/*.json -- nothing here is wired into
it yet, and nothing here is deployed.
"""

import datetime
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-not-for-production")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# Where the repository JSON lives. Read-only for every command in Stage 3B.
MESSAGES_DIR = Path(os.environ.get("WJEEN_MESSAGES_DIR", REPO_ROOT / "src" / "messages"))
CONTENT_LOCALES = env_list("WJEEN_LOCALES", "en,ar")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "content",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "wjeen_cms"),
        "USER": os.environ.get("POSTGRES_USER", os.environ.get("USER", "postgres")),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "ATOMIC_REQUESTS": False,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "content.api.auth.CSRFEnforcedJWTCookieAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}

# --------------------------------------------------------------------------
# Auth cookie policy (approved Stage 3B plan, section 1)
#
# The access token lives in an HttpOnly cookie so page JavaScript can never
# read it. Because the browser then attaches it automatically, every mutating
# endpoint additionally requires a CSRF token -- see
# content/api/auth.CSRFEnforcedJWTCookieAuthentication, which closes the hole
# that plain SimpleJWT authentication leaves open.
# --------------------------------------------------------------------------

AUTH_COOKIE_NAME = "wjeen_access"
AUTH_REFRESH_COOKIE_NAME = "wjeen_refresh"
# Scoped so the cookie is never attached to public content reads.
AUTH_COOKIE_PATH = "/api/v1/admin"
AUTH_REFRESH_COOKIE_PATH = "/api/v1/admin/auth"
AUTH_COOKIE_HTTPONLY = True
AUTH_COOKIE_SECURE = env_bool("AUTH_COOKIE_SECURE", not DEBUG)
# Strict is only possible because the API is served from a subdomain of the
# site (api.wjeen.com / www.wjeen.com). Moving the API to an unrelated host
# would force SameSite=None and reopen the CSRF surface -- see the plan.
AUTH_COOKIE_SAMESITE = os.environ.get("AUTH_COOKIE_SAMESITE", "Strict")
AUTH_COOKIE_DOMAIN = os.environ.get("AUTH_COOKIE_DOMAIN") or None

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": datetime.timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": datetime.timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --------------------------------------------------------------------------
# CSRF
# --------------------------------------------------------------------------

CSRF_COOKIE_NAME = "wjeen_csrftoken"
# Readable by JS on purpose: the double-submit token has to be echoed back in
# the X-CSRFToken header. It is not a credential on its own.
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SAMESITE = os.environ.get("CSRF_COOKIE_SAMESITE", "Strict")
CSRF_COOKIE_DOMAIN = os.environ.get("CSRF_COOKIE_DOMAIN") or None
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "http://localhost:3000")

SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
SESSION_COOKIE_SAMESITE = "Strict"

# --------------------------------------------------------------------------
# CORS
#
# Credentialed requests are allowed only from the exact frontend origin.
# django-cors-headers refuses to emit a wildcard while CORS_ALLOW_CREDENTIALS
# is on, and content/tests/test_security.py asserts the wildcard never appears.
# --------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_HEADERS = (
    "accept",
    "authorization",
    "content-type",
    "if-match",
    "origin",
    "x-csrftoken",
    "x-requested-with",
)
CORS_EXPOSE_HEADERS = ("ETag",)

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
