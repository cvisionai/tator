from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.contrib.auth import login
from django.shortcuts import redirect

from django_cognito_jwt.validator import TokenError,TokenValidator

from ..models import User

import requests

class JwtGatewayAPI(APIView):
    """ Notional JWT login gateway """
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

            token_resp = requests.post("https://"+settings.COGNITO_DOMAIN+"/oauth2/token",
                                       data={"grant_type": "authorization_code",
                                             "client_id": settings.COGNITO_AUDIENCE,
                                             "code": code,
                                             "scope": "openid",
                                             "redirect_uri": "https://btate.duckdns.org/jwt-gateway"})
            try:
                aws = token_resp.json()
                response={"aws": aws}
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
                
                return redirect("/projects")
            except TokenError as e:
                return Response({"message": "invalid token"},status=status.HTTP_404_NOT_FOUND)
            #except Exception as e:
            #    return Response({"message": str(e)},status=token_resp.status_code)
    
