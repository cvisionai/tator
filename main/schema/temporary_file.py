from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

class TemporaryFileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateTemporaryFile'
        elif method == 'GET':
            operation['operationId'] = 'GetTemporaryFileList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteTemporaryFileList'
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
        params=[]
        if method in ['GET', 'DELETE']:
            params = [
                {
                    'name': 'expired',
                    'in': 'query',
                    'required': False,
                    'description': 'If greater than 0 will return only'
                                   ' expired files',
                    'explode': False,
                    'schema': {
                        'type': 'integer',
                        'default': 0
                    },
                },
            ]
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schema/TemporaryFileSpec'},
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of temporary file list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schema/TemporaryFile'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('temporary file')
        return responses

class TemporaryFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetTemporaryFile'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateTemporaryFile'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteTemporaryFile'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a temporary file.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of temporary file.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schema/TemporaryFile',
                }}},
            }
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of temporary file.'}
        return responses

