from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._attributes import attribute_filter_parameter_schema

class SectionAnalysisSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetSectionAnalysis'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Retrieve analysis results for a media list.

        This endpoint uses objects created with the `Analysis` endpoint to perform analysis
        on filtered media lists.
        """)

    def get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        return [
            {
                'name': 'media_id',
                'in': 'query',
                'required': False,
                'description': 'Unique integer identifying a media. Use this to do analyis '
                               'on a single file instead of sections.',
                'explode': False,
                'schema': {
                    'type': 'array',
                    'items': {
                        'type': 'integer',
                        'minimum': 1,
                    },
                },
            },
        ] + attribute_filter_parameter_schema

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of section analysis.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/SectionAnalysis',
                }}},
            }
        return responses

