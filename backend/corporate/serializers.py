"""Serializers and validation logic for corporate contact and support APIs."""

import re
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import ContactInquiry, SupportTicket

DISPOSABLE_OR_INVALID_PATTERN = re.compile(r"[<>]")


def validate_clean_text(value: str, field_label: str, min_length: int) -> str:
    """Trim whitespace, enforce minimum length, and reject angle-bracket markup."""
    cleaned = value.strip()
    if len(cleaned) < min_length:
        raise serializers.ValidationError(
            f"{field_label} debe tener al menos {min_length} caracteres."
        )
    if DISPOSABLE_OR_INVALID_PATTERN.search(cleaned):
        raise serializers.ValidationError(
            f"{field_label} contiene caracteres no permitidos (< o >)."
        )
    return cleaned


class DuplicateSubmissionError(Exception):
    """Raised when an identical submission is detected within the cooldown window."""


class HoneypotSpamError(Exception):
    """Raised when the hidden honeypot field is populated."""


class BaseSubmissionSerializer(serializers.ModelSerializer):
    """Shared validation for honeypot, privacy consent, and text fields."""

    website = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
        help_text="Campo anti-spam; debe permanecer vacío.",
    )

    def validate_website(self, value: str) -> str:
        if value and value.strip():
            raise HoneypotSpamError("Spam submission detected.")
        return ""

    def validate_full_name(self, value: str) -> str:
        return validate_clean_text(value, "El nombre completo", 3)

    def validate_subject(self, value: str) -> str:
        return validate_clean_text(value, "El asunto", 5)

    def validate_organization(self, value: str) -> str:
        cleaned = value.strip()
        if cleaned and DISPOSABLE_OR_INVALID_PATTERN.search(cleaned):
            raise serializers.ValidationError(
                "La organización contiene caracteres no permitidos."
            )
        return cleaned

    def validate_privacy_accepted(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError(
                "Debe aceptar la política de privacidad para enviar la solicitud."
            )
        return value


class ContactInquirySerializer(BaseSubmissionSerializer):
    """Validates and creates corporate contact and demo requests."""

    class Meta:
        model = ContactInquiry
        fields = [
            "id",
            "full_name",
            "email",
            "organization",
            "inquiry_type",
            "subject",
            "message",
            "privacy_accepted",
            "source_page",
            "website",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_message(self, value: str) -> str:
        return validate_clean_text(value, "El mensaje", 15)

    def validate(self, attrs: dict) -> dict:
        email = attrs.get("email", "").lower().strip()
        subject = attrs.get("subject", "").strip()
        attrs["email"] = email

        cutoff = timezone.now() - timedelta(minutes=10)
        if ContactInquiry.objects.filter(
            email__iexact=email,
            subject__iexact=subject,
            created_at__gte=cutoff,
        ).exists():
            raise DuplicateSubmissionError(
                "Ya recibimos una consulta idéntica recientemente. "
                "Por favor aguarde unos minutos antes de reenviar."
            )
        return attrs

    def create(self, validated_data: dict) -> ContactInquiry:
        validated_data.pop("website", None)
        return super().create(validated_data)


class SupportTicketSerializer(BaseSubmissionSerializer):
    """Validates and creates technical support tickets."""

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "reference_code",
            "full_name",
            "email",
            "organization",
            "category",
            "severity",
            "support_level",
            "subject",
            "description",
            "privacy_accepted",
            "status",
            "website",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "reference_code",
            "support_level",
            "status",
            "created_at",
        ]

    def validate_description(self, value: str) -> str:
        return validate_clean_text(value, "La descripción del problema", 20)

    def validate(self, attrs: dict) -> dict:
        email = attrs.get("email", "").lower().strip()
        subject = attrs.get("subject", "").strip()
        attrs["email"] = email

        cutoff = timezone.now() - timedelta(minutes=10)
        if SupportTicket.objects.filter(
            email__iexact=email,
            subject__iexact=subject,
            created_at__gte=cutoff,
        ).exists():
            raise DuplicateSubmissionError(
                "Ya existe un ticket reciente con el mismo asunto para este correo."
            )
        return attrs

    def create(self, validated_data: dict) -> SupportTicket:
        validated_data.pop("website", None)
        category = validated_data.get("category")
        severity = validated_data.get("severity")
        if (
            category == SupportTicket.Category.INFERENCE_ENGINE
            or severity == SupportTicket.Severity.HIGH
        ):
            validated_data["support_level"] = SupportTicket.SupportLevel.L3_ENGINEERING
        else:
            validated_data["support_level"] = SupportTicket.SupportLevel.L2_HELP_DESK
        return super().create(validated_data)


class SupportTicketPublicStatusSerializer(serializers.ModelSerializer):
    """Public-safe status view of a support ticket without exposing sensitive fields."""

    category_label = serializers.CharField(
        source="get_category_display", read_only=True
    )
    severity_label = serializers.CharField(
        source="get_severity_display", read_only=True
    )
    support_level_label = serializers.CharField(
        source="get_support_level_display", read_only=True
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "reference_code",
            "subject",
            "category",
            "category_label",
            "severity",
            "severity_label",
            "support_level",
            "support_level_label",
            "status",
            "status_label",
            "created_at",
            "updated_at",
        ]
