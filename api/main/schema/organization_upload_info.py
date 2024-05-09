from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses


class OrganizationUploadInfoSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetOrganizationUploadInfo"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Retrieve URL for file upload to a given organization.
        """
        )

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "organization",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying an organization.",
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
