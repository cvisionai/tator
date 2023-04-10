import time
import os
import logging

from django.utils.deprecation import MiddlewareMixin
from datadog import DogStatsd
from django.http import QueryDict
import jwt
from jwt.algorithms import RSAAlgorithm
import requests
import json

logger = logging.getLogger(__name__)
logger.setLevel("INFO")

statsd = DogStatsd(host="tator-prometheus-statsd-exporter", port=9125)

class StatsdMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()

    def process_response(self, request, response):
        tokens = request.path.split('/')
        if request.path.startswith('/rest') and len(tokens) > 2:
            endpoint = tokens[2]
        else:
            endpoint = request.path
        statsd.increment('django_request_count',
                         tags=['service:tator',
                              f'method:{request.method}',
                              f'endpoint:{endpoint}',
                              f'status:{response.status_code}'])

        response_time = (time.time() - request.start_time)
        statsd.histogram('django_request_latency_seconds',
                         response_time,
                         tags=['service:tator',
                              f'endpoint:{endpoint}'])
        return response

HOST = 'http://audit-svc'

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = os.getenv('AUDIT_ENABLED')

    def __call__(self, request):
        # Create an audit record
        if self.enabled:
            r = requests.post(f"{HOST}/rest", json={
                "method": request.method,
                "uri": request.path,
                "query": QueryDict(request.META['QUERY_STRING']),
                "headers": dict(request.headers),
                "user": request.user.id,
            })
            if(r.status_code != 200):
                raise RuntimeError("Failed to create audit record!")
            record = r.json()

        # Process the request
        start_time = time.time()
        response = self.get_response(request)
        duration = int(1000 * (time.time() - start_time))

        # Update the audit record
        if self.enabled:
            r = requests.patch(f"{HOST}/rest/{record['id']}", json={
                "status": response.status_code,
                "duration": duration,
            })
            if(r.status_code != 200):
                raise RuntimeError("Failed to update audit record!")

        return response

MAIN_HOST = os.getenv('MAIN_HOST')

class KeycloakMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = os.getenv('KEYCLOAK_ENABLED')

    def _get_pub_key(self):
        from main.cache import TatorCache
        cache = TatorCache()
        # Get the public key from keycloak (may be cached)
        pub_key = cache.get_keycloak_public_key()
        if pub_key is None:
            url = f"https://{MAIN_HOST}/auth/realms/tator/protocol/openid-connect/certs"
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
        return token

    def __call__(self, request):
        from main.models import User

        if self.enabled and request.user.is_anonymous:
            pub_key = self._get_pub_key()
            token = self._get_token(request)
            if token is not None:
                try:
                    decoded = jwt.decode(token, pub_key, algorithms=["RS256"], audience="account")
                    keycloak_user_id = decoded['sub']
                    user_id = int(keycloak_user_id.split(':')[-1])
                    request.user = User.objects.get(pk=user_id)
                except jwt.ExpiredSignatureError:
                    logger.warning(f"Access token has expired!")
                except jwt.InvalidAudienceError:
                    logger.warning(f"Access token decode failed: Invalid audience!")
                except jwt.InvalidIssuerError:
                    logger.warning(f"Access token decode failed: Invalid issuer!")
                except jwt.DecodeError:
                    logger.warning(f"Access token decode failed: Invalid signature!")
                except Exception as e:
                    logger.error(f"Access token decode failed: {e}")
                
                
        response = self.get_response(request);
        return response
