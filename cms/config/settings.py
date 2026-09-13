"""
Django settings for the Wjeen CMS backend.

Stage 3B: content storage, deep patching, publish/rollback, and a read API.
The Next.js site still reads src/messages/*.json -- nothing here is wired into
it yet, and nothing here is deployed.
"""

import datetime
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
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

# The fallback key above is printed in this file. With DEBUG off it would sign
# sessions, CSRF tokens and every JWT the studio trusts (SIMPLE_JWT names no
# key of its own), so anyone could forge an editor's token. `check --deploy`
# only warns about that, and a warning scrolls past; this does not.
if not DEBUG and SECRET_KEY == "dev-only-insecure-key-not-for-production":
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off.")

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
    "media_library",
    "inquiries",
    "throttling",
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
# Where `collectstatic` gathers the admin's and DRF's own assets. Django stops
# serving them once DEBUG is off -- the web server in front does that -- but
# without a STATIC_ROOT there is nothing to serve and the command refuses to run.
STATIC_ROOT = Path(os.environ.get("WJEEN_STATIC_ROOT", BASE_DIR / "staticfiles"))
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------
# Media library
#
# Files on a filesystem, addressed by the SHA-256 of their own bytes. Nothing
# image-shaped is ever stored in Postgres: a JSONB column holding base64 would
# be read on every content query and would put multi-megabyte blobs through
# the connection pool that serves text.
#
# `STORAGES["default"]` is the seam. Swapping local disk for S3 or Cloudflare
# R2 in production is this block plus `django-storages`; no model, no view and
# no migration changes with it, because nothing outside this setting knows
# where the bytes live.
# --------------------------------------------------------------------------

MEDIA_URL = os.environ.get("WJEEN_MEDIA_URL", "/media/")
MEDIA_ROOT = Path(os.environ.get("WJEEN_MEDIA_ROOT", BASE_DIR / "mediafiles"))

STORAGES = {
    "default": {
        "BACKEND": os.environ.get(
            "WJEEN_MEDIA_STORAGE", "django.core.files.storage.FileSystemStorage"
        )
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
    },
}

# Upload gates. Enforced against the decoded file, never against the headers
# or the filename the browser sent -- see media_library.validation.
WJEEN_MEDIA_MAX_BYTES = int(os.environ.get("WJEEN_MEDIA_MAX_BYTES", 10 * 1024 * 1024))
WJEEN_MEDIA_MIN_EDGE = int(os.environ.get("WJEEN_MEDIA_MIN_EDGE", 48))
WJEEN_MEDIA_MAX_EDGE = int(os.environ.get("WJEEN_MEDIA_MAX_EDGE", 8000))
# Decompression-bomb ceiling: a small file that decodes to an enormous bitmap
# is refused before Pillow allocates for it.
WJEEN_MEDIA_MAX_PIXELS = int(os.environ.get("WJEEN_MEDIA_MAX_PIXELS", 50_000_000))

# Anything larger than this is streamed to a temporary file rather than held
# in memory, so a handful of concurrent uploads cannot exhaust the process.
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = WJEEN_MEDIA_MAX_BYTES + (1024 * 1024)

# --------------------------------------------------------------------------
# Inquiries and private files
#
# A CV is personal data belonging to a job applicant. It is stored outside
# MEDIA_ROOT, it is never added to `urlpatterns`, and the storage class it
# uses refuses to produce a URL at all -- so the only way to it is the
# authenticated download view.
#
# `WJEEN_PRIVATE_STORAGE` is the seam. Unset means the local disk below, which
# is what development and the tests use. Naming a private object-storage
# backend there (S3 with a private ACL, R2) moves every CV without touching
# the Inquiry model, the API, the download view or the migration.
# --------------------------------------------------------------------------

WJEEN_PRIVATE_ROOT = Path(
    os.environ.get("WJEEN_PRIVATE_ROOT", BASE_DIR / "privatefiles")
)
WJEEN_PRIVATE_STORAGE = os.environ.get("WJEEN_PRIVATE_STORAGE") or None
WJEEN_PRIVATE_STORAGE_OPTIONS: dict = {}

# CVs: PDF and DOCX only, decided from the bytes. See inquiries.validation --
# and note that allow-listing a format is not virus scanning.
WJEEN_CV_MAX_BYTES = int(os.environ.get("WJEEN_CV_MAX_BYTES", 5 * 1024 * 1024))
#: How long an applicant's CV is kept. `purge_expired_cvs` deletes the bytes
#: after this and leaves the application row behind.
WJEEN_CV_RETENTION_DAYS = int(os.environ.get("WJEEN_CV_RETENTION_DAYS", 365))

# The public site posts submissions server-to-server. The browser never talks
# to this endpoint, so a shared secret is the right shape: without it the
# endpoint answers 403 and nothing reaches the database.
WJEEN_INQUIRY_TOKEN = os.environ.get("WJEEN_INQUIRY_TOKEN", "")

# How many times a failed notification is retried by `retry_notifications`
# before it is left alone for a person to deal with.
WJEEN_NOTIFY_MAX_ATTEMPTS = int(os.environ.get("WJEEN_NOTIFY_MAX_ATTEMPTS", 5))

# A submission carrying a CV is larger than a JSON body, so the upload ceiling
# has to clear the CV limit rather than the image one.
DATA_UPLOAD_MAX_MEMORY_SIZE = max(
    DATA_UPLOAD_MAX_MEMORY_SIZE, WJEEN_CV_MAX_BYTES + (1024 * 1024)
)

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

# --------------------------------------------------------------------------
# Sign-in throttling
#
# Applies to the admin login endpoint only. Counted per client address, never
# per username: counting per username would let anyone lock a known account
# out, and would make the response differ for an account that exists.
# --------------------------------------------------------------------------

LOGIN_THROTTLE_LIMIT = int(os.environ.get("LOGIN_THROTTLE_LIMIT", "10"))
LOGIN_THROTTLE_WINDOW = int(os.environ.get("LOGIN_THROTTLE_WINDOW", "900"))
LOGIN_THROTTLE_SWEEP_AT = int(os.environ.get("LOGIN_THROTTLE_SWEEP_AT", "1000"))

# Only enable behind a proxy that overwrites X-Forwarded-For. Left off, the
# throttle keys on REMOTE_ADDR, which a client cannot forge.
TRUST_PROXY_HEADER = env_bool("TRUST_PROXY_HEADER", False)

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
CORS_EXPOSE_HEADERS = ("ETag", "Retry-After")

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# --------------------------------------------------------------------------
# HTTPS
#
# All off by default, because development is plain HTTP and a redirect to
# https://localhost would lock it out. A deployment turns them on through the
# environment -- see DEPLOYMENT.md. The cookie `Secure` flags above need
# nothing: they already follow DEBUG.
# --------------------------------------------------------------------------

SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)
SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
# Not defaulted on: the preload list is a one-way commitment -- the same reason
# next.config.ts leaves `preload` out of the site's own header.
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)
# `check --deploy` flags that choice as security.W021. Silencing exactly that
# one check, and only while preload is off, keeps `--fail-level WARNING` able to
# catch every other regression -- lowering the gate to ERROR would let a missing
# HSTS header or SSL redirect through. Turning preload on re-enables the check.
SILENCED_SYSTEM_CHECKS = [] if SECURE_HSTS_PRELOAD else ["security.W021"]

# Behind a proxy that terminates TLS, Django sees plain HTTP -- so it would
# never send HSTS and would loop on its own redirect -- unless it is told which
# header to believe. Enable only when that proxy overwrites the header on every
# request; otherwise a client could claim HTTPS just by sending it.
if env_bool("DJANGO_SECURE_PROXY_SSL_HEADER", False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
