"""
Django settings for ExpertEdu Solutions S.R.L. corporate backend.
Completely independent from ExpertEdu Studio educational database.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "dev-only-insecure-key-replace-in-production-expertedu-corp-2026",
)
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "corporate",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", os.getenv("DB_NAME", "expertedu_corp")),
        "USER": os.getenv("POSTGRES_USER", os.getenv("DB_USER", "expertedu_corp_user")),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", os.getenv("DB_PASSWORD", "changeme_local_only")),
        "HOST": os.getenv("POSTGRES_HOST", os.getenv("DB_HOST", "localhost")),
        "PORT": os.getenv("POSTGRES_PORT", os.getenv("DB_PORT", "5432")),
        "CONN_MAX_AGE": 60,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-bo"
TIME_ZONE = "America/La_Paz"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:4321,http://127.0.0.1:4321",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_METHODS = ["GET", "POST", "PATCH", "OPTIONS"]
CORS_ALLOW_HEADERS = ["content-type", "accept", "origin", "authorization"]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

# DRF Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "corporate.authentication.CorporateBearerAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "contact": os.getenv("CONTACT_THROTTLE_RATE", "10/hour"),
        "support": os.getenv("SUPPORT_THROTTLE_RATE", "10/hour"),
    },
    "EXCEPTION_HANDLER": "corporate.exceptions.safe_exception_handler",
}

# Email Configuration
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@expertedu.bo")
CONTACT_NOTIFICATION_EMAIL = os.getenv(
    "CONTACT_NOTIFICATION_EMAIL", "contacto@expertedu.bo"
)
SUPPORT_NOTIFICATION_EMAIL = os.getenv(
    "SUPPORT_NOTIFICATION_EMAIL", "soporte@expertedu.bo"
)

# Customer Auth, OTP & ExpertEdu Studio SSO Integration
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
CORPORATE_SESSION_DAYS = int(os.getenv("CORPORATE_SESSION_DAYS", "7"))
STUDIO_API_BASE_URL = os.getenv(
    "STUDIO_API_BASE_URL", "http://localhost:8001/api/v1"
).rstrip("/")
STUDIO_PUBLIC_URL = os.getenv(
    "STUDIO_PUBLIC_URL",
    os.getenv("PUBLIC_EXPERTEDU_STUDIO_URL", "http://localhost:5173"),
).rstrip("/")
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://expertedu.bo").rstrip("/")
STUDIO_SERVICE_KEY = os.getenv(
    "STUDIO_SERVICE_KEY", "expertedu-studio-sso-dev-key"
)

# Gemini Corporate Chatbot
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

# Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "False").lower() in (
        "true",
        "1",
        "yes",
    )
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
