from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_list_schema
from ._errors import error_responses
from ._media_query import media_filter_parameter_schema
from ._attributes import (
    attribute_filter_parameter_schema,
    related_attribute_filter_parameter_schema,
)
from ._safety import safety_parameter_schema

boilerplate = dedent(
    """\
A group is a collection of users that can be used to assign the same ACLs to more than one user.
"""
)


class GroupListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateGroup"
        elif method == "GET":
            operation["operationId"] = "GetGroupList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        short_desc = ""
        long_desc = ""
        if method == "GET":
            short_desc = "Get group list."
        elif method == "POST":
            short_desc = "Create a group."
            long_desc = dedent(
                """\
            this method creates a group object.
            """
            )

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
        params = []
        if method in ["GET", "PUT", "PATCH", "DELETE"]:
            pass
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/GroupSpec",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["201"] = {
                "description": "Successful creation of group.",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/CreateResponse"},
                    }
                },
            }
        elif method in ["GET"]:
            responses["200"] = {
                "description": "Successful retrieval of media list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Group"},
                        }
                    }
                },
            }
        return responses


class GroupDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetGroup"
        elif method == "PATCH":
            operation["operationId"] = "UpdateGroup"
        elif method == "DELETE":
            operation["operationId"] = "DeleteGroup"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        short_desc = ""
        long_desc = ""
        if method == "GET":
            short_desc = "Get group."
        elif method == "PATCH":
            short_desc = "Update group."
        elif method == "DELETE":
            short_desc = "Delete group."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a media.",
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
                        "schema": {"$ref": "#/components/schemas/GroupUpdate"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of group.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Group",
                        }
                    }
                },
            }
        if method == "PATCH":
            responses["200"] = message_schema("update", "media")
        if method == "DELETE":
            responses["200"] = message_schema("deletion", "media")
        return responses
