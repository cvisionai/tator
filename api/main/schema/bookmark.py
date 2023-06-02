from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Bookmarks are saved links that can be used to mark videos/frames of interest.
They are scoped to a project and user, so if a user requests Bookmarks for a
project they will only receive the Bookmarks created by them.
"""
)


class BookmarkListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateBookmark"
        elif method == "GET":
            operation["operationId"] = "GetBookmarkList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get bookmark list."
        elif method == "POST":
            short_desc = "Create bookmark."
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
        return [
            {
                "name": "name",
                "in": "query",
                "required": False,
                "description": "Name of the bookmark to filter on.",
                "schema": {"type": "string"},
            }
        ]

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BookmarkSpec"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of bookmark list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Bookmark"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("bookmark")
        return responses


class BookmarkDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetBookmark"
        elif method == "PATCH":
            operation["operationId"] = "UpdateBookmark"
        elif method == "DELETE":
            operation["operationId"] = "DeleteBookmark"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get bookmark."
        elif method == "PATCH":
            short_desc = "Update bookmark."
        elif method == "DELETE":
            short_desc = "Delete bookmark."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a bookmark.",
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
                        "schema": {"$ref": "#/components/schemas/BookmarkUpdate"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of bookmark.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Bookmark",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "bookmark")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "bookmark")
        return responses
