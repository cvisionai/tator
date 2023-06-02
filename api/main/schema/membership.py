from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Memberships specify a permission level of a user to a project. There are currently
five cumulative permission levels:
- `View Only` can only view a project and not change any data.
- `Can Edit` can create, modify, and delete annotations.
- `Can Transfer` can upload and download media.
- `Can Execute` can launch algorithm workflows.
- `Full Control` can change project settings, including inviting new members, project name, and
   project metadata schema.
"""
)


class MembershipListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateMembership"
        elif method == "GET":
            operation["operationId"] = "GetMembershipList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get membership list."
        elif method == "POST":
            short_desc = "Create membership."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "project",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a project.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return {}

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/MembershipSpec"},
                        "example": {
                            "user": 1,
                            "permission": "Full Control",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of membership list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Membership"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("membership")
        return responses


class MembershipDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetMembership"
        elif method == "PATCH":
            operation["operationId"] = "UpdateMembership"
        elif method == "DELETE":
            operation["operationId"] = "DeleteMembership"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get membership."
        elif method == "PATCH":
            short_desc = "Update membership."
        elif method == "DELETE":
            short_desc = "Delete membership."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a membership.",
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
                        "schema": {"$ref": "#/components/schemas/MembershipUpdate"},
                        "example": {
                            "permission": "View Only",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of membership.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Membership",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "membership")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "membership")
        return responses
