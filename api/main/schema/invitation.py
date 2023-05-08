from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Invitations allow users with administrative privileges for an organization to
invite a user to join their organization using their email address. Upon creation,
if automatic emails are configured an email will be sent to the specified email
address. If the user has not yet registered, the email will contain a link to
register using a registration token. If the user has registered, the email
will send a link to accept the invitation. The link is also returned in the 
response of the create method.
"""
)


class InvitationListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateInvitation"
        elif method == "GET":
            operation["operationId"] = "GetInvitationList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get invitation list."
        elif method == "POST":
            short_desc = "Create invitation."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "organization",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying an organization.",
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
                        "schema": {"$ref": "#/components/schemas/InvitationSpec"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of invitation list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Invitation"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("invitation")
        return responses


class InvitationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetInvitation"
        elif method == "PATCH":
            operation["operationId"] = "UpdateInvitation"
        elif method == "DELETE":
            operation["operationId"] = "DeleteInvitation"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get invitation."
        elif method == "PATCH":
            short_desc = "Update invitation."
        elif method == "DELETE":
            short_desc = "Delete invitation."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a invitation.",
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
                        "schema": {"$ref": "#/components/schemas/InvitationUpdate"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of invitation.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Invitation",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "invitation")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "invitation")
        return responses
