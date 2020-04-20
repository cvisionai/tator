from rest_framework.schemas.openapi import AutoSchema

class AlgorithmLaunchSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
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
                            'description': 'Query string used to filter media IDs. Must '
                                           'supply media_query or media_ids.',
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
        responses['404'] = {'description': 'Failure to find the algorithm with the given name.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['201'] = {
                'description': 'Successful update of attribute type.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
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

