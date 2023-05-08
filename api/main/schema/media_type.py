from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._attribute_type import attribute_type_example
from ._entity_type_mixins import entity_type_filter_parameters_schema
from ._type_query import type_filter_parameter_schema

boilerplate = dedent(
    """\
A media type is the metadata definition object for media. It includes file format,
name, description, and may have any number of user defined attribute
types associated with it.
"""
)


class MediaTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateMediaType"
        elif method == "GET":
            operation["operationId"] = "GetMediaTypeList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get media type list."
        elif method == "POST":
            short_desc = "Create media type."
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
        params = []
        if method in ["GET", "PUT", "PATCH", "DELETE"]:
            params = type_filter_parameter_schema
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/MediaTypeSpec"},
                        "example": {
                            "name": "My media type",
                            "dtype": "video",
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
                "description": "Successful retrieval of media type list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/MediaType"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("media type")
        return responses


class MediaTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetMediaType"
        elif method == "PATCH":
            operation["operationId"] = "UpdateMediaType"
        elif method == "DELETE":
            operation["operationId"] = "DeleteMediaType"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get media type."
        elif method == "PATCH":
            short_desc = "Update media type."
        elif method == "DELETE":
            short_desc = "Delete media type."
            long_desc = dedent(
                """\
            Note that this will also delete any media associated with the media type.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying an media type.",
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
                        "schema": {"$ref": "#/components/schemas/MediaTypeUpdate"},
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
                "description": "Successful retrieval of media type.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/MediaType",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "media type")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "media type")
        return responses
