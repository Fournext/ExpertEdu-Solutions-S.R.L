"""Database models for corporate contact inquiries and support tickets."""

import secrets
import uuid

from django.conf import settings
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
    target_inbox = models.EmailField(max_length=180, blank=True, default="")
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
    target_inbox = models.EmailField(max_length=180, blank=True, default="")
    ip_hash = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Ticket de soporte"
        verbose_name_plural = "Tickets de soporte"

    def __str__(self) -> str:
        return f"{self.reference_code} ({self.get_status_display()}) - {self.subject}"


class EmailVerificationCode(models.Model):
    """Stores temporary 6-digit OTP codes required before customer registration."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=180, db_index=True)
    code = models.CharField(max_length=6)
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Código de verificación"
        verbose_name_plural = "Códigos de verificación"

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at


class CustomerProfile(models.Model):
    """Stores corporate customer profile and mandatory legal acceptances."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )
    full_name = models.CharField(max_length=150)
    organization = models.CharField(max_length=160, blank=True, default="")
    email_verified = models.BooleanField(default=False)
    privacy_accepted = models.BooleanField(default=False)
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_accepted = models.BooleanField(default=False)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Perfil de cliente"
        verbose_name_plural = "Perfiles de clientes"

    def __str__(self) -> str:
        return f"{self.full_name} ({self.user.email})"


class CustomerProductMembership(models.Model):
    """Tracks which ExpertEdu products, plans, and roles a customer uses."""

    class ProductCode(models.TextChoices):
        EXPERTEDU_STUDIO = "EXPERTEDU_STUDIO", "ExpertEdu Studio"

    class StudioRole(models.TextChoices):
        DOCENTE = "DOCENTE", "Docente"
        ESTUDIANTE = "ESTUDIANTE", "Estudiante"

    class PlanCode(models.TextChoices):
        ESTUDIANTE = "ESTUDIANTE", "Plan Estudiante"
        DOCENTE_INDIVIDUAL = "DOCENTE_INDIVIDUAL", "Plan Docente Individual"
        INSTITUCIONAL = "INSTITUCIONAL", "Licencia Institucional"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_memberships",
    )
    product_code = models.CharField(
        max_length=40,
        choices=ProductCode.choices,
        default=ProductCode.EXPERTEDU_STUDIO,
    )
    role = models.CharField(
        max_length=20,
        choices=StudioRole.choices,
    )
    plan_code = models.CharField(
        max_length=32,
        choices=PlanCode.choices,
        default=PlanCode.ESTUDIANTE,
    )
    studio_user_id = models.CharField(max_length=64, blank=True, default="")
    is_active = models.BooleanField(default=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "product_code")
        ordering = ["-enrolled_at"]
        verbose_name = "Membresía de producto"
        verbose_name_plural = "Membresías de productos"

    def __str__(self) -> str:
        return (
            f"{self.user.username} - {self.get_product_code_display()} "
            f"[{self.get_role_display()} / {self.get_plan_code_display()}]"
        )


class CorporateSessionToken(models.Model):
    """Bearer session token for the corporate portal."""

    key = models.CharField(max_length=80, primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="corporate_tokens",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def issue_for_user(cls, user) -> "CorporateSessionToken":
        days = getattr(settings, "CORPORATE_SESSION_DAYS", 7)
        return cls.objects.create(
            key=secrets.token_urlsafe(36),
            user=user,
            expires_at=timezone.now() + timezone.timedelta(days=days),
        )

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at
