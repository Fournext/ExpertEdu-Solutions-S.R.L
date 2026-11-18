"""Django admin registration for corporate models."""

from django.contrib import admin

from .models import (
    ContactInquiry,
    CustomerProductMembership,
    CustomerProfile,
    EmailVerificationCode,
    SupportTicket,
)


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = (
        "inquiry_type",
        "subject",
        "full_name",
        "email",
        "target_inbox",
        "status",
        "created_at",
    )
    list_filter = ("inquiry_type", "status", "created_at")
    search_fields = ("full_name", "email", "organization", "subject")
    readonly_fields = ("id", "ip_hash", "created_at", "updated_at")


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = (
        "reference_code",
        "subject",
        "category",
        "severity",
        "support_level",
        "target_inbox",
        "status",
        "created_at",
    )
    list_filter = ("category", "severity", "support_level", "status", "created_at")
    search_fields = ("reference_code", "full_name", "email", "subject")
    readonly_fields = ("id", "reference_code", "ip_hash", "created_at", "updated_at")


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "user",
        "organization",
        "email_verified",
        "privacy_accepted",
        "terms_accepted",
        "created_at",
    )
    search_fields = ("full_name", "organization", "user__email", "user__username")


@admin.register(CustomerProductMembership)
class CustomerProductMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "product_code",
        "role",
        "plan_code",
        "is_active",
        "enrolled_at",
    )
    list_filter = ("product_code", "role", "plan_code", "is_active")
    search_fields = ("user__username", "user__email")


@admin.register(EmailVerificationCode)
class EmailVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("email", "code", "is_verified", "attempts", "expires_at", "created_at")
    list_filter = ("is_verified",)
    search_fields = ("email",)
