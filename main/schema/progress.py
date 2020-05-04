from rest_framework.schemas.openapi import AutoSchema

class ProgressSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'Progress'
        operation['tags'] = ['Progress']
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
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'required': ['job_type', 'gid', 'uid', 'state', 'message', 'progress', 
                                     'name'],
                        'properties': {
                            'job_type': {
                                'description': 'Type of background job.',
                                'type': 'string',
                                'enum': ['upload', 'download', 'algorithm'],
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
                            'swid': {
                                'description': 'UUID generated for the service worker that is '
                                               'doing an upload. This field is required if the '
                                               '`job_type` is `upload`.',
                                'type': 'string',
                                'format': 'uuid',
                            },
                            'state': {
                                'description': 'State of the job.',
                                'type': 'string',
                                'enum': ['queued', 'started', 'failed', 'finished'],
                            },
                            'message': {
                                'description': 'Progress message. This should be short to fit '
                                               'in the UI.',
                                'type': 'string',
                            },
                            'progress': {
                                'description': 'Progress percent completion. This is used to '
                                               'display the progress bar associated with the '
                                               'job.',
                                'type': 'number',
                                'minimum': 0,
                                'maximum': 100,
                            },
                            'section': {
                                'description': 'Media section name. Required only for `job_type` '
                                               'of `upload`.',
                                'type': 'string',
                            },
                            'sections': {
                                'description': 'Comma separated string of media sections, one for '
                                               'each media ID that this job applies to. Required '
                                               'only for `job_type` of `algorithm`.',
                                'type': 'string',
                            },
                            'media_ids': {
                                'description': 'Comma separated string of media ids, one for '
                                               'each media that this job applies to. Required '
                                               'only for `job_type` of `algorithm`.',
                                'type': 'string',
                            },
                            'name': {
                                'description': 'Name of the job.',
                                'type': 'string',
                            },
                        },
                    },
                },
                'examples': {
                    'algorithm': {
                        'summary': 'Algorithm progress message',
                        'value': [{
                            'job_type': 'algorithm',
                            'gid': 'b722e83e-8272-11ea-8e10-000c294f07cf',
                            'uid': 'b43d7e54-8272-11ea-8e10-000c294f07cf',
                            'state': 'started',
                            'message': 'Job started!',
                            'progress': 70,
                            'sections': 'Section 1,Section 2',
                            'media_ids': '1,2',
                            'name': 'name_of_file.mp4',
                        }],
                    },
                    'upload': {
                        'summary': 'Upload progress message',
                        'value': [{
                            'job_type': 'upload',
                            'gid': 'b722e83e-8272-11ea-8e10-000c294f07cf',
                            'uid': 'b43d7e54-8272-11ea-8e10-000c294f07cf',
                            'state': 'started',
                            'message': 'Upload started!',
                            'progress': 70,
                            'section': 'Section 1',
                            'name': 'name_of_file.mp4',
                        }],
                    }
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Project not found.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['200'] = {'description': 'Progress message(s) sent successfully.'}
        return responses

