"""Bearer token authentication for corporate customers and superadmins."""

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import CorporateSessionToken


class CorporateBearerAuthentication(BaseAuthentication):
    """Authenticates requests using Authorization: Bearer <key>."""

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token_key = parts[1].strip()
        if not token_key:
            return None

        token_obj = (
            CorporateSessionToken.objects.select_related("user")
            .filter(key=token_key)
            .first()
        )
        if not token_obj or token_obj.is_expired() or not token_obj.user.is_active:
            raise AuthenticationFailed("Sesión inválida o expirada.")

        return (token_obj.user, token_obj)
