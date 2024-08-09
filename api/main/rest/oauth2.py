from django.conf import settings
from django.shortcuts import redirect

from ._base_views import TatorAPIView
from rest_framework.response import Response
from rest_framework import status

import os
import requests
import logging

from ..schema import Oauth2LoginSchema

logger = logging.getLogger(__name__)


class Oauth2LoginAPI(TatorAPIView):
    """Generic Oauth2 login gateway"""

    def get(self, request, format=None, **kwargs):
        if settings.OKTA_ENABLED:
            """redirect to okta for authentication"""
            if os.getenv("REQUIRE_HTTPS") == "TRUE":
                PROTO = "https"
            else:
                PROTO = "http"
            query_params_dict = {
                "client_id": settings.OKTA_OAUTH2_KEY,
                "redirect_uri": f"{PROTO}://{os.getenv('MAIN_HOST')}/jwt-gateway",
                "scope": "openid profile email",
                "state": "ApplicationState",
                "nonce": "SampleNonce",
                "response_type": "code",
                "response_mode": "query",
            }

            # build redirect_path
            base_url = settings.OKTA_OAUTH2_AUTH_URI
            query_params = requests.compat.urlencode(query_params_dict)
            return redirect(f"{base_url}?{query_params}")
        return Response({"message": "Not Found"}, status=status.HTTP_404_NOT_FOUND)
