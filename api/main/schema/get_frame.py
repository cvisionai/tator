from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema


class GetFrameSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetFrame"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Get frame(s) from a video.

        Facility to get a frame(jpg/png) of a given video frame, returns a square tile of
        frames based on the input parameter.
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
                    "name": "frames",
                    "in": "query",
                    "required": False,
                    "description": "Comma-seperated list of frames to capture.",
                    "explode": False,
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "integer",
                            "minimum": 0,
                        },
                        "maxLength": 32,
                        "default": [0],
                    },
                    "example": [0, 100, 200],
                },
                {
                    "name": "tile",
                    "in": "query",
                    "required": False,
                    "description": "wxh, if not supplied is made as squarish as possible.",
                    "schema": {"type": "string"},
                },
                {
                    "name": "roi",
                    "in": "query",
                    "required": False,
                    "description": "w:h:x:y, optionally crop each frame to a given roi in "
                    "relative coordinates.",
                    "schema": {"type": "string"},
                },
                {
                    "name": "force_scale",
                    "in": "query",
                    "required": False,
                    "description": f"Size of each frame image to return in format wxh. This forces "
                    "scaling the image. Applied after ROI crop if any."
                    "Default is the size of the frame for highest streaming resolution. "
                    + "Example: 1024x768",
                    "schema": {
                        "type": "string",
                    },
                },
                {
                    "name": "animate",
                    "in": "query",
                    "required": False,
                    "description": "If not tiling, animate each frame at a given fps in a gif.",
                    "schema": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 15,
                    },
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
            ]
        return params

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = {}
        if method == "GET":
            responses["404"] = {
                "description": "Not found.",
                "content": {
                    "image/*": {
                        "schema": {
                            "type": "string",
                            "format": "binary",
                        }
                    }
                },
            }
            responses["400"] = {
                "description": "Bad request.",
                "content": {
                    "image/*": {
                        "schema": {
                            "type": "string",
                            "format": "binary",
                        }
                    }
                },
            }
            responses["200"] = {
                "description": "Successful retrieval of frame image.",
                "content": {
                    "image/*": {
                        "schema": {
                            "type": "string",
                            "format": "binary",
                        }
                    }
                },
            }
        return responses
