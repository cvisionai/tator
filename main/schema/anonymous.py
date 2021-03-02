from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

boilerplate = dedent("""\
Allows for logging into Tator as an anonymous user.
""")

class AnonymousGatewaySchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAnonymousGatewaySchema'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return boilerplate

