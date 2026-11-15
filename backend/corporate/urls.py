"""URL routing for corporate API v1."""

from django.urls import path

from .views import (
    ContactInquiryCreateView,
    HealthCheckView,
    SupportTicketCreateView,
    SupportTicketStatusView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="api-health"),
    path("contact/", ContactInquiryCreateView.as_view(), name="api-contact"),
    path(
        "support/tickets/",
        SupportTicketCreateView.as_view(),
        name="api-support-create",
    ),
    path(
        "support/tickets/<str:reference_code>/",
        SupportTicketStatusView.as_view(),
        name="api-support-status",
    ),
]
