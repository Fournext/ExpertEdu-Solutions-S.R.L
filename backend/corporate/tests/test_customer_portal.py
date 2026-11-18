"""Tests for customer OTP registration, Studio SSO enrollment, and Superadmin KPIs/inbox."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

from corporate.models import ContactInquiry, EmailVerificationCode, SupportTicket

User = get_user_model()


@pytest.mark.django_db
def test_otp_registration_requires_verified_code_and_both_legal_checks():
    client = APIClient()
    email = "cliente.nuevo@universidad.edu.bo"

    # 1. Send OTP code
    send_res = client.post("/api/v1/auth/send-code/", {"email": email}, format="json")
    assert send_res.status_code == 200

    otp = EmailVerificationCode.objects.filter(email=email).first()
    assert otp is not None

    # 2. Wrong code rejected
    bad_verify = client.post(
        "/api/v1/auth/verify-code/",
        {"email": email, "code": "000000" if otp.code != "000000" else "111111"},
        format="json",
    )
    assert bad_verify.status_code == 400

    # 3. Valid code -> returns verification_token
    verify_res = client.post(
        "/api/v1/auth/verify-code/",
        {"email": email, "code": otp.code},
        format="json",
    )
    assert verify_res.status_code == 200
    token = verify_res.json()["data"]["verification_token"]

    # 4. Missing terms_accepted -> 400
    missing_terms = client.post(
        "/api/v1/auth/register/",
        {
            "email": email,
            "verification_token": token,
            "username": "clienteuno",
            "full_name": "Cliente Uno",
            "organization": "Facultad de Ingeniería",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "privacy_accepted": True,
            "terms_accepted": False,
        },
        format="json",
    )
    assert missing_terms.status_code == 400

    # 5. Valid registration with both checks -> 201 + session token + 3 emails
    mail.outbox.clear()
    reg_res = client.post(
        "/api/v1/auth/register/",
        {
            "email": email,
            "verification_token": token,
            "username": "clienteuno",
            "full_name": "Cliente Uno",
            "organization": "Facultad de Ingeniería",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "privacy_accepted": True,
            "terms_accepted": True,
        },
        format="json",
    )
    assert reg_res.status_code == 201
    assert len(mail.outbox) == 3
    assert all(msg.alternatives for msg in mail.outbox)
    session_token = reg_res.json()["data"]["token"]
    assert reg_res.json()["data"]["user"]["is_superadmin"] is False

    # 6. Enroll in ExpertEdu Studio as DOCENTE
    with patch(
        "corporate.views.provision_user_in_studio",
        return_value={
            "studio_user": {"id": 42, "roles": ["Docente"]},
            "sso_url": "https://expertedu-studio.fournext.website/sso-callback#access=a&refresh=r",
        },
    ):
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {session_token}")
        enroll_res = client.post(
            "/api/v1/products/studio/enroll/",
            {"role": "DOCENTE", "plan_code": "DOCENTE_INDIVIDUAL"},
            format="json",
        )
    assert enroll_res.status_code == 200
    assert enroll_res.json()["data"]["membership"]["role"] == "DOCENTE"
    assert enroll_res.json()["data"]["membership"]["plan_code"] == "DOCENTE_INDIVIDUAL"


@pytest.mark.django_db
def test_superadmin_dashboard_kpis_and_two_inboxes():
    admin = User.objects.create_superuser(
        username="superadmin",
        email="admin@expertedu.bo",
        password="SuperPassword123!",
    )
    ContactInquiry.objects.create(
        full_name="Docente Demo",
        email="docente@u.edu.bo",
        inquiry_type="DEMO",
        subject="Demo institucional",
        message="Solicitamos una demo para nuestra facultad.",
        privacy_accepted=True,
        target_inbox="contacto@expertedu.bo",
    )
    SupportTicket.objects.create(
        full_name="Soporte Usuario",
        email="usuario@u.edu.bo",
        category="ACCESS",
        severity="MEDIUM",
        subject="Problema de acceso",
        description="No puedo ingresar con mi cuenta docente.",
        privacy_accepted=True,
        target_inbox="soporte@expertedu.bo",
    )

    client = APIClient()
    login_res = client.post(
        "/api/v1/auth/login/",
        {"identifier": admin.email, "password": "SuperPassword123!"},
        format="json",
    )
    assert login_res.status_code == 200
    assert login_res.json()["data"]["user"]["is_superadmin"] is True
    token = login_res.json()["data"]["token"]

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    overview_res = client.get("/api/v1/superadmin/overview/")
    assert overview_res.status_code == 200
    assert "kpis" in overview_res.json()["data"]

    inbox_res = client.get("/api/v1/superadmin/inbox/")
    assert inbox_res.status_code == 200
    inbox_data = inbox_res.json()["data"]
    assert len(inbox_data["commercial_messages"]) == 1
    assert len(inbox_data["support_messages"]) == 1

    # Filter KPIs by service
    filtered_ov = client.get("/api/v1/superadmin/overview/?product_code=EXPERTEDU_STUDIO")
    assert filtered_ov.status_code == 200
    assert filtered_ov.json()["data"]["selected_product"] == "EXPERTEDU_STUDIO"

    # Admin loads chatbot knowledge entry
    kb_res = client.post(
        "/api/v1/superadmin/chatbot-knowledge/",
        {
            "title": "Horarios de atención institucional",
            "category": "SOPORTE",
            "content": "Atendemos demostraciones institucionales previa coordinación por correo.",
            "is_active": True,
        },
        format="json",
    )
    assert kb_res.status_code == 201

    # Public chatbot (anonymous) answers using loaded knowledge
    public_client = APIClient()
    chat_res = public_client.post(
        "/api/v1/chatbot/ask/",
        {"question": "¿Cuáles son los horarios de atención?"},
        format="json",
    )
    assert chat_res.status_code == 200
    assert chat_res.json()["data"]["sources_count"] >= 1
