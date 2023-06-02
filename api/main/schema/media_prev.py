from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._media_query import media_filter_parameter_schema
from ._attributes import (
    attribute_filter_parameter_schema,
    related_attribute_filter_parameter_schema,
)


class MediaPrevSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetMediaPrev"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Retrieve ID of previous media in a media list.

        This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
        but only returns the previous media ID from the media passed as a path parameter. This 
        allows iteration through a media list without serializing the entire list, which may be 
        large.
        """
        )

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
                "description": "ID of previous media in the list corresponding to query.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/MediaPrev",
                        }
                    }
                },
            }
        return responses
