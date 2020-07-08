from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

class AlgorithmListSchema(AutoSchema):
    """
    """

    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAlgorithmList'
        elif method == 'POST':
            operation['operationId'] = 'RegisterAlgorithm'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        if method == 'GET':
            description = dedent("""\
            Get algorithms.

            Algorithms must be registered to a project as an argo workflow. For 
            instructions on how to register an algorithm, see the documentation: 

            <https://github.com/cvisionai/tator/tree/master/examples/algorithms>
            """)

        elif method == 'POST':
            description = dedent("""\
            Register an algorithm argo workflow.

            This endpoint replicates the algorithm registration through the admin portal.
            The provided manifest file must have been uploaded and saved by the
            SaveAlgorithmManifest endpoint. This endpoint will respond with an error if
            one of the following conditions occur:

            - Provided name is not unique
            - 
            """)

        return description

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
                'schema': {'$ref': '#/components/schemas/AlgorithmSpec'},
            }}}

        return body

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
        elif method == 'POST':
            responses['201'] = message_with_id_schema('registered algorithm')
        return responses

class AlgorithmDetailSchema(AutoSchema):
    """ #TODO
    """

    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'DELETE':
            operation['operationId'] = 'DeleteAlgorithm'
        operation['tags'] = ['Tator']
        return operation
    
    def get_description(self, path, method):
        description = ''
        if method == 'DELETE':
            description = 'Delete registered algorithm workflow'
        return description

    def _get_path_parameters(self, path, method):
        parameters = [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a registered algorithm workflow.',
            'schema': {'type': 'integer'},
            }]

        return parameters

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'DELETE':
            responses['200'] = message_schema('deletion', 'registered algorithm')
        return responses
