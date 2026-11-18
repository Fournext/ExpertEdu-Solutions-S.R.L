"""URL routing for corporate API v1."""

from django.urls import path

from .views import (
    ContactInquiryCreateView,
    CustomerLoginView,
    CustomerLogoutView,
    CustomerMeView,
    CustomerRegisterView,
    HealthCheckView,
    PasswordResetConfirmView,
    PasswordResetSendCodeView,
    PublicChatbotAskView,
    SendVerificationCodeView,
    StudioEnrollView,
    StudioLaunchView,
    SuperAdminChatbotKnowledgeDetailView,
    SuperAdminChatbotKnowledgeListCreateView,
    SuperAdminInboxStatusView,
    SuperAdminInboxView,
    SuperAdminOverviewView,
    SupportTicketCreateView,
    SupportTicketStatusView,
    VerifyEmailCodeView,
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
    # Customer Authentication & OTP Verification
    path("auth/send-code/", SendVerificationCodeView.as_view(), name="api-auth-send-code"),
    path("auth/verify-code/", VerifyEmailCodeView.as_view(), name="api-auth-verify-code"),
    path("auth/register/", CustomerRegisterView.as_view(), name="api-auth-register"),
    path("auth/login/", CustomerLoginView.as_view(), name="api-auth-login"),
    path(
        "auth/password-reset/send-code/",
        PasswordResetSendCodeView.as_view(),
        name="api-auth-password-reset-send",
    ),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="api-auth-password-reset-confirm",
    ),
    path("auth/logout/", CustomerLogoutView.as_view(), name="api-auth-logout"),
    path("auth/me/", CustomerMeView.as_view(), name="api-auth-me"),
    # Product Enrollment & SSO (ExpertEdu Studio)
    path("products/studio/enroll/", StudioEnrollView.as_view(), name="api-studio-enroll"),
    path("products/studio/launch/", StudioLaunchView.as_view(), name="api-studio-launch"),
    # Superadmin KPIs & 2-Mailbox Inbox
    path("superadmin/overview/", SuperAdminOverviewView.as_view(), name="api-superadmin-overview"),
    path("superadmin/inbox/", SuperAdminInboxView.as_view(), name="api-superadmin-inbox"),
    path(
        "superadmin/inbox/<str:item_type>/<str:item_id>/",
        SuperAdminInboxStatusView.as_view(),
        name="api-superadmin-inbox-status",
    ),
    # Public Gemini Chatbot & Admin Knowledge Base
    path("chatbot/ask/", PublicChatbotAskView.as_view(), name="api-chatbot-ask"),
    path(
        "superadmin/chatbot-knowledge/",
        SuperAdminChatbotKnowledgeListCreateView.as_view(),
        name="api-superadmin-chatbot-kb",
    ),
    path(
        "superadmin/chatbot-knowledge/<str:entry_id>/",
        SuperAdminChatbotKnowledgeDetailView.as_view(),
        name="api-superadmin-chatbot-kb-detail",
    ),
]
