from rest_framework.schemas.openapi import AutoSchema

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
        responses = {}
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of project list.'}
        elif method == 'POST':
            responses['201'] = {
                'description': 'Successful creation of project.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
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
        responses = {}
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of project.'}
        elif method in ['PATCH', 'PUT']:
            responses['200'] = {'description': 'Successful update of project.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of project.'}
        return responses
