from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses

from .components.analysis import fields

boilerplate = dedent("""\
Analysis objects are used to display information about filtered media lists
and/or annotations on the project detail page of the web UI. Currently only
counting analysis is supported.
""")

class AnalysisListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAnalysisList'
        elif method == 'POST':
            operation['operationId'] = 'CreateAnalysis'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        short_desc = ''
        if method == 'GET':
            short_desc = 'Get analysis.'
        elif method == 'POST':
            short_desc = 'Create analysis.'
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/AnalysisSpec'},
                'examples': {
                    'count_all': {
                        'summary': 'Count all entities of the given type',
                        'value': {
                            'name': 'Boxes',
                            'data_query': '_meta:1',
                        },
                    },
                    'count_filter': {
                        'summary': 'Count all entities with confidence > 0.5',
                        'value': {
                            'name': 'High confidence boxes',
                            'data_query': 'Confidence:>0.5',
                        },
                    },
                },
            }}}
        return body

    def get_responses(self, path, method):
        responses = {}
        if method == 'GET':
            responses['404'] = {'description': 'Failure to find project with given ID.'}
            responses['400'] = {'description': 'Bad request.'}
            responses['200'] = {
                'description': 'Successful retrieval of analyses.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Analysis'},
                }}},
            }
        elif method == 'POST':
            responses = error_responses()
            responses['201'] = {
                'description': 'Successful creation of analysis.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/CreateResponse',
                }}}
            }
        return responses

class AnalysisDetailSchema(AutoSchema):

    def get_operation(self, path, method) -> dict:
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAnalysis'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateAnalysis'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteAnalysis'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method) -> str:
        description = ''
        if method == 'GET':
            description = 'Get analysis record'
        elif method == 'DELETE':
            description = 'Delete analysis record'
        elif method == 'PATCH':
            description = 'Update analysis record'
        return description

    def get_path_parameters(self, path, method) -> list:
        parameters = [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an analysis record.',
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
                'schema': {'$ref': '#/components/schemas/AnalysisSpec'},
                'example': {
                    fields.name: "New name",
                    fields.data_query: 'New string for analysis record'
                }
            }}}
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of analysis record.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Analysis',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'analysis record')
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'analysis record')
        return responses