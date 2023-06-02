from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

boilerplate = dedent(
    """\
Allows for logging into Tator as an anonymous user.
"""
)


class AnonymousGatewaySchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetAnonymousGatewaySchema"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return boilerplate

    def get_filter_parameters(self, path, method):
        params = []
        if method == "GET":
            params = [
                {
                    "name": "redirect",
                    "in": "query",
                    "required": False,
                    "description": "URI to redirect to after logging in as anonymous user. "
                    "Defaults to /projects.",
                    "schema": {"type": "string"},
                }
            ]
        return params
