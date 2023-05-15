from django.contrib.auth import login
from django.shortcuts import redirect
from rest_framework.views import APIView

from ..models import User
from ..schema import AnonymousGatewaySchema

import logging

logger = logging.getLogger(__name__)

class AnonymousGatewayAPI(APIView):
    """ Notional Anonymous login gateway """
    schema = AnonymousGatewaySchema()
    def get(self, request, format=None, **kwargs):
        user, _ = User.objects.get_or_create(
            username='anonymous',
            first_name='Guest',
            last_name='Account',
            email='info@cvisionai.com',
        )
        url = request.query_params.get("redirect", '/projects')
        response = redirect(url, permanent=True)

        # Upgrade the connection to a session
        login(request, user)
        return response

