from django.conf import settings
from django.contrib.auth import login
from django.shortcuts import redirect
from django_cognito_jwt.validator import TokenError, TokenValidator

from ._base_views import TatorAPIView
from rest_framework.response import Response
from rest_framework import status

from okta_jwt_verifier import JWTUtils
from ._jwt_helpers import is_access_token_valid, is_id_token_valid
from ..models import User
from ..schema import JwtGatewaySchema

import requests
import logging

logger = logging.getLogger(__name__)


class JwtGatewayAPI(TatorAPIView):
    """Notional JWT login gateway"""

    schema = JwtGatewaySchema()

    def get(self, request, format=None, **kwargs):
        if settings.COGNITO_ENABLED:
            provider = "cognito"
            body = {"message": "page found"}
            code = request.query_params.get("code", None)
            if code is None:
                return Response({"message": "Not Found"}, status=status.HTTP_404_NOT_FOUND)

            redirect_uri = request.build_absolute_uri("?")
            redirect_uri = redirect_uri.rstrip("/")

            token_resp = requests.post(
                "https://" + settings.COGNITO_DOMAIN + "/oauth2/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.COGNITO_AUDIENCE,
                    "code": code,
                    "scope": "openid",
                    "redirect_uri": redirect_uri,
                },
            )
            try:
                aws = token_resp.json()
                if token_resp.status_code != 200:
                    logger.error(f"AWS returned {aws}")
                    return Response(
                        {"aws error": aws, "status": token_resp.status_code},
                        status=token_resp.status_code,
                    )
                id_token = aws["id_token"]
                validator = TokenValidator(
                    settings.COGNITO_AWS_REGION,
                    settings.COGNITO_USER_POOL,
                    settings.COGNITO_AUDIENCE,
                )
                jwt_payload = validator.validate(id_token)
            except TokenError as e:
                return Response({"message": "invalid token"}, status=status.HTTP_404_NOT_FOUND)
            # except Exception as e:
            #    return Response({"message": str(e)},status=token_resp.status_code)
        elif settings.OKTA_ENABLED:
            provider = "okta"
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            code = request.query_params.get("code", None)
            if code is None:
                return Response({"message": "Not Found"}, status=status.HTTP_404_NOT_FOUND)

            redirect_uri = request.build_absolute_uri("?")
            redirect_uri = redirect_uri.rstrip("/")

            query_params = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            }
            query_params = requests.compat.urlencode(query_params)
            exchange = requests.post(
                settings.OKTA_OAUTH2_TOKEN_URI,
                headers=headers,
                data=query_params,
                auth=(settings.OKTA_OAUTH2_KEY, settings.OKTA_OAUTH2_SECRET),
            ).json()

            # Get tokens and validate
            try:
                if not exchange.get("token_type"):
                    return Response(
                        {"message": "Unsupported token type. Should be 'Bearer'."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                issuer = settings.OKTA_OAUTH2_ISSUER
                access_token = exchange["access_token"]
                if not is_access_token_valid(access_token, issuer):
                    return Response(
                        {"message": "Access token is invalid"}, status=status.HTTP_403_FORBIDDEN
                    )

                id_token = exchange["id_token"]
                if not is_id_token_valid(id_token, issuer, settings.OKTA_OAUTH2_KEY):
                    return Response(
                        {"message": "ID token is invalid"}, status=status.HTTP_403_FORBIDDEN
                    )

                # Authorization flow successful, get userinfo
                jwt_payload = JWTUtils.parse_token(id_token)[1]
            except Exception as e:
                return Response({"message": "invalid token"}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"message": "page not found"}, status=status.HTTP_404_NOT_FOUND)

        user = User.objects.get_or_create_for_oauth2(jwt_payload, provider)

        # Upgrade the connection to a session
        login(request, user)

        return redirect("/projects")
