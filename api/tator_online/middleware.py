import time
import os
import logging
import requests

from django.utils.deprecation import MiddlewareMixin
from django.http import QueryDict
from .authentication import KeycloakAuthenticationMixin

logger = logging.getLogger(__name__)
logger.setLevel("INFO")


class KeycloakMiddleware(KeycloakAuthenticationMixin):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user, _ = self.authenticate(request)
        return self.get_response(request)


MAIN_HOST = os.getenv("MAIN_HOST")
