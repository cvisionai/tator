from django.conf import settings
from django.contrib.auth import login
from django.shortcuts import redirect
from django_cognito_jwt.validator import TokenError,TokenValidator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..models import User
from ..schema import JwtGatewaySchema

import requests
import logging

logger = logging.getLogger(__name__)

class JwtGatewayAPI(APIView):
    """ Notional JWT login gateway """
    schema = JwtGatewaySchema()
    def get(self, request, format=None, **kwargs):
        if settings.COGNITO_ENABLED is False:
            body = {"message": "page not found"}
            return Response(body,status=status.HTTP_404_NOT_FOUND)
        else:
            body = {"message": "page found"}
            code = request.query_params.get("code", None)
            if code is None:
                return Response({"message": "Not Found"},
                                status=status.HTTP_404_NOT_FOUND)

            redirect_uri = request.build_absolute_uri('?')
            redirect_uri = redirect_uri.rstrip('/')

            token_resp = requests.post("https://"+settings.COGNITO_DOMAIN+"/oauth2/token",
                                       data={"grant_type": "authorization_code",
                                             "client_id": settings.COGNITO_AUDIENCE,
                                             "code": code,
                                             "scope": "openid",
                                             "redirect_uri": redirect_uri})
            try:
                aws = token_resp.json()
                response={"aws": aws}
                if token_resp.status_code != 200:
                    logger.error(f"AWS returned {aws}")
                    return Response({"aws error": aws, "status": token_resp.status_code}, status=token_resp.status_code)
                id_token = aws['id_token']
                validator = TokenValidator(settings.COGNITO_AWS_REGION,
                                           settings.COGNITO_USER_POOL,
                                           settings.COGNITO_AUDIENCE)
                jwt_payload = validator.validate(id_token)
                response.update({"jwt": jwt_payload})
                user = User.objects.get_or_create_for_cognito(jwt_payload)
                response.update({"user": user.username})

                # Upgrade the connection to a session
                login(request, user)

                # Use this to get id_token for debug
                #return Response({"id_token": id_token})
                return redirect("/projects")
            except TokenError as e:
                return Response({"message": "invalid token"},status=status.HTTP_404_NOT_FOUND)
            #except Exception as e:
            #    return Response({"message": str(e)},status=token_resp.status_code)
    
