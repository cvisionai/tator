from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses


class DownloadInfoSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "GetDownloadInfo"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Retrieve URL for one or more file downloads from a given project.
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
        if method == "POST":
            params = [
                {
                    "name": "expiration",
                    "in": "query",
                    "required": False,
                    "description": "Number of seconds until URL expires and becomes invalid.",
                    "schema": {"type": "integer", "minimum": 1, "maximum": 86400, "default": 86400},
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
                        "schema": {"$ref": "#/components/schemas/DownloadInfoSpec"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["201"] = {
                "description": "Information required for download.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/DownloadInfo"},
                        }
                    }
                },
            }
        return responses
