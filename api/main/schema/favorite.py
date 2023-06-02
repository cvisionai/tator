from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Favorites are saved annotation values to help speed up annotation. They are 
scoped to a project and user, so if a user requests Favorites for a project
they will only receive the Favorites created by them.
"""
)


class FavoriteListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateFavorite"
        elif method == "GET":
            operation["operationId"] = "GetFavoriteList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get favorite list."
        elif method == "POST":
            short_desc = "Create favorite."
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
                        "schema": {"$ref": "#/components/schemas/FavoriteSpec"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of favorite list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Favorite"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("favorite")
        return responses


class FavoriteDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetFavorite"
        elif method == "PATCH":
            operation["operationId"] = "UpdateFavorite"
        elif method == "DELETE":
            operation["operationId"] = "DeleteFavorite"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get favorite."
        elif method == "PATCH":
            short_desc = "Update favorite."
        elif method == "DELETE":
            short_desc = "Delete favorite."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a favorite.",
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
                        "schema": {"$ref": "#/components/schemas/FavoriteUpdate"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of favorite.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Favorite",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "favorite")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "favorite")
        return responses
