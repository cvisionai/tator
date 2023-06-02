from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

from .components.algorithm import alg_fields as fields


class AlgorithmListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetAlgorithmList"
        elif method == "POST":
            operation["operationId"] = "RegisterAlgorithm"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            description = dedent(
                """\
            Get registered algorithms.
            """
            )

        elif method == "POST":
            description = dedent(
                """\
            Register an algorithm argo workflow.

            This endpoint replicates the algorithm registration through the admin portal.
            The provided manifest file must have been uploaded and saved by the
            SaveAlgorithmManifest endpoint. This endpoint will respond with an error if
            one of the following conditions occur:

            - Provided workflow name is not unique (across projects)
            - Not all the required fields are present
            - There are syntax errors with the given manifest file
            """
            )

        return description

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
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/AlgorithmSpec"},
                    }
                },
            }

        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of registered algorithms.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Algorithm"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("registered algorithm")
        return responses


class AlgorithmDetailSchema(AutoSchema):
    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetAlgorithm"
        elif method == "PATCH":
            operation["operationId"] = "UpdateAlgorithm"
        elif method == "DELETE":
            operation["operationId"] = "DeleteAlgorithm"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method) -> str:
        description = ""
        if method == "GET":
            description = "Get registered algorithm workflow"
        elif method == "PATCH":
            description = "Updated registered algorithm workflow"
        elif method == "DELETE":
            description = "Delete registered algorithm workflow"
        return description

    def get_path_parameters(self, path, method) -> list:
        parameters = [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a registered algorithm workflow.",
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
                        "schema": {"$ref": "#/components/schemas/AlgorithmSpec"},
                        "example": {
                            fields.name: "New unique name",
                            fields.manifest: "Server path to new manifest file",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of algorithm.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Algorithm",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "registered algorithm")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "registered algorithm")
        return responses
