from rest_framework.schemas.openapi import AutoSchema

class ProgressSummarySchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
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
                    'type': 'object',
                    'required': ['gid', 'num_jobs', 'num_complete'],
                    'properties': {
                        'gid': {
                            'description': 'UUID generated for the job group. This value is '
                                           'returned in the response of the `AlgorithmLaunch` '
                                           'and `Transcode` endpoints.',
                            'type': 'string',
                            'format': 'uuid',
                        },
                        'num_jobs': {
                            'description': 'Number of jobs in this job group.',
                            'type': 'integer',
                        },
                        'num_complete': {
                            'description': 'Number of jobs completed in this job group.',
                            'type': 'integer',
                        },
                    },
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Failure to find any jobs with given uuid.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['201'] = {'description': 'Successful creation of progress summary.'}
        return responses

