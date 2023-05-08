from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses


class NotifySchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "Notify"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Send a notification to administrators.

        Uses the Slack API to send a notification to system administrators. This
        endpoint can only be used by system administrators and must be configured
        in a Tator deployment's settings.
        """
        )

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/NotifySpec"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["503"] = {"description": "Service not available."}
            responses["201"] = {"description": "Message sent successfully."}
        return responses
