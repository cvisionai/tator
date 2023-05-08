from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema

boilerplate = dedent(
    """\
Image files are stored under the `media_files` field of `Media` objects. They are used to 
relate media metadata to an underlying image. One or more image files can be used to reference
thumbnails, thumbnail GIFs, or images in a `Media` object. The file itself must first be 
uploaded to a URL retrieved from the `UploadInfo` endpoint, and the returned object key 
should be specified in the image file's `path` field.
"""
)


class ImageFileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateImageFile"
        elif method == "GET":
            operation["operationId"] = "GetImageFileList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get image file list."
        elif method == "POST":
            short_desc = "Create image file."
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
                "schema": {"type": "string", "enum": ["image", "thumbnail", "thumbnail_gif"]},
            }
        ]
        if method == "POST":
            params.append(
                {
                    "name": "index",
                    "in": "query",
                    "required": False,
                    "description": "Insertion index. Must be less than size of current list of "
                    "images for the specified `role`. If omitted, the image file "
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
                        "schema": {"$ref": "#/components/schemas/ImageDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of image file list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/ImageDefinition"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_schema("creation", "image file")
        return responses


class ImageFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetImageFile"
        elif method == "PATCH":
            operation["operationId"] = "UpdateImageFile"
        elif method == "DELETE":
            operation["operationId"] = "DeleteImageFile"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get image file."
        elif method == "PATCH":
            short_desc = "Update image file."
        elif method == "DELETE":
            short_desc = "Delete image file."
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
                "schema": {"type": "string", "enum": ["image", "thumbnail", "thumbnail_gif"]},
            },
            {
                "name": "index",
                "in": "query",
                "required": True,
                "description": "Index of object. Must be less than size of current list of "
                "images for the specified `role`.",
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
                        "schema": {"$ref": "#/components/schemas/ImageDefinition"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of image file.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/ImageDefinition",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "image file")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "image file")
        return responses
