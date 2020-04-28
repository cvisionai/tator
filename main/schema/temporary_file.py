from rest_framework.schemas.openapi import AutoSchema

class TemporaryFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['TemporaryFile']
        return operation

save_properties = {
    'name': {
        'description': 'Unique name for the temporary file',
        'type': 'string',
    },
    'url': {
        'description': 'URL for the temporary file',
        'type': 'string',
    },
    'lookup': {
        'description': 'md5hash of lookup parameters',
        'type': 'string',
    },
    'hours': {
        'description': 'Number of hours file is to be kept alive',
        'type': 'integer',
        'minimum': 1,
        'maximum': 24,
        'default': 24
        }
}

class TemporaryFileListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['TemporaryFiles']
        return operation
    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name', 'url', 'lookup'],
                    'properties': save_properties,
                },
            }}}
        return body
