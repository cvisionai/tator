from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses

class ProgressSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'Progress'
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
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/ProgressSpec'}
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
        responses = error_responses()
        if method == 'POST':
            responses['200'] = message_schema('creation', 'progress message')
        return responses

