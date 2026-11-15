"""Django admin configuration for corporate inquiries and support tickets."""

from django.contrib import admin

from .models import ContactInquiry, SupportTicket


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = (
        "subject",
        "full_name",
        "email",
        "organization",
        "inquiry_type",
        "status",
        "created_at",
    )
    list_filter = ("inquiry_type", "status", "created_at")
    search_fields = ("full_name", "email", "organization", "subject", "message")
    readonly_fields = ("id", "ip_hash", "created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = (
        "reference_code",
        "subject",
        "full_name",
        "category",
        "severity",
        "support_level",
        "status",
        "created_at",
    )
    list_filter = ("category", "severity", "support_level", "status", "created_at")
    search_fields = ("reference_code", "full_name", "email", "subject", "description")
    readonly_fields = ("id", "reference_code", "ip_hash", "created_at", "updated_at")
    ordering = ("-created_at",)
