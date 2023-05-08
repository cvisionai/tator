from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Organizations are used to represent groups of users. Multiple projects may be owned by
an organization, and users may be members of multiple organizations.
"""
)


class OrganizationListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateOrganization"
        elif method == "GET":
            operation["operationId"] = "GetOrganizationList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get organization list."
            long_desc = "Returns all organizations that a user is affiliated with."
        elif method == "POST":
            short_desc = "Create organization."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        return {}

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/OrganizationSpec"},
                        "example": {
                            "name": "My Organization",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of organization list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Organization"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("organization")
        return responses


class OrganizationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetOrganization"
        elif method == "PATCH":
            operation["operationId"] = "UpdateOrganization"
        elif method == "DELETE":
            operation["operationId"] = "DeleteOrganization"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get organization."
        elif method == "PATCH":
            short_desc = "Update organization."
        elif method == "DELETE":
            short_desc = "Delete organization."
            long_desc = dedent(
                """\
            Only organization owners may delete an organization.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

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
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/OrganizationUpdate"},
                        "example": {
                            "name": "New name",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of organization.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Organization",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "organization")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "organization")
        return responses
