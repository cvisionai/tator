from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._annotation_query import annotation_filter_parameter_schema
from ._attributes import attribute_filter_parameter_schema

class StateCountSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetStateCount'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Retrieve count of states in a state list.

        This endpoint accepts the same query parameters as a GET request to the `States` endpoint,
        but only returns the number of states.
        """)

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        params = []
        if method  == 'GET':
            params = annotation_filter_parameter_schema + attribute_filter_parameter_schema
        return params

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Number of states in the list corresponding to query.',
                'content': {'application/json': {'schema': {
                    'type': 'integer',
                    'minimum': 0,
                }}}
            }
        return responses
