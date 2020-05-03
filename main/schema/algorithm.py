from rest_framework.schemas.openapi import AutoSchema

class AlgorithmListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['operationId'] = 'GetAlgorithmList'
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
        return {}

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        if method == 'GET':
            responses['404'] = {'description': 'Failure to find project with given ID.'}
            responses['400'] = {'description': 'Bad request.'}
            responses['200'] = {
                'description': 'Successful retrieval of registered algorithms.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'id': {
                                'type': 'integer',
                                'description': 'Unique integer identifying the algorithm.',
                            },
                            'name': {
                                'type': 'string',
                                'description': 'Name of the algorithm.',
                            },
                            'description': {
                                'type': 'string',
                                'description': 'Description of the algorithm.',
                            },
                        },
                    },
                }}},
            }
        return responses

