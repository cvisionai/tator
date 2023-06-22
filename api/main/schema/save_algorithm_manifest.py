from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_with_id_schema


class SaveAlgorithmManifestSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "SaveAlgorithmManifest"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Saves an uploaded algorithm manifest to the desired project. It is expected this manifest
        corresponds with an algorithm workflow to be registered by another endpoint.

        Manifest is uploaded via tus, a separate mechanism from the REST API. Once a manifest
        upload is complete (a .yaml file), the file must be saved to the database using
        this endpoint.
        """
        )

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "project",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a project",
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
                        "schema": {"$ref": "#/components/schemas/AlgorithmManifestSpec"},
                    }
                },
            }

        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["201"] = {
                "description": "Successful save of algortihm manifest.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/AlgorithmManifest",
                        }
                    }
                },
            }
        return responses
