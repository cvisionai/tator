from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema

boilerplate = dedent(
    """\
Video files are stored under the `media_files` field of `Media` objects. They are used to 
relate media metadata to an underlying video. One or more video files can be used to reference
streaming or archival roles in a `Media` object. The file itself must first be 
uploaded to a URL retrieved from the `UploadInfo` endpoint, and the returned object key 
should be specified in the video file's `path` field.
"""
)


class VideoFileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateVideoFile"
        elif method == "GET":
            operation["operationId"] = "GetVideoFileList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get video file list."
        elif method == "POST":
            short_desc = "Create video file."
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
                "required": True,
                "description": "Role of media file being referenced.",
                "schema": {"type": "string", "enum": ["streaming", "archival"]},
            }
        ]
        if method == "POST":
            params.append(
                {
                    "name": "index",
                    "in": "query",
                    "required": False,
                    "description": "Insertion index. Must be less than size of current list of "
                    "videos for the specified `role`. If omitted, the video file "
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
                        "schema": {"$ref": "#/components/schemas/VideoDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of video file list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/VideoDefinition"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_schema("creation", "video file")
        return responses


class VideoFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetVideoFile"
        elif method == "PATCH":
            operation["operationId"] = "UpdateVideoFile"
        elif method == "DELETE":
            operation["operationId"] = "DeleteVideoFile"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get video file."
        elif method == "PATCH":
            short_desc = "Update video file."
        elif method == "DELETE":
            short_desc = "Delete video file."
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
                "required": True,
                "description": "Role of media file being referenced.",
                "schema": {"type": "string", "enum": ["streaming", "archival"]},
            },
            {
                "name": "index",
                "in": "query",
                "required": True,
                "description": "Index of object. Must be less than size of current list of "
                "videos for the specified `role`.",
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
                        "schema": {"$ref": "#/components/schemas/VideoDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of video file.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/VideoDefinition",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "video file")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "video file")
        return responses
