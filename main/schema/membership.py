from rest_framework.schemas.openapi import AutoSchema

membership_properties = {
    'user': {
        'description': 'Unique integer identifying a user.',
        'type': 'integer',
        'minimum': 1,
    },
    'permission': {
        'description': 'User permission level for the project.',
        'type': 'string',
        'enum': ['View Only', 'Can Edit', 'Can Transfer', 'Can Execute', 'Full Control'],
    },
}

class MembershipListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'RetrieveMembershipList'
        operation['tags'] = ['Membership']
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
        return {}

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name', 'dtype'],
                    'properties': membership_properties,
                },
                'example': {
                    'user': 1,
                    'permission': 'Full Control',
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of membership list.'}
        elif method == 'POST':
            responses['201'] = {'description': 'Successful creation of membership.'}
        return responses

class MembershipDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Membership']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a membership.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'properties': {
                        'permission': membership_properties['permission'],
                    },
                },
                'example': {
                    'permission': 'View Only',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find membership with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of membership.'}
        elif method in ['PATCH', 'PUT']:
            responses['200'] = {'description': 'Successful update of membership.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of membership.'}
        return responses
