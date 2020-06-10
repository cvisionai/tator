from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class AlgorithmListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAlgorithmList'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Get algorithms.

        Algorithms must be registered to a project as an argo workflow. For 
        instructions on how to register an algorithm, see the documentation
        on `GitHub`_.

        .. _GitHub:
           https://github.com/cvisionai/tator/tree/master/examples/algorithms
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
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of registered algorithms.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Algorithm'},
                }}},
            }
        return responses

