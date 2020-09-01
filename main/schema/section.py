from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses

boilerplate = dedent("""\
Sections represent groups of media using saved queries. The queries can be in the form
of a lucene query syntax search string or a list of boolean filter queries applied to
either media or child annotations of media.

https://lucene.apache.org/core/2_9_4/queryparsersyntax.html
https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html
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
        elif method == 'POST':
            short_desc = "Create section."
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
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/SectionSpec'},
            }}}

        return body

    def _get_responses(self, path, method):
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
        description = ''
        if method == 'GET':
            short_desc = "Get section."
        elif method == 'PATCH':
            short_desc = "Update section."
        elif method == 'DELETE':
            short_desc = "Delete section."
        return description

    def _get_path_parameters(self, path, method) -> list:
        parameters = [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a section.',
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
                'schema': {'$ref': '#/components/schemas/SectionSpec'},
                'example': {
                    'name': 'New unique name',
                    'lucene_string': 'My\\ Field:value*'
                }
            }}}
        return body

    def _get_responses(self, path, method):
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
