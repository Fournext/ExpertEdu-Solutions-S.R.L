"""Automated tests for ExpertEdu corporate API (unit, endpoint, security, persistence)."""

import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from corporate.models import ContactInquiry, SupportTicket


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    """Ensure DRF throttle cache is clean between tests."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.mark.django_db
def test_health_endpoint_returns_ok(api_client: APIClient) -> None:
    response = api_client.get("/api/v1/health/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"
    assert body["service"] == "expertedu-corporate-api"


@pytest.mark.django_db
def test_create_contact_inquiry_persists_and_returns_201(api_client: APIClient) -> None:
    payload = {
        "full_name": "Dra. Laura Mendoza",
        "email": "laura.mendoza@universidad.edu.bo",
        "organization": "Facultad de Ingeniería",
        "inquiry_type": "DEMO",
        "subject": "Solicitud de demostración para cátedra de IA",
        "message": "Deseamos coordinar una demostración de ExpertEdu Studio para 60 estudiantes.",
        "privacy_accepted": True,
        "source_page": "/universidades",
        "website": "",
    }
    response = api_client.post("/api/v1/contact/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["success"] is True
    assert "id" in body["data"]
    assert ContactInquiry.objects.count() == 1
    inquiry = ContactInquiry.objects.first()
    assert inquiry is not None
    assert inquiry.email == "laura.mendoza@universidad.edu.bo"
    assert inquiry.inquiry_type == ContactInquiry.InquiryType.DEMO


@pytest.mark.django_db
def test_contact_validation_rejects_missing_privacy_and_bad_email(
    api_client: APIClient,
) -> None:
    payload = {
        "full_name": "Carlos",
        "email": "correo-invalido",
        "inquiry_type": "GENERAL",
        "subject": "Consulta",
        "message": "Mensaje suficientemente largo para pasar longitud mínima.",
        "privacy_accepted": False,
    }
    response = api_client.post("/api/v1/contact/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    errors = response.json()
    assert "email" in errors
    assert "privacy_accepted" in errors
    assert ContactInquiry.objects.count() == 0


@pytest.mark.django_db
def test_contact_rejects_markup_injection_and_honeypot(api_client: APIClient) -> None:
    xss_payload = {
        "full_name": "Usuario Prueba",
        "email": "usuario@ejemplo.bo",
        "inquiry_type": "GENERAL",
        "subject": "Asunto <script>alert(1)</script>",
        "message": "Este mensaje intenta inyectar etiquetas HTML no permitidas.",
        "privacy_accepted": True,
    }
    xss_response = api_client.post("/api/v1/contact/", xss_payload, format="json")
    assert xss_response.status_code == status.HTTP_400_BAD_REQUEST

    spam_payload = {
        "full_name": "Bot Spam",
        "email": "bot@spam.example",
        "inquiry_type": "GENERAL",
        "subject": "Oferta automatizada",
        "message": "Este mensaje fue llenado con un campo trampa oculto.",
        "privacy_accepted": True,
        "website": "https://spam.example",
    }
    spam_response = api_client.post("/api/v1/contact/", spam_payload, format="json")
    assert spam_response.status_code == status.HTTP_400_BAD_REQUEST
    assert ContactInquiry.objects.count() == 0


@pytest.mark.django_db
def test_contact_prevents_duplicate_submission_within_window(
    api_client: APIClient,
) -> None:
    payload = {
        "full_name": "Ing. Marco Rojas",
        "email": "marco@ejemplo.bo",
        "inquiry_type": "INSTITUTIONAL_LICENSING",
        "subject": "Consulta licencia anual de carrera",
        "message": "Requerimos información sobre el plan Carrera Universitaria.",
        "privacy_accepted": True,
    }
    first = api_client.post("/api/v1/contact/", payload, format="json")
    assert first.status_code == status.HTTP_201_CREATED

    duplicate = api_client.post("/api/v1/contact/", payload, format="json")
    assert duplicate.status_code == status.HTTP_409_CONFLICT
    assert ContactInquiry.objects.count() == 1


@pytest.mark.django_db
def test_support_ticket_routes_inference_engine_to_l3_and_allows_status_lookup(
    api_client: APIClient,
) -> None:
    payload = {
        "full_name": "Ing. Elena Vargas",
        "email": "elena@ejemplo.bo",
        "organization": "Departamento de Sistemas",
        "category": "INFERENCE_ENGINE",
        "severity": "HIGH",
        "subject": "Diferencia en orden de disparo de reglas",
        "description": (
            "Al simular una base de conocimiento con dos reglas de igual prioridad "
            "ocurre un empate inesperado."
        ),
        "privacy_accepted": True,
        "website": "",
    }
    create_resp = api_client.post("/api/v1/support/tickets/", payload, format="json")
    assert create_resp.status_code == status.HTTP_201_CREATED
    created_data = create_resp.json()["data"]
    ref_code = created_data["reference_code"]
    assert ref_code.startswith("EXP-")
    assert created_data["support_level"] == SupportTicket.SupportLevel.L3_ENGINEERING

    missing_email = api_client.get(f"/api/v1/support/tickets/{ref_code}/")
    assert missing_email.status_code == status.HTTP_400_BAD_REQUEST

    wrong_email = api_client.get(
        f"/api/v1/support/tickets/{ref_code}/?email=otro@ejemplo.bo"
    )
    assert wrong_email.status_code == status.HTTP_404_NOT_FOUND

    valid_lookup = api_client.get(
        f"/api/v1/support/tickets/{ref_code}/?email=elena@ejemplo.bo"
    )
    assert valid_lookup.status_code == status.HTTP_200_OK
    status_data = valid_lookup.json()["data"]
    assert status_data["reference_code"] == ref_code
    assert "email" not in status_data
    assert "ip_hash" not in status_data


@pytest.mark.django_db
def test_contact_endpoint_enforces_rate_limit(
    api_client: APIClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from corporate.throttling import ContactRateThrottle

    monkeypatch.setattr(ContactRateThrottle, "THROTTLE_RATES", {"contact": "2/hour"})
    for idx in range(2):
        resp = api_client.post(
            "/api/v1/contact/",
            {
                "full_name": f"Usuario {idx}",
                "email": f"user{idx}@ejemplo.bo",
                "inquiry_type": "GENERAL",
                "subject": f"Consulta número {idx}",
                "message": "Mensaje válido para probar el límite de peticiones.",
                "privacy_accepted": True,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    throttled = api_client.post(
        "/api/v1/contact/",
        {
            "full_name": "Usuario 3",
            "email": "user3@ejemplo.bo",
            "inquiry_type": "GENERAL",
            "subject": "Consulta número 3",
            "message": "Esta tercera petición debe ser limitada por rate limiting.",
            "privacy_accepted": True,
        },
        format="json",
    )
    assert throttled.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_admin_requires_authentication(api_client: APIClient) -> None:
    response = api_client.get("/admin/corporate/contactinquiry/")
    assert response.status_code == status.HTTP_302_FOUND
    assert "/admin/login/" in response.url
