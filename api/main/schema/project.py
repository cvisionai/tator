from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._type_query import type_filter_parameter_schema

boilerplate = dedent(
    """\
Projects are the object under which all data in Tator is grouped, including user
access, metadata definitions, media, and annotations. Data does not cross boundaries
between projects.
"""
)


class ProjectListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateProject"
        elif method == "GET":
            operation["operationId"] = "GetProjectList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get project list."
            long_desc = "Returns all projects that a user has access to."
        elif method == "POST":
            short_desc = "Create project."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        return [
            {
                "name": "organization",
                "in": "query",
                "required": False,
                "description": "Unique integer identifying an organization.",
                "schema": {"type": "integer", "minimum": 1},
            },
            *type_filter_parameter_schema,
        ]

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ProjectSpec"},
                        "example": {
                            "name": "My Project",
                            "summary": "First project",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of project list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Project"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("project")
        return responses


class ProjectDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetProject"
        elif method == "PATCH":
            operation["operationId"] = "UpdateProject"
        elif method == "DELETE":
            operation["operationId"] = "DeleteProject"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get project."
        elif method == "PATCH":
            short_desc = "Update project."
        elif method == "DELETE":
            short_desc = "Delete project."
            long_desc = dedent(
                """\
            Only project owners may delete a project. Note that deleting a project
            will also delete all media and annotations within a project.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
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
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ProjectUpdate"},
                        "example": {
                            "name": "New name",
                            "summary": "New summary",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of project.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Project",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "project")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "project")
        return responses
