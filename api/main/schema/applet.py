from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

from .components.applet import applet_fields as fields

boilerplate = dedent(
    """\
Applets are customized interfaces (i.e. html files) displayed within the Tator projects.
"""
)


class AppletListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetAppletList"
        elif method == "POST":
            operation["operationId"] = "RegisterApplet"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get applet list."

        elif method == "POST":
            short_desc = "Create applet."

        return f"{short_desc}\n\n{boilerplate}"

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
        return {}

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/AppletSpec"},
                    }
                },
            }

        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of applet list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Applet"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("registered applet")
        return responses


class AppletDetailSchema(AutoSchema):
    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetApplet"
        elif method == "PATCH":
            operation["operationId"] = "UpdateApplet"
        elif method == "DELETE":
            operation["operationId"] = "DeleteApplet"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method) -> str:
        description = ""
        if method == "GET":
            description = "Get registered applet file"
        elif method == "PATCH":
            description = "Updated registered applet file"
        elif method == "DELETE":
            description = "Delete registered applet file"
        return description

    def get_path_parameters(self, path, method) -> list:
        parameters = [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a registered applet file.",
                "schema": {"type": "integer"},
            }
        ]

        return parameters

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method) -> dict:
        body = {}
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/AppletSpec"},
                        "example": {
                            fields.name: "New applet name",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of applet.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Applet",
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "registered applet")
        return responses
