from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class SessionSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateSession'
        elif method == 'GET':
            operation['operationId'] = 'GetSession'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteSession'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        if method == 'POST':
            return dedent("""\
            Create a session.

            This method accepts login credentials and returns an CSRF token that
            can be used with the Tator REST API or tator-js. To use in a browser
            application, the client should set a cookie named csrftoken to the 
            value returned in the response to this method.
            """)
        elif method == 'GET':
            return dedent("""\
            Check if a session exists.

            This method will return a 200 status code if a session exists, 
            otherwise a 400 status code will be returned.
            """)
        elif method == 'DELETE':
            return dedent("""\
            Delete a session.

            This method logs a user out. If the requesting user is not logged
            in, it will return a 400 status code.
            """)

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Credentials',
                },
            }}}
        return body
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['200'] = {
                'description': 'Successful creation of session.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Token',
                }}},
            }
        elif method == 'GET':
            responses['200'] = message_schema('verfication', 'session')
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'session')
        return responses

