from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

from .components.report import report_fields as fields

boilerplate = dedent("""\
Reports are html files that typically display results from workflows.
""")

class ReportListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetReportList'
        elif method == 'POST':
            operation['operationId'] = 'RegisterReport'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        if method == 'GET':
            short_desc = "Get report list."

        elif method == "POST":
            short_desc = "Create report."

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
                'schema': {'$ref': '#/components/schemas/ReportSpec'},
            }}}

        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of report list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Report'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('registered report')
        return responses

class ReportDetailSchema(AutoSchema):

    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetReport'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateReport'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteReport'
        operation['tags'] = ['Tator']
        return operation
    
    def get_description(self, path, method) -> str:
        description = ''
        if method == 'GET':
            description = 'Get registered report file'
        elif method == 'PATCH':
            description = 'Updated registered report file'
        elif method == 'DELETE':
            description = 'Delete registered report file'
        return description

    def _get_path_parameters(self, path, method) -> list:
        parameters = [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a registered report file.',
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
                'schema': {'$ref': '#/components/schemas/ReportSpec'},
                'example': {
                    fields.name: 'New report name',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of report.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Report',
                }}},
            }
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'registered report')
        return responses