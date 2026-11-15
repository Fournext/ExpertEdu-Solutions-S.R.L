"""Custom DRF exception handler that avoids leaking internal details."""

import logging
from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def safe_exception_handler(exc: Exception, context: dict[str, Any]) -> Response:
    """Return structured JSON errors without exposing stack traces or secrets."""
    response = exception_handler(exc, context)
    if response is not None:
        return response

    logger.exception("Unhandled backend error in %s", context.get("view"))
    return Response(
        {
            "success": False,
            "message": "Error interno al procesar la solicitud. Inténtelo nuevamente más tarde.",
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
