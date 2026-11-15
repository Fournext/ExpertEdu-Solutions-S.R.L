"""App configuration for corporate inquiries and support tickets."""

from django.apps import AppConfig


class CorporateConfig(AppConfig):
    """Django application config for corporate endpoints."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "corporate"
    verbose_name = "Gestión Corporativa y Soporte"
