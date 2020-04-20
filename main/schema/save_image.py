from rest_framework.schemas.openapi import AutoSchema

class SaveImageSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['SaveImage']
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
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['type', 'gid', 'uid', 'url', 'section', 'name', 'md5'],
                    'properties': {
                        'type': {
                            'description': 'Unique integer identifying an image type. Use '
                                           '-1 to automatically select the image type if '
                                           'only one image type exists in a project.',
                            'type': 'integer',
                            'minimum': -1,
                        },
                        'gid': {
                            'description': 'UUID generated for the job group. This value is '
                                           'returned in the response of the `AlgorithmLaunch` '
                                           'and `Transcode` endpoints.',
                            'type': 'string',
                            'format': 'uuid',
                        },
                        'uid': {
                            'description': 'UUID generated for the individual job. This value '
                                           'is returned in the response of the `AlgorithmLaunch` '
                                           'and `Transcode` endpoints.',
                            'type': 'string',
                        },
                        'url': {
                            'description': 'Upload URL for the image.',
                            'type': 'string',
                        },
                        'thumbnail_url': {
                            'description': 'Upload URL for the thumbnail if already generated.',
                            'type': 'string',
                        },
                        'section': {
                            'description': 'Media section name.',
                            'type': 'string',
                        },
                        'name': {
                            'description': 'Name of the file.',
                            'type': 'string',
                        },
                        'md5': {
                            'description': 'MD5 sum of the media file.',
                            'type': 'string',
                        },
                    },
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Failure to find the algorithm with the given name.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['201'] = {'description': 'Successful save of the image in the database.'}
        return responses

