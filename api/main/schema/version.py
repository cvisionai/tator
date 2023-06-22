from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Versions allow for multiple "layers" of annotations on the same media. Versions
are created at the project level, but are only displayed for a given media
if that media contains annotations in that version. The version of an annotation
can be set by providing it in a POST operation. Currently only localizations
and states can have versions.
"""
)


class VersionListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateVersion"
        elif method == "GET":
            operation["operationId"] = "GetVersionList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get version list."
        elif method == "POST":
            short_desc = "Create version."
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
        if method == "GET":
            params = [
                {
                    "name": "media_id",
                    "in": "query",
                    "required": False,
                    "description": "Unique integer identifying a media.",
                    "schema": {"type": "integer"},
                }
            ]
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/VersionSpec"},
                        "example": {
                            "name": "My new version",
                            "description": "New description",
                            "show_empty": True,
                            "bases": [1],
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["201"] = message_with_id_schema("version")
        elif method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of version list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Version"},
                        }
                    }
                },
            }
        return responses


class VersionDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetVersion"
        elif method == "PATCH":
            operation["operationId"] = "UpdateVersion"
        elif method == "DELETE":
            operation["operationId"] = "DeleteVersion"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get version."
        elif method == "PATCH":
            short_desc = "Update version."
        elif method == "DELETE":
            short_desc = "Delete version."
            long_desc = dedent(
                """\
            Note that this will also delete any localizations or states associated
            with the deleted version.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a version.",
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
                        "schema": {"$ref": "#/components/schemas/VersionUpdate"},
                        "example": {
                            "name": "New name",
                            "description": "New description",
                            "show_empty": True,
                            "bases": [1],
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of version.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Version",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "version")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "version")
        return responses
