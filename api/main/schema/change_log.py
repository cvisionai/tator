from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._attribute_type import attribute_type_example
from ._entity_type_mixins import entity_type_filter_parameters_schema

change_log_filter_schema = [
    {
        "name": "user_id",
        "in": "query",
        "required": False,
        "description": "Filters ChangeLogs for the given user.",
        "schema": {"type": "integer"},
    },
    {
        "name": "entity_id",
        "in": "query",
        "required": False,
        "description": "Filters ChangeLogs for the given entity.",
        "schema": {"type": "integer"},
    },
    {
        "name": "entity_type",
        "in": "query",
        "required": False,
        "description": "Filters ChangeLogs for the given entity type.",
        "schema": {"type": "string", "enum": ["media", "localization", "state", "leaf"]},
    },
]

boilerplate = dedent(
    """
A ChangeLog is the object containing information about a change applied to an object. It includes
the time, user, and description of the change.
"""
)


class ChangeLogListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)

        if method == "GET":
            operation["operationId"] = "GetChangeLogList"

        operation["tags"] = ["Tator"]

        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get a list of change logs."

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
        params = []
        if method in ["GET"]:
            params += change_log_filter_schema
        return params

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of change log list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/ChangeLog"},
                        }
                    }
                },
            }
        return responses
