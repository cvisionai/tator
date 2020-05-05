from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses

class LocalizationAssociationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetLocalizationAssociation'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateLocalizationAssociation'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteLocalizationAssociation'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a localization association.',
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
                    'properties': {
                        'localizations': {
                            'description': 'List of localization IDs.',
                            'type': 'array',
                            'items': {'type': 'integer'},
                        },
                        'color': {
                            'description': 'A six digit hex-code Color to represent this '
                                           'association in the UI. If not given a color is '
                                           'used from a predefined progression.',
                            'type': 'string',
                        },
                    },
                },
                'example': {
                    'localizations': [1, 5, 10],
                    'color': '#03a1fc',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of localization association.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'description': 'Localization association object.',
                    'additionalProperties': True,
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'localization association')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful delete of localization association.'}
        return responses

