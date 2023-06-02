from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._media_query import media_filter_parameter_schema
from ._attributes import (
    attribute_filter_parameter_schema,
    related_attribute_filter_parameter_schema,
)


class TranscodeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "Transcode"
        elif method == "GET":
            operation["operationId"] = "GetTranscodeList"
        elif method == "DELETE":
            operation["operationId"] = "DeleteTranscodeList"
        elif method == "PUT":
            operation["operationId"] = "GetTranscodeListById"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "POST":
            short_desc = "Start a transcode."
            long_desc = dedent(
                """\
            Videos in Tator must be transcoded to a multi-resolution streaming format before they
            can be viewed or annotated. This endpoint launches a transcode on raw uploaded video by
            creating an Argo workflow. The workflow will download the uploaded raw video, transcode
            it to the proper format, upload the transcoded video, and save the video using the 
            `VideoFile`, `AudioFile`, and `ImageFile` endpoints. The transcode can be launched on an
            existing media object, or a media object will be created.
            """
            )
        elif method == "GET":
            short_desc = "Get transcode list."
            long_desc = dedent(
                """\
            Get a list of active transcodes. This method accepts parameters that filter on 
            `Media` in which case only transcodes on the filtered media list will be returned.
            """
            )
        elif method == "DELETE":
            short_desc = "Delete transcode list."
            long_desc = dedent(
                """\
            This method performs a bulk delete on all transcodes matching a query. It is 
            recommended to use a GET request first to check what is being deleted.
            """
            )
        elif method == "PUT":
            short_desc = "Get transcode list by ID."
            long_desc = dedent(
                """\
            Get a list of active transcodes. This method accepts parameters that filter on 
            `Media` in which case only transcodes on the filtered media list will be returned.
            This method allows a request body containing additional query parameters.
            """
            )
        return f"{short_desc}\n\n{long_desc}"

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
        if method in ["GET", "PUT", "DELETE"]:
            params = (
                media_filter_parameter_schema
                + attribute_filter_parameter_schema
                + related_attribute_filter_parameter_schema
            )
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/TranscodeSpec"},
                    }
                },
            }
        elif method == "PUT":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/MediaIdQuery",
                        },
                    }
                },
            }
        elif method == "DELETE":
            body = {
                "required": False,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/MediaIdQuery",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["201"] = message_with_id_schema("transcode")
        elif method in ["GET", "PUT"]:
            responses["200"] = {
                "description": "Successful retrieval of transcode list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Transcode"},
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "transcode list")
        return responses


class TranscodeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetTranscode"
        elif method == "DELETE":
            operation["operationId"] = "DeleteTranscode"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get transcode job."
            long_desc = dedent(
                """\
            This method allows the user to get a transcode's status using the `uid` returned
            by `Transcode` create method.
            """
            )
        elif method == "DELETE":
            short_desc = "Delete transcode job."
            long_desc = dedent(
                """\
            This method allows the user to cancel a transcode using the `uid` returned
            by `Transcode` create method.
            """
            )
        return f"{short_desc}\n\n{long_desc}"

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
                "description": "Successful retrieval of transcode job.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Transcode",
                        }
                    }
                },
            }
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "transcode")
        return responses
