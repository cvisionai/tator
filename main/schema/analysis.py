from rest_framework.schemas.openapi import AutoSchema

class AnalysisListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Analysis']
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
                'schema': {
                    'type': 'object',
                    'required': ['name', 'data_type'],
                    'properties': {
                        'name': {
                            'description': 'Name of analysis.',
                            'type': 'string',
                        },
                        'data_type': {
                            'description': 'A unique integer identifying an entity type '
                                           'to analyze.',
                            'type': 'integer',
                        },
                        'data_query': {
                            'description': 'Lucene query string used to retrieve entities '
                                           'to analyze.',
                            'type': 'string',
                            'default': '*',
                        },
                    },
                },
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
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['201'] = {'description': 'Successful creation of analysis.'}
        return responses
