from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

from ._type_query import type_filter_parameter_schema

boilerplate = dedent("""\
Sections represent groups of media using saved queries.
""")

class SectionListSchema(AutoSchema):

    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetSectionList'
        elif method == 'POST':
            operation['operationId'] = 'CreateSection'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        if method == 'GET':
            short_desc = "Get section list."
            long_desc = ""
        elif method == 'POST':
            short_desc = "Create section."
            long_desc = "Note: In order for a section to be interpreted properly, the tator_user_sections attribute of the SectionSpec cannot be None. The front end assigns a uuid1 string for this attribute, but it is not required to follow this pattern."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        params = []
        if method == 'GET':
            params = [{
                'name': 'name',
                'in': 'query',
                'required': False,
                'description': 'Name of the section.',
                'schema': {'type': 'string'},
            }, *type_filter_parameter_schema]
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/SectionSpec'},
            }}}

        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of sections.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Section'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('section')
        return responses

class SectionDetailSchema(AutoSchema):

    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetSection'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateSection'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteSection'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method) -> str:
        if method == 'GET':
            short_desc = "Get section."
        elif method == 'PATCH':
            short_desc = "Update section."
        elif method == 'DELETE':
            short_desc = "Delete section."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method) -> list:
        parameters = [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a section.',
            'schema': {'type': 'integer'},
            }]

        return parameters

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method) -> dict:
        body = {}
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/SectionUpdate'},
            }}}
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of section.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Section',
                }}},
            }
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'section')
        return responses
