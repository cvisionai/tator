from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Temporary files are files stored server side for a defined duration.
"""
)


class TemporaryFileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateTemporaryFile"
        elif method == "GET":
            operation["operationId"] = "GetTemporaryFileList"
        elif method == "DELETE":
            operation["operationId"] = "DeleteTemporaryFileList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get temporary file list."
        elif method == "POST":
            short_desc = "Create temporary file."
            long_desc = dedent(
                """\
            The file must first be uploaded via tus, and can subsequently be saved using
            this endpoint."""
            )
        elif method == "DELETE":
            short_desc = "Delete temporary file list."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

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
        params = []
        if method in ["GET", "DELETE"]:
            params = [
                {
                    "name": "expired",
                    "in": "query",
                    "required": False,
                    "description": "If greater than 0 will return only" " expired files",
                    "explode": False,
                    "schema": {"type": "integer", "default": 0},
                },
            ]
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/TemporaryFileSpec"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of temporary file list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/TemporaryFile"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("temporary file")
        return responses


class TemporaryFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetTemporaryFile"
        elif method == "PATCH":
            operation["operationId"] = "UpdateTemporaryFile"
        elif method == "DELETE":
            operation["operationId"] = "DeleteTemporaryFile"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get temporary file."
        elif method == "DELETE":
            short_desc = "Delete temporary file."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a temporary file.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of temporary file.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/TemporaryFile",
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "temporary file")
        return responses
