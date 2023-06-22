from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_with_id_list_schema
from ._errors import error_responses
from ._attributes import attribute_filter_parameter_schema
from ._media_query import media_filter_parameter_schema


class CloneMediaListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CloneMediaList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Clone media list.

        This method copies media to a different project without copying the 
        underlying files. It accepts the same query parameters as a `Media` `GET`
        request. All media matching the query will be copied to the project,
        media type, and section in the given request body. Section is passed as
        a section name; if the given section does not exist, it will be created.

        This endpoint will only clone up to 500 media per request. Use the `start`,
        `stop`, or `after` parameters to paginate a request.
        """
        )

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "project",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying the source project.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        params = []
        if method == "POST":
            params = media_filter_parameter_schema + attribute_filter_parameter_schema
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/CloneMediaSpec"},
                        "examples": {
                            "section": {
                                "summary": "Clone to section",
                                "value": {
                                    "dest_project": 1,
                                    "dest_type": 1,
                                    "dest_section": "My section",
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
            responses["201"] = message_with_id_list_schema("cloned media list")
        return responses


class GetClonedMediaSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetClonedMedia"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        desc = ""
        if method == "GET":
            desc = dedent(
                """
                Get cloned media.

                This method finds and returns the list of media ids that are clones of the
                given id.
                """
            )
        return desc

    def get_path_parameters(self, path, method):
        path_params = []
        if method == "GET":
            path_params = [
                {
                    "name": "id",
                    "in": "path",
                    "required": True,
                    "description": "A unique integer identifying a media object.",
                    "schema": {"type": "integer"},
                }
            ]
        return path_params

    def get_filter_parameters(self, path, method):
        params = []
        return params

    def get_request_body(self, path, method):
        body = {}
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "List of clones' ids of given media id.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/GetClonedMediaResponse",
                        }
                    }
                },
            }
        return responses
