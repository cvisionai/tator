import time
import os
import logging
import requests
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from rest_framework.exceptions import AuthenticationFailed
from .authentication import KeycloakAuthenticationMixin

logger = logging.getLogger(__name__)
logger.setLevel("INFO")


class KeycloakMiddleware(KeycloakAuthenticationMixin):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            request.user, _ = self.authenticate(request)
        except AuthenticationFailed as e:
            # Log the failure and return a 401 response
            logger.warning(f"Authentication failed: {str(e)}")
            if str(e) == "User has been disabled!":
                return JsonResponse(
                    {
                        "error": "User disabled",
                        "detail": "User has been disabled by an administrator."
                    },
                    status=401,
                )
            else:
                return JsonResponse(
                    {
                        "error": "Authentication failed",
                        "detail": "Please provide or refresh your token."
                    },
                    status=401,
                )
        return self.get_response(request)


MAIN_HOST = os.getenv("MAIN_HOST")
