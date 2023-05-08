from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._attribute_type import attribute_type_example
from ._type_query import type_filter_parameter_schema

boilerplate = dedent(
    """\
A file type is the metadata definition object for non-media FIle objects.
It includes the name, description, and any associated user defined attributes.
"""
)


class FileTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateFileType"
        elif method == "GET":
            operation["operationId"] = "GetFileTypeList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get file type list."
        elif method == "POST":
            short_desc = "Create file type."
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
        params = {}
        if method == "GET":
            params = type_filter_parameter_schema
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/FileTypeSpec"},
                        "example": {
                            "name": "My file type",
                            "attribute_types": attribute_type_example,
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of file type list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/FileType"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("file type")
        return responses


class FileTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetFileType"
        elif method == "PATCH":
            operation["operationId"] = "UpdateFileType"
        elif method == "DELETE":
            operation["operationId"] = "DeleteFileType"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get file type."
        elif method == "PATCH":
            short_desc = "Update file type."
        elif method == "DELETE":
            short_desc = "Delete file type."
            long_desc = dedent(
                """\
            Note that this will also delete any files associated with the file type.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying an file type.",
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
                        "schema": {"$ref": "#/components/schemas/FileTypeUpdate"},
                        "example": {
                            "name": "New name",
                            "description": "New description",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of file type.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/FileType",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "file type")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "file type")
        return responses
