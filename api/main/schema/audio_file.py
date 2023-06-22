from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema

boilerplate = dedent(
    """\
Audio files are stored under the `media_files` field of `Media` objects. They are used to 
relate media metadata to an underlying audio. One or more audio files can be used to reference
the audio role in a `Media` object. The file itself must first be uploaded to a URL retrieved
from the `UploadInfo` endpoint, and the returned object key 
should be specified in the audio file's `path` field.
"""
)


class AudioFileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateAudioFile"
        elif method == "GET":
            operation["operationId"] = "GetAudioFileList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get audio file list."
        elif method == "POST":
            short_desc = "Create audio file."
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
                "schema": {"type": "string", "enum": ["audio"], "default": "audio"},
            }
        ]
        if method == "POST":
            params.append(
                {
                    "name": "index",
                    "in": "query",
                    "required": False,
                    "description": "Insertion index. Must be less than size of current list of "
                    "audio files for the specified `role`. If omitted, the audio file "
                    "will be appended to the end of the list.",
                    "schema": {"type": "integer", "minimum": 0},
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
                        "schema": {"$ref": "#/components/schemas/AudioDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of audio file list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/AudioDefinition"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_schema("creation", "audio file")
        return responses


class AudioFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetAudioFile"
        elif method == "PATCH":
            operation["operationId"] = "UpdateAudioFile"
        elif method == "DELETE":
            operation["operationId"] = "DeleteAudioFile"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get audio file."
        elif method == "PATCH":
            short_desc = "Update audio file."
        elif method == "DELETE":
            short_desc = "Delete audio file."
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
                "schema": {"type": "string", "enum": ["audio"], "default": "audio"},
            },
            {
                "name": "index",
                "in": "query",
                "required": True,
                "description": "Index of object. Must be less than size of current list of "
                "audio files for the specified `role`.",
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
                        "schema": {"$ref": "#/components/schemas/AudioDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of audio file.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/AudioDefinition",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "audio file")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "audio file")
        return responses
