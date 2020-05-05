from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class AnalysisListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAnalysisList'
        elif method == 'POST':
            operation['operationId'] = 'CreateAnalysis'
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
                'schema': {'$ref': '#/components/schemas/AnalysisSpec'},
                'examples': {
                    'count_all': {
                        'summary': 'Count all entities of the given type',
                        'value': {
                            'name': 'Boxes',
                            'data_type': 1,
                        },
                    },
                    'count_filter': {
                        'summary': 'Count all entities with confidence > 0.5',
                        'value': {
                            'name': 'High confidence boxes',
                            'data_type': 1,
                            'data_query': 'Confidence:>0.5',
                        },
                    },
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = {}
        if method == 'GET':
            responses['404'] = {'description': 'Failure to find project with given ID.'}
            responses['400'] = {'description': 'Bad request.'}
            responses['200'] = {
                'description': 'Successful retrieval of analyses.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/AnalysisList',
                }}},
            }
        elif method == 'POST':
            responses = error_responses()
            responses['201'] = {
                'description': 'Successful creation of analysis.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/CreateResponse',
                }}}
            }
        return responses
