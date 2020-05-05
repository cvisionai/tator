from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses

class FrameAssociationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetFrameAssociation'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateFrameAssociation'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteFrameAssociation'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a frame association.',
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
                        'frame': {
                            'description': 'Video frame number for this association.',
                            'type': 'integer',
                        },
                        'extracted': {
                            'description': 'Unique integer identifying an extracted image.',
                            'type': 'integer',
                        },
                    },
                },
                'example': {
                    'frame': 100,
                    'extracted': 1,
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of frame association.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'description': 'Frame association object.',
                    'additionalProperties': True,
                }}},
            }
        if method == 'PATCH':
            responses['200'] = message_schema('update', 'frame association')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful delete of frame association.'}
        return responses

