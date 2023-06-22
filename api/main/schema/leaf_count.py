from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._leaf_query import leaf_filter_parameter_schema
from ._attributes import attribute_filter_parameter_schema

boilerplate = dedent(
    """\
This endpoint accepts the same query parameters as a GET or PUT request to the `Leaves`
endpoint, but only returns the number of leaves.
"""
)


class LeafCountSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetLeafCount"
        elif method == "PUT":
            operation["operationId"] = "GetLeafCountById"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get leaf list count."
        elif method == "PUT":
            short_desc = "Get leaf list count by ID."
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
        if method in ["GET", "PUT"]:
            params = leaf_filter_parameter_schema + attribute_filter_parameter_schema
            # Remove search as it is not yet supported.
            params = [p for p in params if p["name"] != "search"]
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "PUT":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/LeafIdQuery",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method in ["GET", "PUT"]:
            responses["200"] = {
                "description": "Number of leaves in the list corresponding to query.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "integer",
                            "minimum": 0,
                        }
                    }
                },
            }
        return responses
