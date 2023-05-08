from textwrap import dedent
from types import SimpleNamespace

from rest_framework.schemas.openapi import AutoSchema


class LocalizationGraphicSchema(AutoSchema):
    """Gets a thumbnail image of the localization

    #TODO Future work:
    1. Endpoint can patch and modify the thumbnail of the localization
    2. Provide margins that are relative instead of absolute
    3. Draw the localization in the thumbnail
    4. Add a mode to use existing thumbnails

    """

    # Parameters names
    PARAM_ARG_MODE = "mode"
    PARAMS_IMAGE_SIZE = "force_scale"
    PARAMS_USE_DEFAULT_MARGINS = "use_default_margins"
    PARAMS_MARGIN_X = "margin_x"
    PARAMS_MARGIN_Y = "margin_y"

    # Margins (x,y pixels) to use if defaults are requested
    DEFAULT_MARGIN_DOT = SimpleNamespace(x=10, y=10)
    DEFAULT_MARGIN_LINE = SimpleNamespace(x=10, y=10)
    DEFAULT_MARGIN_BOX = SimpleNamespace(x=0, y=0)

    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetLocalizationGraphic"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Get localization graphic from a media object.
        """
        )

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a localization.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        valid_for_non_default_margins_message = (
            f"Valid only if {self.PARAMS_USE_DEFAULT_MARGINS} is false. "
        )

        params = []
        if method == "GET":
            params = [
                {
                    "name": self.PARAMS_IMAGE_SIZE,
                    "in": "query",
                    "required": False,
                    "description": f"Size of final image to return. This forces scaling the image. "
                    "Default is the localization size and margins define the image size. "
                    + "Example: 100x100 ",
                    "schema": {
                        "type": "string",
                    },
                },
                {
                    "name": self.PARAMS_USE_DEFAULT_MARGINS,
                    "in": "query",
                    "required": False,
                    "description": f"Use default margins for localization types. "
                    + f" Default margins (x,y pixels) - "
                    + f"dot: ({self.DEFAULT_MARGIN_DOT.x},{self.DEFAULT_MARGIN_DOT.y}) "
                    + f"line:  ({self.DEFAULT_MARGIN_LINE.x},{self.DEFAULT_MARGIN_LINE.y}) "
                    + f"box: ({self.DEFAULT_MARGIN_BOX.x},{self.DEFAULT_MARGIN_BOX.y}) ",
                    "schema": {
                        "type": "boolean",
                        "default": True,
                    },
                },
                {
                    "name": self.PARAMS_MARGIN_X,
                    "in": "query",
                    "required": False,
                    "description": f"Pixel margin to apply to the height of the localization when generating the image. "
                    + valid_for_non_default_margins_message,
                    "schema": {
                        "type": "integer",
                    },
                },
                {
                    "name": self.PARAMS_MARGIN_Y,
                    "in": "query",
                    "required": False,
                    "description": f"Pixel margin to apply to the width of the localization when generating the image. "
                    + valid_for_non_default_margins_message,
                    "schema": {
                        "type": "integer",
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
