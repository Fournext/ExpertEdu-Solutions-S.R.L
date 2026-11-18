"""REST API views for health, contact inquiries, and support tickets."""

import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ChatbotKnowledgeEntry,
    ContactInquiry,
    CorporateSessionToken,
    CustomerProductMembership,
    EmailVerificationCode,
    SupportTicket,
)
from .serializers import (
    ChatbotAskSerializer,
    ChatbotKnowledgeEntrySerializer,
    ContactInquirySerializer,
    CustomerLoginSerializer,
    CustomerMembershipSerializer,
    CustomerRegisterSerializer,
    DuplicateSubmissionError,
    HoneypotSpamError,
    InboxReplySerializer,
    InboxStatusUpdateSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSendCodeSerializer,
    SendVerificationCodeSerializer,
    StudioEnrollSerializer,
    SupportTicketPublicStatusSerializer,
    SupportTicketSerializer,
    VerifyEmailCodeSerializer,
)
from .services import (
    ask_corporate_chatbot,
    convert_uploaded_document_to_markdown,
    hash_client_ip,
    provision_user_in_studio,
    send_contact_notification,
    send_inbox_reply_email,
    send_password_reset_code_email,
    send_registration_emails,
    send_support_notification,
    send_verification_code_email,
    split_markdown_into_chunks,
)
from .throttling import ContactRateThrottle, SupportRateThrottle

User = get_user_model()


def _serialize_user_payload(user) -> dict:
    profile = getattr(user, "customer_profile", None)
    memberships = CustomerProductMembership.objects.filter(user=user, is_active=True)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": profile.full_name if profile else (user.get_full_name() or user.username),
        "organization": profile.organization if profile else "",
        "email_verified": profile.email_verified if profile else bool(user.is_superuser),
        "is_superadmin": bool(user.is_superuser),
        "memberships": CustomerMembershipSerializer(memberships, many=True).data,
    }


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

        inquiry = serializer.save(
            ip_hash=hash_client_ip(request),
            target_inbox=settings.CONTACT_NOTIFICATION_EMAIL,
        )
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

        ticket = serializer.save(
            ip_hash=hash_client_ip(request),
            target_inbox=settings.SUPPORT_NOTIFICATION_EMAIL,
        )
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


class SendVerificationCodeView(APIView):
    """Generates and emails a 6-digit temporary verification code."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request) -> Response:
        serializer = SendVerificationCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        code = f"{secrets.randbelow(900000) + 100000}"
        expiry_minutes = getattr(settings, "OTP_EXPIRY_MINUTES", 10)
        EmailVerificationCode.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
        )
        sent = send_verification_code_email(email, code)

        return Response(
            {
                "success": True,
                "message": (
                    f"Enviamos un código temporal a {email}. "
                    f"Tiene una validez de {expiry_minutes} minutos."
                ),
                "data": {"email": email, "email_dispatched": sent},
            },
            status=status.HTTP_200_OK,
        )


class VerifyEmailCodeView(APIView):
    """Validates the 6-digit OTP code and returns verification_token."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request) -> Response:
        serializer = VerifyEmailCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.validated_data["record"]
        return Response(
            {
                "success": True,
                "message": (
                    "Correo verificado correctamente. "
                    "Ya puedes crear tu usuario y contraseña."
                ),
                "data": {
                    "email": serializer.validated_data["email"],
                    "verification_token": str(record.verification_token),
                },
            },
            status=status.HTTP_200_OK,
        )


class CustomerRegisterView(APIView):
    """Registers a new corporate customer after OTP verification and 2 legal checks."""

    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        serializer = CustomerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = CorporateSessionToken.issue_for_user(user)
        send_registration_emails(user)

        return Response(
            {
                "success": True,
                "message": "Cuenta registrada correctamente.",
                "data": {
                    "token": token.key,
                    "user": _serialize_user_payload(user),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerLoginView(APIView):
    """Logs in a corporate customer or superadmin and returns a session token."""

    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        serializer = CustomerLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token = CorporateSessionToken.issue_for_user(user)

        return Response(
            {
                "success": True,
                "message": "Inicio de sesión exitoso.",
                "data": {
                    "token": token.key,
                    "user": _serialize_user_payload(user),
                },
            },
            status=status.HTTP_200_OK,
        )


class CustomerLogoutView(APIView):
    """Invalidates the current corporate session token."""

    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        if isinstance(request.auth, CorporateSessionToken):
            request.auth.delete()
        return Response(
            {"success": True, "message": "Sesión cerrada correctamente."},
            status=status.HTTP_200_OK,
        )


class CustomerMeView(APIView):
    """Returns current user profile, memberships (product, plan, role), and superadmin flag."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        return Response(
            {"success": True, "data": _serialize_user_payload(request.user)},
            status=status.HTTP_200_OK,
        )


class StudioEnrollView(APIView):
    """Enrolls/updates the customer in ExpertEdu Studio with chosen role and plan via Studio API."""

    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        serializer = StudioEnrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data["role"]
        plan_code = serializer.validated_data["plan_code"]

        try:
            studio_result = provision_user_in_studio(request.user, role)
        except RuntimeError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        studio_user_id = str(studio_result["studio_user"].get("id", ""))
        membership, _ = CustomerProductMembership.objects.update_or_create(
            user=request.user,
            product_code=CustomerProductMembership.ProductCode.EXPERTEDU_STUDIO,
            defaults={
                "role": role,
                "plan_code": plan_code,
                "studio_user_id": studio_user_id,
                "is_active": True,
            },
        )

        return Response(
            {
                "success": True,
                "message": (
                    f"Cuenta activada en ExpertEdu Studio como "
                    f"{membership.get_role_display()} ({membership.get_plan_code_display()})."
                ),
                "data": {
                    "membership": CustomerMembershipSerializer(membership).data,
                    "sso_url": studio_result["sso_url"],
                    "user": _serialize_user_payload(request.user),
                },
            },
            status=status.HTTP_200_OK,
        )


class StudioLaunchView(APIView):
    """Generates a fresh SSO launch URL for an enrolled customer or superadmin."""

    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        if request.user.is_superuser:
            try:
                studio_result = provision_user_in_studio(request.user, "ADMIN")
            except RuntimeError as exc:
                return Response(
                    {"success": False, "message": str(exc)},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            return Response(
                {
                    "success": True,
                    "data": {
                        "sso_url": studio_result["sso_url"],
                        "membership": None,
                    },
                },
                status=status.HTTP_200_OK,
            )

        membership = CustomerProductMembership.objects.filter(
            user=request.user,
            product_code=CustomerProductMembership.ProductCode.EXPERTEDU_STUDIO,
            is_active=True,
        ).first()
        if not membership:
            return Response(
                {
                    "success": False,
                    "message": "Primero debes elegir tu rol (Docente o Estudiante) y plan.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            studio_result = provision_user_in_studio(request.user, membership.role)
        except RuntimeError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "success": True,
                "data": {
                    "sso_url": studio_result["sso_url"],
                    "membership": CustomerMembershipSerializer(membership).data,
                },
            },
            status=status.HTTP_200_OK,
        )


def _require_superadmin(request):
    if not request.user or not request.user.is_superuser:
        return Response(
            {"success": False, "message": "Acceso restringido a superadministradores."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


class SuperAdminOverviewView(APIView):
    """Returns KPIs by product, plan, and role plus the full customer/membership directory."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied

        product_filter = request.query_params.get("product_code", "ALL").strip().upper()
        total_customers = User.objects.filter(is_superuser=False).count()
        active_memberships = CustomerProductMembership.objects.filter(is_active=True)
        if product_filter and product_filter != "ALL":
            active_memberships = active_memberships.filter(product_code=product_filter)

        by_product = list(
            active_memberships.values("product_code").annotate(total=Count("id"))
        )
        by_plan = list(
            active_memberships.values("plan_code").annotate(total=Count("id"))
        )
        by_role = list(
            active_memberships.values("role").annotate(total=Count("id"))
        )

        customers_qs = (
            User.objects.filter(is_superuser=False)
            .select_related("customer_profile")
            .prefetch_related("product_memberships")
            .order_by("-date_joined")[:200]
        )
        customers = []
        for u in customers_qs:
            prof = getattr(u, "customer_profile", None)
            all_memberships = list(u.product_memberships.all())
            if product_filter and product_filter != "ALL":
                if not any(m.product_code == product_filter for m in all_memberships):
                    continue
            memberships = [
                CustomerMembershipSerializer(m).data
                for m in all_memberships
            ]
            customers.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "full_name": prof.full_name if prof else (u.get_full_name() or u.username),
                    "organization": prof.organization if prof else "",
                    "date_joined": u.date_joined.isoformat(),
                    "memberships": memberships,
                }
            )

        available_products = [
            {"code": code, "label": label}
            for code, label in CustomerProductMembership.ProductCode.choices
        ]

        return Response(
            {
                "success": True,
                "data": {
                    "selected_product": product_filter or "ALL",
                    "available_products": available_products,
                    "kpis": {
                        "total_customers": total_customers,
                        "total_active_subscriptions": active_memberships.count(),
                        "by_product": by_product,
                        "by_plan": by_plan,
                        "by_role": by_role,
                    },
                    "customers": customers,
                },
            },
            status=status.HTTP_200_OK,
        )


class SuperAdminInboxView(APIView):
    """Returns messages received in both corporate mailboxes (commercial + support)."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied

        commercial_items = [
            {
                "id": str(item.id),
                "item_type": "contact",
                "full_name": item.full_name,
                "email": item.email,
                "organization": item.organization,
                "category": item.inquiry_type,
                "category_label": item.get_inquiry_type_display(),
                "subject": item.subject,
                "body": item.message,
                "status": item.status,
                "status_label": item.get_status_display(),
                "target_inbox": item.target_inbox or settings.CONTACT_NOTIFICATION_EMAIL,
                "created_at": item.created_at.isoformat(),
            }
            for item in ContactInquiry.objects.all()[:100]
        ]

        support_items = [
            {
                "id": str(item.id),
                "item_type": "support",
                "reference_code": item.reference_code,
                "full_name": item.full_name,
                "email": item.email,
                "organization": item.organization,
                "category": item.category,
                "category_label": item.get_category_display(),
                "severity": item.severity,
                "support_level_label": item.get_support_level_display(),
                "subject": item.subject,
                "body": item.description,
                "status": item.status,
                "status_label": item.get_status_display(),
                "target_inbox": item.target_inbox or settings.SUPPORT_NOTIFICATION_EMAIL,
                "created_at": item.created_at.isoformat(),
            }
            for item in SupportTicket.objects.all()[:100]
        ]

        return Response(
            {
                "success": True,
                "data": {
                    "mailboxes": {
                        "commercial": settings.CONTACT_NOTIFICATION_EMAIL,
                        "support": settings.SUPPORT_NOTIFICATION_EMAIL,
                    },
                    "commercial_messages": commercial_items,
                    "support_messages": support_items,
                },
            },
            status=status.HTTP_200_OK,
        )


class SuperAdminInboxStatusView(APIView):
    """Updates status for a contact inquiry or support ticket from Superadmin."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, item_type: str, item_id: str) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied

        serializer = InboxStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        if item_type == "contact":
            valid = {choice[0] for choice in ContactInquiry.Status.choices}
            if new_status not in valid:
                return Response(
                    {"success": False, "message": "Estado inválido para consulta."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            obj = ContactInquiry.objects.filter(id=item_id).first()
            if not obj:
                return Response(
                    {"success": False, "message": "Mensaje no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            obj.status = new_status
            obj.save(update_fields=["status", "updated_at"])
            return Response(
                {
                    "success": True,
                    "data": {"id": str(obj.id), "status": obj.status},
                }
            )

        if item_type == "support":
            valid = {choice[0] for choice in SupportTicket.Status.choices}
            if new_status not in valid:
                return Response(
                    {"success": False, "message": "Estado inválido para ticket."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            obj = SupportTicket.objects.filter(id=item_id).first()
            if not obj:
                return Response(
                    {"success": False, "message": "Ticket no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            obj.status = new_status
            obj.save(update_fields=["status", "updated_at"])
            return Response(
                {
                    "success": True,
                    "data": {"id": str(obj.id), "status": obj.status},
                }
            )

        return Response(
            {"success": False, "message": "Tipo de buzón inválido."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class SuperAdminInboxReplyView(APIView):
    """Sends an email reply from Superadmin to a contact inquiry or support ticket."""

    permission_classes = [IsAuthenticated]

    def post(self, request, item_type: str, item_id: str) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied

        serializer = InboxReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply_subject = serializer.validated_data.get("subject", "")
        reply_message = serializer.validated_data["message"]

        if item_type == "contact":
            obj = ContactInquiry.objects.filter(id=item_id).first()
            if not obj:
                return Response(
                    {"success": False, "message": "Mensaje no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            mailbox = obj.target_inbox or settings.CONTACT_NOTIFICATION_EMAIL
            sent = send_inbox_reply_email(
                recipient_email=obj.email,
                recipient_name=obj.full_name,
                subject=reply_subject,
                reply_body=reply_message,
                original_subject=obj.subject,
                original_body=obj.message,
                mailbox_email=mailbox,
            )
            if not sent:
                return Response(
                    {
                        "success": False,
                        "message": "No se pudo enviar el correo de respuesta. Revisa la configuración SMTP.",
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            if obj.status in {ContactInquiry.Status.NEW, ContactInquiry.Status.IN_REVIEW}:
                obj.status = ContactInquiry.Status.RESPONDED
                obj.save(update_fields=["status", "updated_at"])
            return Response(
                {
                    "success": True,
                    "message": f"Respuesta enviada a {obj.email}.",
                    "data": {
                        "id": str(obj.id),
                        "status": obj.status,
                        "status_label": obj.get_status_display(),
                    },
                },
                status=status.HTTP_200_OK,
            )

        if item_type == "support":
            obj = SupportTicket.objects.filter(id=item_id).first()
            if not obj:
                return Response(
                    {"success": False, "message": "Ticket no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            mailbox = obj.target_inbox or settings.SUPPORT_NOTIFICATION_EMAIL
            sent = send_inbox_reply_email(
                recipient_email=obj.email,
                recipient_name=obj.full_name,
                subject=reply_subject,
                reply_body=reply_message,
                original_subject=obj.subject,
                original_body=obj.description,
                mailbox_email=mailbox,
                reference_code=obj.reference_code,
            )
            if not sent:
                return Response(
                    {
                        "success": False,
                        "message": "No se pudo enviar el correo de respuesta. Revisa la configuración SMTP.",
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            if obj.status == SupportTicket.Status.OPEN:
                obj.status = SupportTicket.Status.IN_PROGRESS
                obj.save(update_fields=["status", "updated_at"])
            return Response(
                {
                    "success": True,
                    "message": f"Respuesta enviada a {obj.email}.",
                    "data": {
                        "id": str(obj.id),
                        "status": obj.status,
                        "status_label": obj.get_status_display(),
                    },
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"success": False, "message": "Tipo de buzón inválido."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class PasswordResetSendCodeView(APIView):
    """Sends a 6-digit password reset code if an active account exists."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request) -> Response:
        serializer = PasswordResetSendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            code = f"{secrets.randbelow(900000) + 100000}"
            expiry_minutes = getattr(settings, "OTP_EXPIRY_MINUTES", 10)
            EmailVerificationCode.objects.create(
                email=email,
                code=code,
                expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
            )
            send_password_reset_code_email(email, code)

        return Response(
            {
                "success": True,
                "message": (
                    "Si el correo está registrado, enviamos un código temporal "
                    "para restablecer tu contraseña."
                ),
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Resets password after OTP verification and syncs hash to Studio if enrolled."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        new_password = serializer.validated_data["new_password"]

        user.set_password(new_password)
        user.save(update_fields=["password"])
        CorporateSessionToken.objects.filter(user=user).delete()

        membership = CustomerProductMembership.objects.filter(
            user=user,
            product_code=CustomerProductMembership.ProductCode.EXPERTEDU_STUDIO,
            is_active=True,
        ).first()
        if membership:
            try:
                provision_user_in_studio(user, membership.role)
            except RuntimeError:
                pass

        return Response(
            {
                "success": True,
                "message": (
                    "Contraseña actualizada correctamente. "
                    "Ya puedes iniciar sesión con tu nueva contraseña."
                ),
            },
            status=status.HTTP_200_OK,
        )


class PublicChatbotAskView(APIView):
    """Public Gemini-powered corporate chatbot grounded in admin-managed knowledge."""

    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request) -> Response:
        serializer = ChatbotAskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = ask_corporate_chatbot(
            question=serializer.validated_data["question"],
            history=serializer.validated_data.get("history", []),
        )
        return Response({"success": True, "data": result}, status=status.HTTP_200_OK)


class SuperAdminChatbotKnowledgeListCreateView(APIView):
    """Lists and creates chatbot knowledge entries from the Superadmin portal."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied
        entries = ChatbotKnowledgeEntry.objects.all()
        return Response(
            {
                "success": True,
                "data": ChatbotKnowledgeEntrySerializer(entries, many=True).data,
            }
        )

    def post(self, request) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied
        serializer = ChatbotKnowledgeEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(
            {"success": True, "data": ChatbotKnowledgeEntrySerializer(entry).data},
            status=status.HTTP_201_CREATED,
        )


class SuperAdminChatbotKnowledgeDetailView(APIView):
    """Updates or deletes a chatbot knowledge entry from the Superadmin portal."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, entry_id: str) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied
        entry = ChatbotKnowledgeEntry.objects.filter(id=entry_id).first()
        if not entry:
            return Response(
                {"success": False, "message": "Registro no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ChatbotKnowledgeEntrySerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(
            {"success": True, "data": ChatbotKnowledgeEntrySerializer(entry).data}
        )

    def delete(self, request, entry_id: str) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied
        entry = ChatbotKnowledgeEntry.objects.filter(id=entry_id).first()
        if not entry:
            return Response(
                {"success": False, "message": "Registro no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        entry.delete()
        return Response({"success": True}, status=status.HTTP_200_OK)


class SuperAdminChatbotDocumentUploadView(APIView):
    """Accepts a document upload, converts it internally to Markdown, and stores it."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request) -> Response:
        denied = _require_superadmin(request)
        if denied:
            return denied

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"success": False, "message": "Debes seleccionar un archivo para subir."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        category = str(request.data.get("category", ChatbotKnowledgeEntry.Category.OTRO)).strip()
        valid_categories = {c[0] for c in ChatbotKnowledgeEntry.Category.choices}
        if category not in valid_categories:
            category = ChatbotKnowledgeEntry.Category.OTRO

        raw_title = str(request.data.get("title", "")).strip()
        default_title = os.path.splitext(uploaded_file.name)[0].replace("_", " ").replace("-", " ")
        title = (raw_title or default_title or "Documento cargado")[:160]

        try:
            markdown_content = convert_uploaded_document_to_markdown(uploaded_file)
        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chunks = split_markdown_into_chunks(markdown_content)
        total_parts = len(chunks)
        created_entries = []
        for idx, chunk in enumerate(chunks, start=1):
            part_title = (
                title
                if total_parts == 1
                else f"{title[:135]} (Parte {idx}/{total_parts})"
            )
            created_entries.append(
                ChatbotKnowledgeEntry.objects.create(
                    title=part_title,
                    category=category,
                    content=chunk,
                    source_filename=uploaded_file.name[:255],
                    is_active=True,
                )
            )

        serialized = ChatbotKnowledgeEntrySerializer(created_entries, many=True).data
        msg = (
            "Documento convertido a Markdown y guardado en la base del chatbot."
            if total_parts == 1
            else f"Documento convertido a Markdown y dividido en {total_parts} partes buscables."
        )
        return Response(
            {
                "success": True,
                "message": msg,
                "parts_count": total_parts,
                "data": serialized[0],
                "entries": serialized,
            },
            status=status.HTTP_201_CREATED,
        )
