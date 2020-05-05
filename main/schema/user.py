from rest_framework.schemas.openapi import AutoSchema

class UserDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetUser'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateUser'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteUser'
        operation['tags'] = ['User']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a localization association.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

class CurrentUserSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'WhoAmI'
        operation['tags'] = ['User']
        return operation

    def _get_responses(self, path, method):
        responses = {
            '200': {
                'description': 'Successful retrieval of user who sent request.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'id': {
                            'type': 'integer',
                            'description': 'Unique integer identifying current user.',
                        },
                        'username': {
                            'type': 'string',
                            'description': 'Username of current user.',
                        },
                        'first_name': {
                            'type': 'string',
                            'description': 'First name of current user.',
                        },
                        'last_name': {
                            'type': 'string',
                            'description': 'Last name of current user.',
                        },
                        'email': {
                            'type': 'string',
                            'description': 'Email address of current user.',
                        },
                    },
                }}},
            },
        }
        return responses
