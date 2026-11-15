"""REST API views for health, contact inquiries, and support tickets."""

from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportTicket
from .serializers import (
    ContactInquirySerializer,
    DuplicateSubmissionError,
    HoneypotSpamError,
    SupportTicketPublicStatusSerializer,
    SupportTicketSerializer,
)
from .services import (
    hash_client_ip,
    send_contact_notification,
    send_support_notification,
)
from .throttling import ContactRateThrottle, SupportRateThrottle


class HealthCheckView(APIView):
    """Verifies service liveness and database connectivity."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request) -> Response:
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            db_ok = False

        http_status = (
            status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return Response(
            {
                "status": "ok" if db_ok else "degraded",
                "service": "expertedu-corporate-api",
                "database": "connected" if db_ok else "unavailable",
                "timestamp": timezone.now().isoformat(),
            },
            status=http_status,
        )


class ContactInquiryCreateView(APIView):
    """Receives and persists validated contact and demo requests."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request) -> Response:
        serializer = ContactInquirySerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except HoneypotSpamError:
            return Response(
                {
                    "success": False,
                    "message": "No fue posible procesar la solicitud.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DuplicateSubmissionError as exc:
            return Response(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=status.HTTP_409_CONFLICT,
            )

        inquiry = serializer.save(ip_hash=hash_client_ip(request))
        notified = send_contact_notification(inquiry)

        return Response(
            {
                "success": True,
                "message": (
                    "Hemos recibido su solicitud correctamente. "
                    "Nuestro equipo se pondrá en contacto a la brevedad."
                ),
                "data": {
                    "id": str(inquiry.id),
                    "inquiry_type": inquiry.inquiry_type,
                    "created_at": inquiry.created_at.isoformat(),
                    "email_dispatched": notified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class SupportTicketCreateView(APIView):
    """Registers technical support incidents and returns a tracking reference."""

    permission_classes = [AllowAny]
    throttle_classes = [SupportRateThrottle]

    def post(self, request) -> Response:
        serializer = SupportTicketSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except HoneypotSpamError:
            return Response(
                {
                    "success": False,
                    "message": "No fue posible registrar el ticket.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DuplicateSubmissionError as exc:
            return Response(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=status.HTTP_409_CONFLICT,
            )

        ticket = serializer.save(ip_hash=hash_client_ip(request))
        notified = send_support_notification(ticket)

        return Response(
            {
                "success": True,
                "message": (
                    "Ticket de soporte registrado correctamente. "
                    "Conserve su código de referencia para seguimiento."
                ),
                "data": {
                    "reference_code": ticket.reference_code,
                    "support_level": ticket.support_level,
                    "support_level_label": ticket.get_support_level_display(),
                    "status": ticket.status,
                    "created_at": ticket.created_at.isoformat(),
                    "email_dispatched": notified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class SupportTicketStatusView(APIView):
    """Allows a requester to check ticket status using reference code + email."""

    permission_classes = [AllowAny]
    throttle_classes = [SupportRateThrottle]

    def get(self, request, reference_code: str) -> Response:
        email = request.query_params.get("email", "").strip().lower()
        if not email:
            return Response(
                {
                    "success": False,
                    "message": "Debe proporcionar el correo asociado al ticket.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket = SupportTicket.objects.filter(
            reference_code__iexact=reference_code.strip(),
            email__iexact=email,
        ).first()

        if ticket is None:
            return Response(
                {
                    "success": False,
                    "message": "No se encontró un ticket con esa referencia y correo.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "data": SupportTicketPublicStatusSerializer(ticket).data,
            },
            status=status.HTTP_200_OK,
        )
