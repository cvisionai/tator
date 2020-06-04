from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

class MembershipListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateMembership'
        elif method == 'GET':
            operation['operationId'] = 'GetMembershipList'
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
        return {}

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schema/MembershipSpec'},
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
                    'items': {'$ref': '#/components/schema/Membership'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('membership')
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
        operation['tags'] = ['Tator']
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
                'schema': {'$ref': '#/components/schema/MembershipUpdate'},
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
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schema/Membership',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'membership')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of membership.'}
        return responses
