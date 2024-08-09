from django.contrib.auth import login
from django.shortcuts import redirect
from django.http import HttpResponseRedirect
from django.utils.http import url_has_allowed_host_and_scheme
from ._base_views import TatorAPIView

from ..models import User
from ..schema import AnonymousGatewaySchema

import logging

logger = logging.getLogger(__name__)


class AnonymousGatewayAPI(TatorAPIView):
    """Notional Anonymous login gateway"""

    schema = AnonymousGatewaySchema()

    def get(self, request, format=None, **kwargs):
        user, _ = User.objects.get_or_create(
            username="anonymous",
            first_name="Guest",
            last_name="Account",
            email="info@cvisionai.com",
        )

        # Check redirect url is relative
        url = request.query_params.get("redirect", "")
        if url.startswith("/") and url_has_allowed_host_and_scheme(url, allowed_hosts=None):
            response = HttpResponseRedirect(url)
        else:
            response = redirect("/projects")

        # Upgrade the connection to a session
        login(request, user)
        return response
