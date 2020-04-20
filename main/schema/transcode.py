from rest_framework.schemas.openapi import AutoSchema

class TranscodeSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Transcode']
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
                            'description': 'Unique integer identifying a video type.',
                            'type': 'integer',
                        },
                        'gid': {
                            'description': 'UUID generated for the job group. This value may '
                                           'be associated with messages generated during '
                                           'upload via the `Progress` endpoint, or it may '
                                           'be newly generated. The transcode workflow will use '
                                           'this value to generate progress messages.',
                            'type': 'string',
                            'format': 'uuid',
                        },
                        'uid': {
                            'description': 'UUID generated for the individual job. This value may '
                                           'be associated with messages generated during '
                                           'upload via the `Progress` endpoint, or it may '
                                           'be newly generated. The transcode workflow will use '
                                           'this value to generate progress messages.',
                            'type': 'string',
                        },
                        'url': {
                            'description': 'Upload URL for the raw video.',
                            'type': 'string',
                        },
                        'section': {
                            'description': 'Media section name to upload to.',
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
        elif method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['gid', 'uid', 'media_files', 'id'],
                    'properties': {
                        'gid': save_video_properties['gid'],
                        'uid': save_video_properties['uid'],
                        'id': {
                            'type': 'integer',  
                            'description': 'Unique integer identifying a media.',
                        },
                        'media_files': save_video_properties['media_files'],
                    },
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Failure to find the algorithm with the given name.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['201'] = {'description': 'Successful save of the video in the database.'}
        return responses

