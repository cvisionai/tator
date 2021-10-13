from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._attribute_type import attribute_type_example

boilerplate = dedent("""\
A report type is the metadata definition object for reports. It includes the name, description,
and any associated user defined attributes.
""")

class ReportTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateReportType'
        elif method == 'GET':
            operation['operationId'] = 'GetReportTypeList'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        if method == 'GET':
            short_desc = 'Get report type list.'
        elif method == 'POST':
            short_desc = 'Create report type.'
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
                'schema': {'$ref': '#/components/schemas/ReportTypeSpec'},
                'example': {
                    'name': 'My report type',
                    'attribute_types': attribute_type_example,
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of report type list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/ReportType'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('report type')
        return responses

class ReportTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetReportType'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateReportType'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteReportType'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        long_desc = ''
        if method == 'GET':
            short_desc = 'Get report type.'
        elif method == 'PATCH':
            short_desc = 'Update report type.'
        elif method == 'DELETE':
            short_desc = 'Delete report type.'
            long_desc = dedent("""\
            Note that this will also delete any reports associated with the report type.
            """)
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an report type.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/ReportTypeSpec'},
                'example': {
                    'name': 'New name',
                    'description': 'New description',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of report type.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/ReportType',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'report type')
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'report type')
        return responses
