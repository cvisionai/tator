from rest_framework.schemas.openapi import AutoSchema
from ._errors import error_responses

from textwrap import dedent

boilerplate = dedent(
    """\
A Permalink allows persistant access to an underlying media resource via a persistent URL.
"""
)


class PermalinkSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetPermalink"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        short_desc = ""
        long_desc = ""
        if method == "GET":
            short_desc = "Get permalink"
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a media.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        params = []
        if method == "GET":
            params = [
                {
                    "name": "element",
                    "in": "query",
                    "required": False,
                    "description": "Object to redirect to via 301.",
                    "schema": {
                        "type": "string",
                        "enum": [
                            "auto",
                            "streaming",
                            "archival",
                            "audio",
                            "image",
                            "thumbnail",
                            "thumbnail_gif",
                        ],
                        "default": "auto",
                    },
                },
                {
                    "name": "quality",
                    "in": "query",
                    "required": False,
                    "description": "Find the object with the closest quality (ignored for audio)",
                    "schema": {"type": "integer", "minimum": 0, "default": 720},
                },
            ]
        return params

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["301"] = {
                "description": "Redirect to requested Entity",
            }
        return responses
