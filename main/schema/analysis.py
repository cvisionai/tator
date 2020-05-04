from rest_framework.schemas.openapi import AutoSchema

analysis_properties = {
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
}

class AnalysisListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAnalysisList'
        elif method == 'POST':
            operation['operationId'] = 'CreateAnalysis'
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
                    'properties': analysis_properties,
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
        responses = {}
        if method == 'GET':
            responses['404'] = {'description': 'Failure to find project with given ID.'}
            responses['400'] = {'description': 'Bad request.'}
            responses['200'] = {
                'description': 'Successful retrieval of analyses.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            **analysis_properties,
                            'project': {
                                'type': 'integer',
                                'description': 'Unique integer identifying a project.',
                            },
                            'resourcetype': {
                                'type': 'string',
                                'description': 'Analysis type.',
                                'enum': ['AnalysisCount',],
                            },
                        },
                    },
                }}},
            }
        elif method == 'POST':
            responses['404'] = {
                'description': 'Not found.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message explaining not found error.',
                        },
                    },
                }}},
            }
            responses['400'] = {
                'description': 'Bad request.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Error message for bad request.',
                        },
                        'details': {
                            'type': 'string',
                            'description': 'Detailed error message for bad request.',
                        },
                    },
                }}},
            }
            responses['201'] = {
                'description': 'Successful creation of analysis.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message indicating successful creation.',
                        },
                        'id': {
                            'type': 'integer',
                            'description': 'Unique integer identifying the created object.',
                        },
                    },
                }}}
            }
        return responses
