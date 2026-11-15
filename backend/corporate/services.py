"""Notification and privacy-preserving utility services."""

import hashlib
import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import ContactInquiry, SupportTicket

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
