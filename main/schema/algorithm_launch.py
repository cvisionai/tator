from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class AlgorithmLaunchSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'AlgorithmLaunch'
        operation['tags'] = ['Tator']
        return operation

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
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/AlgorithmLaunchSpec'},
                'examples': {
                    'by_query': {
                        'summary': 'Launch by query',
                        'value': {
                            'algorithm_name': 'My Algorithm',
                            'media_query': '?project=1&type=2',
                        },
                    },
                    'by_ids': {
                        'summary': 'Launch by media ids',
                        'value': {
                            'algorithm_name': 'My Algorithm',
                            'media_ids': [1, 5, 10],
                        },
                    },
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = {
                'description': 'Successful launch of algorithm.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/AlgorithmLaunchResponse',
                }}}
            }
        return responses

