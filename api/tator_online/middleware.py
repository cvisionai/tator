import time
import os
import logging
import requests

from django.utils.deprecation import MiddlewareMixin
from datadog import DogStatsd
from django.http import QueryDict
from .authentication import KeycloakAuthenticationMixin

logger = logging.getLogger(__name__)
logger.setLevel("INFO")

statsd = DogStatsd(host="tator-prometheus-statsd-exporter", port=9125)


class StatsdMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()

    def process_response(self, request, response):
        tokens = request.path.split("/")
        if request.path.startswith("/rest") and len(tokens) > 2:
            endpoint = tokens[2]
        else:
            endpoint = request.path
        statsd.increment(
            "django_request_count",
            tags=[
                "service:tator",
                f"method:{request.method}",
                f"endpoint:{endpoint}",
                f"status:{response.status_code}",
            ],
        )

        response_time = time.time() - request.start_time
        statsd.histogram(
            "django_request_latency_seconds",
            response_time,
            tags=["service:tator", f"endpoint:{endpoint}"],
        )
        return response


class KeycloakMiddleware(KeycloakAuthenticationMixin):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user, _ = self.authenticate(request)
        return self.get_response(request)


MAIN_HOST = os.getenv("MAIN_HOST")
