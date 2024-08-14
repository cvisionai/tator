from textwrap import dedent
from types import SimpleNamespace

from rest_framework.schemas.openapi import AutoSchema


class RoiGraphicSchema(AutoSchema):
    """Gets a ROI image
    """
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetRoiGraphic"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Get ROI graphic for a media object.
        """
        )

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        params = []
        if method == "GET":
            params = [
                {
                    "name": "x",
                    "in": "query",
                    "required": True,
                    "description": f"Normalized x coordinate of top left of ROI.",
                    "schema": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1.0,
                    },
                },
                {
                    "name": "y",
                    "in": "query",
                    "required": True,
                    "description": f"Normalized y coordinate of top left of ROI.",
                    "schema": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1.0,
                    },
                },
                {
                    "name": "width",
                    "in": "query",
                    "required": True,
                    "description": f"Normalized width of ROI.",
                    "schema": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1.0,
                    },
                },
                {
                    "name": "height",
                    "in": "query",
                    "required": True,
                    "description": f"Normalized height of ROI.",
                    "schema": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1.0,
                    },
                },
                {
                    "name": "frame",
                    "in": "query",
                    "required": False,
                    "description": f"Frame number (if the media is a video).",
                    "schema": {
                        "type": "integer",
                        "minimum": 0,
                    },
                },
                {
                    "name": "encoded_media",
                    "in": "query",
                    "required": True,
                    "description": f"Base64 encoded JSON string representing a `Media` object.",
                    "schema": {
                        "type": "string",
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
                "description": "Successful retrieval of localization graphic.",
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
