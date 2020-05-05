from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema

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

membership_schema = {
    'type': 'object',
    'description': 'Membership object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a membership.',
        },
        'username': {
            'description': 'Username for the membership.',
            'type': 'string',
        },
        'permission': {
            'description': 'User permission level for the project.',
            'type': 'string',
            'enum': ['view_only', 'can_edit', 'can_transfer', 'can_execute', 'full_control'],
        },
    },
}

class MembershipListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateMembership'
        elif method == 'GET':
            operation['operationId'] = 'GetMembershipList'
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
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of membership list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': membership_schema,
                }}},
            }
        elif method == 'POST':
            responses['201'] = {
                'description': 'Successful creation of membership.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message indicating successful creation of membership.',
                        },
                        'id': {
                            'type': 'integer',
                            'description': 'Unique integer identifying created membership.',
                        },
                    },
                }}},
            }
        return responses

class MembershipDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetMembership'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateMembership'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteMembership'
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
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of membership.',
                'content': {'application/json': {'schema': membership_schema}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('updated', 'membership')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of membership.'}
        return responses
