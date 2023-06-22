from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

boilerplate = dedent(
    """\
Allows for redirection to Oauth2 authentication providers
"""
)


class Oauth2LoginSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetOauth2LoginSchema"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return boilerplate

    # def get_filter_parameters(self, path, method):
    #     params = []
    #     return params
