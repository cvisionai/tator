from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses

boilerplate = dedent(
    """\
Algorithms create argo workflows that are annotated with two
uuid1 strings, one identifying the run and the other identifying the group.
Jobs that are submitted together have the same group id, but each workflow
has a unique run id.
"""
)


class JobListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateJobList"
        elif method == "GET":
            operation["operationId"] = "GetJobList"
        elif method == "DELETE":
            operation["operationId"] = "DeleteJobList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "POST":
            return dedent(
                """\
            Launch a registered algorithm.

            This will create one or more Argo workflows that execute the named algorithm
            registration. To get a list of available algorithms, use the `Algorithms` endpoint.
            A media list will be submitted for processing using either a query string or 
            a list of media IDs. If neither are included, the algorithm will be launched on
            all media in the project. 

            Media is divided into batches based on the `files_per_job` field of the 
            `Algorithm` object. One batch is submitted to each Argo workflow.

            Submitted algorithm jobs may be cancelled via the `Job` or `JobGroup` endpoints.
            """
            )
        elif method == "GET":
            short_desc = "Get background job list."
            long_desc = dedent(
                """\
            This method allows the user to status for a list of jobs in a project.
            """
            )
        elif method == "DELETE":
            short_desc = "Delete background job list."
            long_desc = dedent(
                """\
            This method allows the user to batch delete a list of jobs.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

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
        if method in ["GET", "DELETE"]:
            params = [
                {
                    "name": "gid",
                    "in": "query",
                    "required": False,
                    "description": "A UUID string identifying a group of jobs.",
                    "schema": {"type": "string"},
                },
                {
                    "name": "media_id",
                    "in": "query",
                    "required": False,
                    "description": "Comma-separated list of media IDs.",
                    "explode": False,
                    "schema": {
                        "type": "array",
                        "items": {"type": "integer"},
                },
    }
            ]
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/JobSpec"},
                        "examples": {
                            "by_query": {
                                "summary": "Launch by query",
                                "value": {
                                    "algorithm_name": "My Algorithm",
                                    "media_query": "?project=1&type=2",
                                },
                            },
                            "by_ids": {
                                "summary": "Launch by media ids",
                                "value": {
                                    "algorithm_name": "My Algorithm",
                                    "media_ids": [1, 5, 10],
                                },
                            },
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["201"] = {
                "description": "Successful launch of algorithm.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/CreateListResponse",
                        }
                    }
                },
            }
        elif method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of job list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Job"},
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "job list")
        return responses


class JobDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetJob"
        elif method == "DELETE":
            operation["operationId"] = "DeleteJob"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get background job."
            long_desc = dedent(
                """\
            This method allows the user to get a job's status using the `uid` returned
            by `Job` create method.
            """
            )
        elif method == "DELETE":
            short_desc = "Delete background job."
            long_desc = dedent(
                """\
            This method allows the user to cancel a job using the `uid` returned
            by `Job` create method.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "uid",
                "in": "path",
                "required": True,
                "description": "A uuid1 string identifying to single Job.",
                "schema": {"type": "string"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of job.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Job",
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "job")
        return responses
