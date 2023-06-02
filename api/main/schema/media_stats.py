from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._media_query import media_filter_parameter_schema
from ._attributes import (
    attribute_filter_parameter_schema,
    related_attribute_filter_parameter_schema,
)


class MediaStatsSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetMediaStats"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Retrieve count, download size, total size, and duration of a media list.

        This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
        but only returns statistics about the media.
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
            params = (
                media_filter_parameter_schema
                + attribute_filter_parameter_schema
                + related_attribute_filter_parameter_schema
            )
        return params

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Statistics corresponding to media list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/MediaStats",
                        }
                    }
                },
            }
        return responses
