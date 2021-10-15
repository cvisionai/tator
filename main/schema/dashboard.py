from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

from .components.dashboard import dashboard_fields as fields

boilerplate = dedent("""\
Dashboards are customized interfaces (i.e. html files) displayed within the Tator projects.
""")

class DashboardListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetDashboardList'
        elif method == 'POST':
            operation['operationId'] = 'RegisterDashboard'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        if method == 'GET':
            short_desc = "Get dashboard list."

        elif method == "POST":
            short_desc = "Create dashboard."

        return f"{short_desc}\n\n{boilerplate}"

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
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/DashboardSpec'},
            }}}

        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of dashboard list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Dashboard'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('registered dashboard')
        return responses

class DashboardDetailSchema(AutoSchema):

    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetDashboard'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateDashboard'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteDashboard'
        operation['tags'] = ['Tator']
        return operation
    
    def get_description(self, path, method) -> str:
        description = ''
        if method == 'GET':
            description = 'Get registered dashboard file'
        elif method == 'PATCH':
            description = 'Updated registered dashboard file'
        elif method == 'DELETE':
            description = 'Delete registered dashboard file'
        return description

    def _get_path_parameters(self, path, method) -> list:
        parameters = [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a registered dashboard file.',
            'schema': {'type': 'integer'},
            }]

        return parameters

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method) -> dict:
        body = {}
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/DashboardSpec'},
                'example': {
                    fields.name: 'New dashboard name',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of dashboard.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Dashboard',
                }}},
            }
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'registered dashboard')
        return responses