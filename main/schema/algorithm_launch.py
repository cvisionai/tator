from rest_framework.schemas.openapi import AutoSchema

class AlgorithmLaunchSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateAlgorithmLaunch'
        operation['tags'] = ['Algorithm']
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
                    'required': ['algorithm_name'],
                    'properties': {
                        'algorithm_name': {
                            'description': 'Name of the algorithm to execute.',
                            'type': 'string',
                        },
                        'media_query': {
                            'description': 'Query string used to filter media IDs. If '
                                           'supplied, media_ids will be ignored.',
                            'type': 'string',
                        },
                        'media_ids': {
                            'description': 'List of media IDs. Must supply media_query '
                                           'or media_ids.',
                            'type': 'array',
                            'items': {'type': 'integer'},
                        },
                    },
                },
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
        responses = {}
        if method == 'POST':
            responses['404'] = {
                'description': 'Failure to find the algorithm with the given name.',
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
                'description': 'Successful launch of algorithm.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message indicating successful launch.',
                        },
                        'run_uids': {
                            'type': 'array',
                            'description': 'A list of uuid1 strings identifying each job '
                                           'started.',
                            'items': {'type': 'string'},
                        },
                        'group_id': {
                            'type': 'string',
                            'description': 'A uuid1 string identifying the group of jobs '
                                           'started.',
                        },
                    },
                }}}
            }
        return responses

