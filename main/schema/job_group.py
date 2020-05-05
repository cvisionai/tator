from rest_framework.schemas.openapi import AutoSchema

from ._message import message
from ._errors import error_responses

class JobGroupDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'DELETE':
            operation['operationId'] = 'DeleteJobGroup'
        operation['tags'] = ['Job']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'group_id',
            'in': 'path',
            'required': True,
            'description': 'A uuid1 string identifying a group of jobs.',
            'schema': {'type': 'string'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'DELETE':
            responses['204'] = message('cancellation', 'job group')
        return responses

