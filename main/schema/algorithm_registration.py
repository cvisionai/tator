from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_with_id_schema

class AlgorithmRegistrationSchema(AutoSchema):
    def get_operation(self, path, method):
        """ Overriden method. Please refer to parent for documentation
        """
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'RegisterAlgorithm'
        operation['tags'] = ['Tator']
        return operation
    
    def get_description(self, path, method):
        """ Overriden method. Please refer to parent for documentation
        """
        return "Register algorithm workflow using an already saved algorithm manifest."

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/Algorithm'},
            }}}

        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = {
                'description': 'Successful registration of algorithm.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Algorithm',
                }}}
            }
        return responses