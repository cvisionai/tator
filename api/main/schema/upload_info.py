from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses


class UploadInfoSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetUploadInfo"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Retrieve URL for file upload to a given project.
        """
        )

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
                    "name": "expiration",
                    "in": "query",
                    "required": False,
                    "description": "Number of seconds until URL expires and becomes invalid.",
                    "schema": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 604800,
                        "default": 86400,
                    },
                },
                {
                    "name": "num_parts",
                    "in": "query",
                    "required": False,
                    "description": "Number of upload parts. Maximum part size is 5GB.",
                    "schema": {"type": "integer", "minimum": 1, "maximum": 10000, "default": 1},
                },
                {
                    "name": "media_id",
                    "in": "query",
                    "required": False,
                    "description": "Media ID if this is an upload for existing media.",
                    "schema": {"type": "integer", "minimum": 1},
                },
                {
                    "name": "file_id",
                    "in": "query",
                    "required": False,
                    "description": "File ID if this is an upload for existing file.",
                    "schema": {"type": "integer", "minimum": 1},
                },
                {
                    "name": "filename",
                    "in": "query",
                    "required": False,
                    "description": "Filename to use if `media_id` is given. If a file with "
                    "the same name already exists under the given media ID "
                    "prefix, the new upload will replace it. Ignored if "
                    "`media_id` is not given.",
                    "schema": {"type": "string"},
                },
            ]
        return params

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Information required for upload via HTTP PUT.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/UploadInfo",
                        }
                    }
                },
            }
        return responses
