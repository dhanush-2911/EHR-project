from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.core.cache import cache

class BlacklistAwareJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        token_str = raw_token.decode('utf-8') if isinstance(raw_token, bytes) else str(raw_token)
        if cache.get(f'blacklisted_{token_str}'):
            raise InvalidToken('Token has been blacklisted')
        return super().get_validated_token(raw_token)
