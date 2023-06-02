from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._attributes import attribute_filter_parameter_schema
from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

from .components.file import file_fields as fields
from .components.file import file_filter_parameter_schema

boilerplate = dedent(
    """\
Non-media assocaited files can be stored within the project along with user-defined attributes.
Unlike temporary files, these are permanent. These do not include applet files and algorithm
workflow files.
"""
)


class FileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetFileList"
        elif method == "POST":
            operation["operationId"] = "CreateFile"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get non-media associated File object list."

        elif method == "POST":
            short_desc = "Create generic, non-media associated File object."

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

    def get_filter_parameters(self, path, method) -> list:
        params = []
        if method in ["GET"]:
            params = file_filter_parameter_schema + attribute_filter_parameter_schema
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/FileSpec"},
                    }
                },
            }

        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/File"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("registered file")
        return responses


class FileDetailSchema(AutoSchema):
    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetFile"
        elif method == "PATCH":
            operation["operationId"] = "UpdateFile"
        elif method == "DELETE":
            operation["operationId"] = "DeleteFile"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method) -> str:
        description = ""
        if method == "GET":
            description = "Get registered non-media File object"
        elif method == "PATCH":
            description = "Updated registered non-media File object"
        elif method == "DELETE":
            description = "Delete registered non-media File object"
        return description

    def get_path_parameters(self, path, method) -> list:
        parameters = [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a registered File object.",
                "schema": {"type": "integer"},
            }
        ]

        return parameters

    def get_filter_parameters(self, path, method) -> list:
        return []

    def get_request_body(self, path, method) -> dict:
        body = {}
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/FileUpdate"},
                        "example": {
                            fields.name: "New file name",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of file object.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/File",
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "registered file")
        return responses
