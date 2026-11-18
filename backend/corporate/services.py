"""Notification and privacy-preserving utility services."""

import hashlib
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import send_mail

from .models import ContactInquiry, CustomerProductMembership, SupportTicket

logger = logging.getLogger(__name__)


def hash_client_ip(request) -> str:
    """Hash client IP for privacy-respecting audit/anti-abuse checks."""
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    raw_ip = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else request.META.get("REMOTE_ADDR", "")
    )
    if not raw_ip:
        return ""
    return hashlib.sha256(
        f"{raw_ip}:{settings.SECRET_KEY[:16]}".encode("utf-8")
    ).hexdigest()


def send_contact_notification(inquiry: ContactInquiry) -> bool:
    """Send an internal email notification when SMTP/console backend is active."""
    recipient = settings.CONTACT_NOTIFICATION_EMAIL
    if not recipient:
        return False

    subject = (
        f"[ExpertEdu Web] {inquiry.get_inquiry_type_display()}: {inquiry.subject}"
    )
    body = (
        f"Nueva consulta recibida desde {inquiry.source_page}\n\n"
        f"Nombre: {inquiry.full_name}\n"
        f"Correo: {inquiry.email}\n"
        f"Organización: {inquiry.organization or 'No especificada'}\n"
        f"Tipo: {inquiry.get_inquiry_type_display()}\n"
        f"Asunto: {inquiry.subject}\n\n"
        f"Mensaje:\n{inquiry.message}\n"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception(
            "Failed to send contact notification for inquiry %s", inquiry.id
        )
        return False


def send_support_notification(ticket: SupportTicket) -> bool:
    """Send an internal email notification for a newly registered support ticket."""
    recipient = settings.SUPPORT_NOTIFICATION_EMAIL
    if not recipient:
        return False

    subject = (
        f"[ExpertEdu Soporte] {ticket.reference_code} "
        f"[{ticket.get_severity_display()}] {ticket.subject}"
    )
    body = (
        f"Nuevo ticket de soporte registrado\n\n"
        f"Referencia: {ticket.reference_code}\n"
        f"Nivel asignado: {ticket.get_support_level_display()}\n"
        f"Categoría: {ticket.get_category_display()}\n"
        f"Severidad: {ticket.get_severity_display()}\n"
        f"Solicitante: {ticket.full_name} ({ticket.email})\n"
        f"Organización: {ticket.organization or 'No especificada'}\n\n"
        f"Descripción:\n{ticket.description}\n"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception(
            "Failed to send support notification for ticket %s",
            ticket.reference_code,
        )
        return False


def send_verification_code_email(email: str, code: str) -> bool:
    """Send a temporary 6-digit verification code to a registering customer."""
    minutes = getattr(settings, "OTP_EXPIRY_MINUTES", 10)
    subject = "[ExpertEdu] Código temporal de verificación de correo"
    body = (
        f"Hola,\n\n"
        f"Tu código temporal de verificación para registrarte en ExpertEdu es:\n\n"
        f"    {code}\n\n"
        f"Este código expira en {minutes} minutos. "
        f"Si no solicitaste este registro, puedes ignorar este correo.\n"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send OTP verification code to %s", email)
        return False


def provision_user_in_studio(user, role_code: str) -> dict:
    """
    Call ExpertEdu Studio internal provisioning API to create/sync the user
    with the selected role (Docente or Estudiante) and return SSO tokens.
    """
    studio_role = (
        "Docente"
        if role_code == CustomerProductMembership.StudioRole.DOCENTE
        else "Estudiante"
    )
    profile = getattr(user, "customer_profile", None)
    full_name = profile.full_name if profile else (user.get_full_name() or user.username)

    payload = json.dumps(
        {
            "username": user.username,
            "email": user.email,
            "nombre_completo": full_name,
            "rol": studio_role,
        }
    ).encode("utf-8")

    endpoint = f"{settings.STUDIO_API_BASE_URL}/auth/registro-corporativo/"
    req = urllib.request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Studio-Service-Key": settings.STUDIO_SERVICE_KEY,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.error("Studio provisioning HTTP %s: %s", exc.code, detail)
        raise RuntimeError(
            "ExpertEdu Studio rechazó el aprovisionamiento de usuario."
        ) from exc
    except Exception as exc:
        logger.exception("Failed connecting to ExpertEdu Studio at %s", endpoint)
        raise RuntimeError(
            "No fue posible comunicarse con ExpertEdu Studio en este momento."
        ) from exc

    data = parsed.get("data", parsed)
    access = data.get("access")
    refresh = data.get("refresh")
    studio_user = data.get("user", {})
    if not access or not refresh:
        raise RuntimeError("ExpertEdu Studio no devolvió tokens de sesión válidos.")

    sso_url = (
        f"{settings.STUDIO_PUBLIC_URL}/sso-callback"
        f"#access={access}&refresh={refresh}"
    )
    return {
        "studio_user": studio_user,
        "sso_url": sso_url,
    }
