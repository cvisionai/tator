from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

class ProjectListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateProject'
        elif method == 'GET':
            operation['operationId'] = 'GetProjectList'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return []

    def _get_filter_parameters(self, path, method):
        return {}

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schema/ProjectSpec'},
                'example': {
                    'name': 'My Project',
                    'summary': 'First project',
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of project list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schema/Project'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('project')
        return responses

class ProjectDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetProject'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateProject'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteProject'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schema/ProjectSpec'},
                'example': {
                    'name': 'New name',
                    'summary': 'New summary',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of project.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schema/Project',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'project')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of project.'}
        return responses
