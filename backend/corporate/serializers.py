"""Serializers and validation logic for corporate contact and support APIs."""

import re
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import (
    ChatbotKnowledgeEntry,
    ContactInquiry,
    CustomerProductMembership,
    CustomerProfile,
    EmailVerificationCode,
    SupportTicket,
)

User = get_user_model()

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


class SendVerificationCodeSerializer(serializers.Serializer):
    """Validates email before dispatching a temporary 6-digit OTP code."""

    email = serializers.EmailField(max_length=180)

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Ya existe una cuenta registrada con este correo electrónico."
            )
        return email


class VerifyEmailCodeSerializer(serializers.Serializer):
    """Validates the 6-digit OTP code entered by the registering customer."""

    email = serializers.EmailField(max_length=180)
    code = serializers.RegexField(regex=r"^\d{6}$", max_length=6, min_length=6)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        code = attrs["code"].strip()

        record = (
            EmailVerificationCode.objects.filter(email__iexact=email)
            .order_by("-created_at")
            .first()
        )
        if not record:
            raise serializers.ValidationError(
                {"code": "No se ha solicitado un código para este correo."}
            )
        if record.is_expired():
            raise serializers.ValidationError(
                {"code": "El código temporal ha expirado. Solicita uno nuevo."}
            )
        if record.attempts >= 5:
            raise serializers.ValidationError(
                {"code": "Se superó el número máximo de intentos. Solicita un código nuevo."}
            )
        if record.code != code:
            record.attempts += 1
            record.save(update_fields=["attempts"])
            raise serializers.ValidationError(
                {"code": "El código ingresado es incorrecto."}
            )

        record.is_verified = True
        record.save(update_fields=["is_verified"])
        attrs["email"] = email
        attrs["record"] = record
        return attrs


class CustomerRegisterSerializer(serializers.Serializer):
    """Completes customer registration requiring verified OTP and 2 legal checks."""

    email = serializers.EmailField(max_length=180)
    verification_token = serializers.UUIDField()
    username = serializers.RegexField(
        regex=r"^[a-zA-Z0-9._-]{4,40}$",
        max_length=40,
        error_messages={
            "invalid": (
                "El usuario debe tener entre 4 y 40 caracteres "
                "(letras, números, punto, guion o guion bajo)."
            )
        },
    )
    full_name = serializers.CharField(max_length=150)
    organization = serializers.CharField(max_length=160, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    confirm_password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    privacy_accepted = serializers.BooleanField()
    terms_accepted = serializers.BooleanField()

    def validate_username(self, value: str) -> str:
        username = value.strip()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return username

    def validate_full_name(self, value: str) -> str:
        return validate_clean_text(value, "El nombre completo", 3)

    def validate_organization(self, value: str) -> str:
        cleaned = value.strip()
        if cleaned and DISPOSABLE_OR_INVALID_PATTERN.search(cleaned):
            raise serializers.ValidationError("La organización contiene caracteres no permitidos.")
        return cleaned

    def validate_privacy_accepted(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError(
                "Debes aceptar la Política de Privacidad para registrarte."
            )
        return value

    def validate_terms_accepted(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError(
                "Debes aceptar los Términos y Condiciones de Uso para registrarte."
            )
        return value

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "Ya existe una cuenta registrada con este correo."}
            )
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Las contraseñas no coinciden."}
            )

        otp = EmailVerificationCode.objects.filter(
            email__iexact=email,
            verification_token=attrs["verification_token"],
            is_verified=True,
        ).first()
        if not otp or otp.is_expired():
            raise serializers.ValidationError(
                {"verification_token": "Debes verificar tu correo con el código temporal vigente."}
            )

        attrs["email"] = email
        return attrs

    def create(self, validated_data):
        now = timezone.now()
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            is_active=True,
        )
        CustomerProfile.objects.create(
            user=user,
            full_name=validated_data["full_name"],
            organization=validated_data.get("organization", ""),
            email_verified=True,
            privacy_accepted=True,
            privacy_accepted_at=now,
            terms_accepted=True,
            terms_accepted_at=now,
        )
        return user


class CustomerLoginSerializer(serializers.Serializer):
    """Authenticates a corporate customer or superadmin by username or email."""

    identifier = serializers.CharField(max_length=180)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs["identifier"].strip()
        password = attrs["password"]

        user = None
        if "@" in identifier:
            matched = User.objects.filter(email__iexact=identifier).first()
            if matched:
                user = authenticate(username=matched.username, password=password)
        if not user:
            user = authenticate(username=identifier, password=password)

        if not user:
            raise serializers.ValidationError("Credenciales inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("Esta cuenta se encuentra desactivada.")

        attrs["user"] = user
        return attrs


class CustomerMembershipSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="get_product_code_display", read_only=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)
    plan_name = serializers.CharField(source="get_plan_code_display", read_only=True)

    class Meta:
        model = CustomerProductMembership
        fields = [
            "id",
            "product_code",
            "product_name",
            "role",
            "role_label",
            "plan_code",
            "plan_name",
            "is_active",
            "enrolled_at",
            "updated_at",
        ]


class StudioEnrollSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=CustomerProductMembership.StudioRole.choices)
    plan_code = serializers.ChoiceField(choices=CustomerProductMembership.PlanCode.choices)


class InboxStatusUpdateSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=20)


class PasswordResetSendCodeSerializer(serializers.Serializer):
    """Validates email for password recovery OTP dispatch."""

    email = serializers.EmailField(max_length=180)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Validates OTP code and new password for password recovery."""

    email = serializers.EmailField(max_length=180)
    code = serializers.RegexField(regex=r"^\d{6}$", max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    confirm_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        code = attrs["code"].strip()

        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Las contraseñas no coinciden."}
            )

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            raise serializers.ValidationError(
                {"code": "Código inválido o usuario no encontrado."}
            )

        record = (
            EmailVerificationCode.objects.filter(email__iexact=email)
            .order_by("-created_at")
            .first()
        )
        if not record or record.is_expired():
            raise serializers.ValidationError(
                {"code": "El código temporal ha expirado. Solicita uno nuevo."}
            )
        if record.attempts >= 5:
            raise serializers.ValidationError(
                {"code": "Se superó el número máximo de intentos. Solicita un código nuevo."}
            )
        if record.code != code:
            record.attempts += 1
            record.save(update_fields=["attempts"])
            raise serializers.ValidationError({"code": "El código ingresado es incorrecto."})

        record.is_verified = True
        record.save(update_fields=["is_verified"])
        attrs["user"] = user
        return attrs


class ChatbotKnowledgeEntrySerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = ChatbotKnowledgeEntry
        fields = [
            "id",
            "title",
            "category",
            "category_label",
            "content",
            "source_filename",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "source_filename", "created_at", "updated_at"]

    def validate_title(self, value: str) -> str:
        return validate_clean_text(value, "El título", 3)

    def validate_content(self, value: str) -> str:
        return validate_clean_text(value, "El contenido", 10)


class ChatbotAskSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=1000)
    history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    def validate_question(self, value: str) -> str:
        return validate_clean_text(value, "La pregunta", 2)
