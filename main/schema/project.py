from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema

project_properties = {
    'name': {
        'description': 'Name of the project.',
        'type': 'string',
    },
    'summary': {
        'description': 'Summary of the project.',
        'type': 'string',
        'default': '',
    },
}

project_get_schema = {
    'type': 'object',
    'description': 'Project object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the project.',
        },
        **project_properties,
        'thumb': {
            'type': 'string',
            'description': 'URL of thumbnail used to represent the project.',
        },
        'num_files': {
            'type': 'integer',
            'description': 'Number of files in the project.',
        },
        'size': {
            'type': 'integer',
            'description': 'Size of the project in bytes.',
        },
        'usernames': {
            'type': 'array',
            'description': 'List of usernames of project members.',
            'items': {
                'type': 'string',
            },
        },
        'permission': {
            'type': 'string',
            'description': 'Permission level of user making request.',
        },
    },
}

class ProjectListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateProject'
        elif method == 'GET':
            operation['operationId'] = 'GetProjectList'
        operation['tags'] = ['Project']
        return operation

    def _get_path_parameters(self, path, method):
        return []

    def _get_filter_parameters(self, path, method):
        return {}

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name'],
                    'properties': project_properties,
                },
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
                    'items': project_get_schema,
                }}},
            }
        elif method == 'POST':
            responses['201'] = {
                'description': 'Successful creation of project.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message indicating successful creation of project.',
                        },
                        'id': {
                            'type': 'integer',
                            'minimum': 1,
                            'description': 'ID of created project.',
                        },
                    },
                }}}
            }
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
        operation['tags'] = ['Project']
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
                'schema': {
                    'type': 'object',
                    'properties':  project_properties,
                },
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
                'content': {'application/json': {'schema': project_get_schema}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'project')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of project.'}
        return responses
