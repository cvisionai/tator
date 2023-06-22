from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses


class GetClipSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetClip"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Get video clip.

        Facility to get a clip from the server. Returns a temporary file object that expires in 24 hours.
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
            params = [
                {
                    "name": "frame_ranges",
                    "in": "query",
                    "required": True,
                    "description": "Comma-seperated list of frame ranges to capture.",
                    "explode": False,
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                    },
                    "example": ["0:30", "50:90"],
                },
                {
                    "name": "quality",
                    "in": "query",
                    "required": False,
                    "description": "Source resolution to use (default to highest quality)",
                    "schema": {
                        "type": "integer",
                        "minimum": 0,
                    },
                },
                {
                    "name": "reencode",
                    "in": "query",
                    "required": False,
                    "description": "Re-encode to a h264 codec (assumes veryfast) profile (>0 = true, 0 == false)",
                    "schema": {
                        "type": "integer",
                        "minimum": 0,
                    },
                },
            ]
        return params

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of video clip.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/VideoClip",
                        }
                    }
                },
            }
        return responses
