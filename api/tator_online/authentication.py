import os

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from jwt.algorithms import RSAAlgorithm
import requests
import json

import logging
logger = logging.getLogger(__name__)

class KeycloakAuthenticationMixin:
    def _get_pub_key(self):
        from main.cache import TatorCache
        cache = TatorCache()
        # Get the public key from keycloak (may be cached)
        pub_key = cache.get_keycloak_public_key()
        if pub_key is None:
            url = f"https://{os.getenv('MAIN_HOST')}/auth/realms/tator/protocol/openid-connect/certs"
            r = requests.get(url)
            r.raise_for_status()
            json_data = r.json()
            for key_data in json_data["keys"]:
                if key_data["use"] == "sig":
                    pub_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
                    break
            cache.set_keycloak_public_key(pub_key)
        return pub_key

    def _get_token(self, request):
        # Get the bearer token
        token = None
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        if token is None:
            token = request.COOKIES.get('access_token')
        return token

    def authenticate(self, request):
        from main.models import User
        from django.contrib.auth.models import AnonymousUser

        out = (AnonymousUser(), None)
        pub_key = self._get_pub_key()
        token = self._get_token(request)
        if token is not None:
            try:
                decoded = jwt.decode(token, pub_key, algorithms=["RS256"], audience="account")
                keycloak_user_id = decoded['sub']
                user_id = int(keycloak_user_id.split(':')[-1])
                user = User.objects.get(pk=user_id)
                out = (user, None)
            except jwt.ExpiredSignatureError:
                raise AuthenticationFailed(f"Access token has expired!")
            except jwt.InvalidAudienceError:
                raise AuthenticationFailed(f"Access token decode failed: Invalid audience!")
            except jwt.InvalidIssuerError:
                raise AuthenticationFailed(f"Access token decode failed: Invalid issuer!")
            except jwt.DecodeError:
                raise AuthenticationFailed(f"Access token decode failed: Invalid signature!")
            except Exception as e:
                raise AuthenticationFailed(f"Access token decode failed!")
        return out

class KeycloakAuthentication(KeycloakAuthenticationMixin, BaseAuthentication):
    pass
