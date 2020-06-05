from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

class VersionListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateVersion'
        elif method == 'GET':
            operation['operationId'] = 'GetVersionList'
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
        params = []
        if method == 'GET':
            params = [{
                'name': 'media_id',
                'in': 'query',
                'required': False,
                'description': 'Unique integer identifying a media.',
                'schema': {'type': 'integer'},
            }]
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/VersionSpec'},
                'example': {
                    'name': 'My new version',
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = message_with_id_schema('version')
        elif method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of version list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Version'},
                }}},
            }
        return responses

class VersionDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetVersion'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateVersion'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteVersion'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a version.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/VersionSpec'},
                'example': {
                    'name': 'New name',
                    'description': 'New description',
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of version.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Version',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'version')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of version.'}
        return responses
