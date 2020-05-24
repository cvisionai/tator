from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses
from ._attributes import attribute_filter_parameter_schema
from ._annotation_query import annotation_filter_parameter_schema

class LocalizationListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateLocalization'
        elif method == 'GET':
            operation['operationId'] = 'GetLocalizationList'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateLocalizationList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteLocalizationList'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        params = []
        if method in ['GET', 'PATCH', 'DELETE']:
            params = annotation_filter_parameter_schema + attribute_filter_parameter_schema
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/LocalizationSpec'},
                },
                'examples': {
                    'box': {
                        'summary': 'Single box localization',
                        'value': [{
                            'media_id': 1,
                            'type': 1,
                            'x': 0.1,
                            'y': 0.2,
                            'width': 0.3,
                            'height': 0.4,
                            'frame': 1000,
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        }],
                    },
                    'boxes': {
                        'summary': 'Many box localizations',
                        'value': [
                            {
                                'media_id': 1,
                                'type': 1,
                                'x': 0.1,
                                'y': 0.2,
                                'width': 0.3,
                                'height': 0.4,
                                'frame': 100,
                                'My First Attribute': 'value1',
                                'My Second Attribute': 'value2',
                            },
                            {
                                'media_id': 1,
                                'type': 1,
                                'x': 0.1,
                                'y': 0.2,
                                'width': 0.3,
                                'height': 0.4,
                                'frame': 1000,
                                'My First Attribute': 'value1',
                                'My Second Attribute': 'value2',
                            },
                        ],
                    },
                    'line': {
                        'summary': 'Single line localization',
                        'value': [{
                            'media_id': 1,
                            'type': 2,
                            'x': 0.1,
                            'y': 0.2,
                            'u': 0.3,
                            'v': 0.4,
                            'frame': 1000,
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        }],
                    },
                    'lines': {
                        'summary': 'Many line localizations',
                        'value': [
                            {
                                'media_id': 1,
                                'type': 2,
                                'x': 0.1,
                                'y': 0.2,
                                'u': 0.3,
                                'v': 0.4,
                                'frame': 100,
                                'My First Attribute': 'value1',
                                'My Second Attribute': 'value2',
                            },
                            {
                                'x': 0.1,
                                'y': 0.2,
                                'u': 0.3,
                                'v': 0.4,
                                'frame': 1000,
                                'My First Attribute': 'value1',
                                'My Second Attribute': 'value2',
                            },
                        ],
                    },
                    'dot': {
                        'summary': 'Single dot localization',
                        'value': [{
                            'media_id': 1,
                            'type': 1,
                            'x': 0.1,
                            'y': 0.2,
                            'frame': 1000,
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        }],
                    },
                    'dots': {
                        'summary': 'Many dot localizations',
                        'value': [
                            {
                                'media_id': 1,
                                'type': 1,
                                'x': 0.1,
                                'y': 0.2,
                                'frame': 100,
                                'My First Attribute': 'value1',
                                'My Second Attribute': 'value2',
                            },
                            {
                                'x': 0.1,
                                'y': 0.2,
                                'frame': 1000,
                                'My First Attribute': 'value1',
                                'My Second Attribute': 'value2',
                            },
                        ],
                    },
                }
            }}}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/AttributeBulkUpdate',
                },
                'examples': {
                    'single': {
                        'summary': 'Update Species attribute of many localizations',
                        'value': {
                            'attributes': {
                                'Species': 'Tuna',
                            }
                        },
                    },
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of localization list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Localization'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_schema('creation', 'localization(s)')
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'localization list')
        elif method == 'DELETE':
            responses['204'] = message_schema('deletion', 'localization list')
        return responses

class LocalizationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetLocalization'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateLocalization'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteLocalization'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a localization.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/LocalizationUpdate',
                },
                'example': {
                    'x': 0.25,
                    'y': 0.25,
                    'width': 0.25,
                    'height': 0.25,
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of localization.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Localization',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'localization')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of localization.'}
        return responses

