from rest_framework.schemas.openapi import AutoSchema

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
        if method == 'POST':
            operation['operationId'] = 'CreateTemporaryFile'
        elif method == 'GET':
            operation['operationId'] = 'GetTemporaryFileList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteTemporaryFileList'
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
        params=[]
        if method in ['GET', 'DELETE']:
            params = [
                {
                    'name': 'expired',
                    'in': 'query',
                    'required': False,
                    'description': 'If greater than 0 will return only'
                                   ' expired files',
                    'explode': False,
                    'schema': {
                        'type': 'integer',
                        'default': 0
                    },
                },
            ]
        return params

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

class TemporaryFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetTemporaryFile'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateTemporaryFile'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteTemporaryFile'
        operation['tags'] = ['Tator']
        return operation

