from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Affiliations specify a permission level of a user to an organization. There are currently
two cumulative permission levels. `Member` can only view an organization and not change
any data. `Admin` can modify an organization, add members to an organization, and create
new projects under the organization's account.
"""
)


class AffiliationListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateAffiliation"
        elif method == "GET":
            operation["operationId"] = "GetAffiliationList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get affiliation list."
        elif method == "POST":
            short_desc = "Create affiliation."
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
                        "schema": {"$ref": "#/components/schemas/AffiliationSpec"},
                        "example": {
                            "user": 1,
                            "permission": "Admin",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of affiliation list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Affiliation"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("affiliation")
        return responses


class AffiliationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetAffiliation"
        elif method == "PATCH":
            operation["operationId"] = "UpdateAffiliation"
        elif method == "DELETE":
            operation["operationId"] = "DeleteAffiliation"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get affiliation."
        elif method == "PATCH":
            short_desc = "Update affiliation."
        elif method == "DELETE":
            short_desc = "Delete affiliation."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a affiliation.",
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
                        "schema": {"$ref": "#/components/schemas/AffiliationUpdate"},
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
                "description": "Successful retrieval of affiliation.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Affiliation",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "affiliation")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "affiliation")
        return responses
