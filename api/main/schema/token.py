from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses


class TokenSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateObtainAuthToken"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "POST":
            return dedent(
                """\
            Get API token.

            This method accepts login credentials and returns an API token that
            can be used with the Tator REST API, tator-py, or tator-r. 
            """
            )

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Credentials",
                        },
                    }
                },
            }
        return body
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["200"] = {
                "description": "Successful retrieval of token.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Token",
                        }
                    }
                },
            }
        return responses
