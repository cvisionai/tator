from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema

boilerplate = dedent(
    """\
Auxiliary files are stored under the `media_files` field of `Media` objects. They are used to 
relate media metadata to an underlying generic file. One or more files can be used to reference
the attachment role in a `Media` object. The file itself must first be uploaded to a URL retrieved
from the `UploadInfo` endpoint, and the returned object key 
should be specified in the file's `path` field.
"""
)


class AuxiliaryFileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateAuxiliaryFile"
        elif method == "GET":
            operation["operationId"] = "GetAuxiliaryFileList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get file list."
        elif method == "POST":
            short_desc = "Create file."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a media object.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        params = [
            {
                "name": "role",
                "in": "query",
                "required": False,
                "description": "Role of media file being referenced.",
                "schema": {"type": "string", "enum": ["attachment"], "default": "attachment"},
            }
        ]
        if method == "POST":
            params.append(
                {
                    "name": "index",
                    "in": "query",
                    "required": False,
                    "description": "Insertion index. Must be less than size of current list of "
                    "files for the specified `role`. If omitted, the file "
                    "will be appended to the end of the list.",
                    "schema": {"type": "integer", "minimum": 0},
                }
            )
            params.append(
                {
                    "name": "bucket_id",
                    "in": "query",
                    "required": False,
                    "description": "Unique integer identifying a bucket. If provided, the video file will be "
                    "stored in the specified bucket. If omitted, the video file will be stored in the default bucket.",
                    "schema": {"type": "integer"},
                }
            )
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/AuxiliaryFileDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of file list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/AuxiliaryFileDefinition"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_schema("creation", "file")
        return responses


class AuxiliaryFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetAuxiliaryFile"
        elif method == "PATCH":
            operation["operationId"] = "UpdateAuxiliaryFile"
        elif method == "DELETE":
            operation["operationId"] = "DeleteAuxiliaryFile"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get auxiliary file."
        elif method == "PATCH":
            short_desc = "Update auxiliary file."
        elif method == "DELETE":
            short_desc = "Delete auxiliary file."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a media object.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return [
            {
                "name": "role",
                "in": "query",
                "required": False,
                "description": "Role of media file being referenced.",
                "schema": {"type": "string", "enum": ["attachment"], "default": "attachment"},
            },
            {
                "name": "index",
                "in": "query",
                "required": True,
                "description": "Index of object. Must be less than size of current list of "
                "files for the specified `role`.",
                "schema": {"type": "integer", "minimum": 0},
            },
        ]

    def get_request_body(self, path, method):
        body = {}
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/AuxiliaryFileDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of file.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/AuxiliaryFileDefinition",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "file")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "file")
        return responses
