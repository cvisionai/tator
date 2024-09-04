from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses


class JobClusterListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetJobClusterList"
        elif method == "POST":
            operation["operationId"] = "CreateJobCluster"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            description = dedent(
                """
                Get job clusters.
                """
            )

        elif method == "POST":
            description = dedent(
                """
                Create a job cluster.

                This endpoint replicates the job cluster creation through the admin portal.
                """
            )

        return description

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "organization",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying an organization.",
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
                        "schema": {"$ref": "#/components/schemas/JobClusterSpec"},
                    }
                },
            }

        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of registered job clusters.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/JobCluster"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("registered job cluster")
        return responses


class JobClusterDetailSchema(AutoSchema):
    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetJobCluster"
        elif method == "PATCH":
            operation["operationId"] = "UpdateJobCluster"
        elif method == "DELETE":
            operation["operationId"] = "DeleteJobCluster"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method) -> str:
        description = ""
        if method == "GET":
            description = "Get registered job cluster"
        elif method == "PATCH":
            description = "Updated registered job cluster"
        elif method == "DELETE":
            description = "Delete registered job cluster"
        return description

    def get_path_parameters(self, path, method) -> list:
        parameters = [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a registered job cluster.",
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
                        "schema": {"$ref": "#/components/schemas/JobClusterSpec"},
                        "example": {
                            "name": "New unique name",
                            "host": "New hostname",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of job cluster.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/JobCluster",
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "registered job cluster")
        elif method == "PATCH":
            responses["201"] = message_schema("update", "job cluster")
        return responses
