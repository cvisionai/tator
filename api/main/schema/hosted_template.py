from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses


class HostedTemplateListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetHostedTemplateList"
        elif method == "POST":
            operation["operationId"] = "CreateHostedTemplate"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            description = dedent(
                """
                Get hosted templates.
                """
            )

        elif method == "POST":
            description = dedent(
                """
                Create a hosted template.

                This endpoint replicates the hosted template creation through the admin portal.
                """
            )

        return description

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying an organization.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/HostedTemplateSpec"},
                    }
                },
            }

        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of registered hosted templates.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/HostedTemplate"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("registered hosted template")
        return responses


class HostedTemplateDetailSchema(AutoSchema):
    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetHostedTemplate"
        elif method == "PATCH":
            operation["operationId"] = "UpdateHostedTemplate"
        elif method == "DELETE":
            operation["operationId"] = "DeleteHostedTemplate"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method) -> str:
        description = ""
        if method == "GET":
            description = "Get registered hosted template"
        elif method == "PATCH":
            description = "Updated registered hosted template"
        elif method == "DELETE":
            description = "Delete registered hosted template"
        return description

    def get_path_parameters(self, path, method) -> list:
        parameters = [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a registered hosted template.",
                "schema": {"type": "integer"},
            }
        ]

        return parameters

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method) -> dict:
        body = {}
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/HostedTemplateSpec"},
                        "example": {
                            "name": "New unique name",
                            "url": "New URL",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of hosted template.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/HostedTemplate",
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "registered hosted template")
        elif method == "PATCH":
            responses["201"] = message_schema("update", "hosted template")
        return responses
