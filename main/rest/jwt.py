from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

import requests

class JwtGatewayAPI(APIView):
    """ Notional JWT code to token page """
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
                return Response(token_resp.json(),status=token_resp.status_code)
            except:
                return Response({"message": token_resp.text, "code": token_resp.status_code},status=token_resp.status_code)
    
