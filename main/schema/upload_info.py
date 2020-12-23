from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class UploadInfoSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetUploadInfo'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Retrieve URL for file upload to a given project.
        """)

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
        if method  == 'GET':
            params = [
                {
                    'name': 'expiration',
                    'in': 'query',
                    'required': False,
                    'description': 'Number of seconds until URL expires and becomes invalid.',
                    'schema': {'type': 'integer',
                               'minimum': 1,
                               'maximum': 86400,
                               'default': 3600},
                },
            ]
        return params

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'A URL for upload via an S3-compatible object storage interface '
                               'and an object name for use with the `Transcode` or `Media` '
                               'endpoints.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/UploadInfo',
                }}}
            }
        return responses
