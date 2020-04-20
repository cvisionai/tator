from rest_framework.schemas.openapi import AutoSchema

class FrameAssociationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['FrameAssociation']
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
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find frame association with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'PATCH':
            responses['200'] = {'description': 'Successful update of frame association.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful delete of frame association.'}
        return responses

