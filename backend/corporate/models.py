"""Database models for corporate contact inquiries and support tickets."""

import secrets
import uuid

from django.db import models
from django.utils import timezone


def generate_ticket_reference() -> str:
    """Generate a human-readable unique support ticket reference."""
    year = timezone.now().year
    token = secrets.token_hex(3).upper()
    return f"EXP-{year}-{token}"


class ContactInquiry(models.Model):
    """Stores commercial, demo, and institutional contact requests."""

    class InquiryType(models.TextChoices):
        GENERAL = "GENERAL", "Información general"
        DEMO = "DEMO", "Solicitud de demostración"
        TECH_SERVICES = "TECH_SERVICES", "Servicios tecnológicos"
        INSTITUTIONAL_LICENSING = (
            "INSTITUTIONAL_LICENSING",
            "Licenciamiento institucional",
        )
        SUPPORT = "SUPPORT", "Soporte"
        OTHER = "OTHER", "Otros"

    class Status(models.TextChoices):
        NEW = "NEW", "Nueva"
        IN_REVIEW = "IN_REVIEW", "En revisión"
        RESPONDED = "RESPONDED", "Respondida"
        ARCHIVED = "ARCHIVED", "Archivada"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=120)
    email = models.EmailField(max_length=180, db_index=True)
    organization = models.CharField(max_length=160, blank=True, default="")
    inquiry_type = models.CharField(
        max_length=32,
        choices=InquiryType.choices,
        default=InquiryType.GENERAL,
    )
    subject = models.CharField(max_length=180)
    message = models.TextField(max_length=3000)
    privacy_accepted = models.BooleanField(default=False)
    source_page = models.CharField(max_length=100, blank=True, default="/contacto")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )
    ip_hash = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Consulta de contacto"
        verbose_name_plural = "Consultas de contacto"

    def __str__(self) -> str:
        return f"[{self.inquiry_type}] {self.subject} - {self.full_name}"


class SupportTicket(models.Model):
    """Stores technical support incidents routed across L1/L2/L3 support tiers."""

    class Category(models.TextChoices):
        ACCESS = "ACCESS", "Acceso y cuentas"
        VISUAL_EDITOR = "VISUAL_EDITOR", "Editor visual de conocimiento"
        INFERENCE_ENGINE = "INFERENCE_ENGINE", "Motor de inferencia"
        VALIDATION = "VALIDATION", "Validación de bases de conocimiento"
        ACTIVITIES = "ACTIVITIES", "Actividades y cursos"
        LICENSING = "LICENSING", "Licenciamiento institucional"
        OTHER = "OTHER", "Otros"

    class Severity(models.TextChoices):
        LOW = "LOW", "Baja"
        MEDIUM = "MEDIUM", "Media"
        HIGH = "HIGH", "Alta"

    class SupportLevel(models.TextChoices):
        L1_SELF_SERVICE = "L1_SELF_SERVICE", "Nivel 1: Autoservicio"
        L2_HELP_DESK = "L2_HELP_DESK", "Nivel 2: Mesa de ayuda"
        L3_ENGINEERING = "L3_ENGINEERING", "Nivel 3: Soporte de ingeniería"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Abierto"
        IN_PROGRESS = "IN_PROGRESS", "En progreso"
        RESOLVED = "RESOLVED", "Resuelto"
        CLOSED = "CLOSED", "Cerrado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_code = models.CharField(
        max_length=24,
        unique=True,
        default=generate_ticket_reference,
        editable=False,
        db_index=True,
    )
    full_name = models.CharField(max_length=120)
    email = models.EmailField(max_length=180, db_index=True)
    organization = models.CharField(max_length=160, blank=True, default="")
    category = models.CharField(
        max_length=32,
        choices=Category.choices,
        default=Category.OTHER,
    )
    severity = models.CharField(
        max_length=16,
        choices=Severity.choices,
        default=Severity.MEDIUM,
    )
    support_level = models.CharField(
        max_length=24,
        choices=SupportLevel.choices,
        default=SupportLevel.L2_HELP_DESK,
    )
    subject = models.CharField(max_length=180)
    description = models.TextField(max_length=4000)
    privacy_accepted = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    ip_hash = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Ticket de soporte"
        verbose_name_plural = "Tickets de soporte"

    def __str__(self) -> str:
        return f"{self.reference_code} ({self.get_status_display()}) - {self.subject}"
