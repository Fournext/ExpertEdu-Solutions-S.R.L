"""Rate limiting classes for public corporate API endpoints."""

from rest_framework.throttling import AnonRateThrottle


class ContactRateThrottle(AnonRateThrottle):
    """Limits contact and demo form submissions per anonymous IP."""

    scope = "contact"


class SupportRateThrottle(AnonRateThrottle):
    """Limits support ticket submissions per anonymous IP."""

    scope = "support"
