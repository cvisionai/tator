from rest_framework.schemas.openapi import AutoSchema

class GetFrameSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Media']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a media object.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        params = []
        if method == 'GET':
            params = [
                {
                    'name': 'frames',
                    'in': 'query',
                    'required': False,
                    'description': 'Comma-seperated list of frames to capture.',
                    'schema': {
                        'type': 'array',
                        'items': {
                            'type': 'integer',
                            'minimum': 0,
                        },
                        'default': [0],
                    },
                    'example': [0, 100, 200],
                },
                {
                    'name': 'tile',
                    'in': 'query',
                    'required': False,
                    'description': 'wxh, if not supplied is made as squarish as possible.',
                    'schema': {'type': 'string'},
                },
                {
                    'name': 'roi',
                    'in': 'query',
                    'required': False,
                    'description': 'w:h:x:y, optionally crop each frame to a given roi in '
                                   'relative coordinates.',
                    'schema': {'type': 'string'},
                },
            ]
        return params

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Failure to find attribute type with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of frame image.'}
        return responses

