from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Allows for logging into Tator from a JWT token. Upgrades the session from
a JWT token, to a session for using the Tator UI pages. This is the redirect
landing page from the [Cognito REST endpoint](https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html).
"""
)


class JwtGatewaySchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetJwtGatewaySchema"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return boilerplate

    def get_filter_parameters(self, path, method):
        params = []
        if method == "GET":
            params = [
                {
                    "name": "code",
                    "in": "query",
                    "required": False,
                    "description": "Unique UUID from code-grant workflow oauth2 process",
                    "schema": {"type": "string"},
                }
            ]
        return params
