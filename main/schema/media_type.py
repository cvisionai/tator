from rest_framework.schemas.openapi import AutoSchema

from ._entity_type_mixins import entity_type_filter_parameters_schema

media_properties = {
    'name': {
        'description': 'Name of the media type.',
        'type': 'string',
    },
    'description': {
        'description': 'Description of the media type.',
        'type': 'string',
        'default': '',
    },
    'dtype': {
        'description': 'Type of the media, image or video.',
        'type': 'string',
        'enum': ['image', 'video'],
    },
    'file_format': {
        'description': 'File extension. If omitted, any recognized file '
                       'extension for the given dtype is accepted for upload. '
                       'Do not include a dot prefix.',
        'type': 'string',
        'maxLength': 4,
    },
    'uploadable': {
        'description': 'Whether this media can be uploaded.',
        'type': 'boolean',
        'default': True,
    },
    'keep_original': {
        'description': 'For video dtype, whether to keep the original '
                       'video file for archival purposes after transcoding. '
                       'If true, the originally uploaded file will be '
                       'available for download, otherwise downloads will '
                       'use the transcoded videos.',
        'type': 'boolean',
        'default': True,
    },
}

class MediaTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateMediaType'
        elif method == 'GET':
            operation['operationId'] = 'GetMediaTypeList'
        operation['tags'] = ['MediaType']
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
        return {}

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name', 'dtype'],
                    'properties': media_properties,
                },
                'example': {
                    'name': 'My media type',
                    'dtype': 'video',
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of media type list.'}
        elif method == 'POST':
            responses['201'] = {'description': 'Successful creation of media type.'}
        return responses

class MediaTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetMediaType'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateMediaType'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteMediaType'
        operation['tags'] = ['MediaType']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an media type.',
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
                        'name': media_properties['name'],
                        'description': media_properties['description'],
                        'file_format': media_properties['file_format'],
                        'uploadable': media_properties['uploadable'],
                        'keep_original': media_properties['keep_original'],
                    },
                },
                'example': {
                    'name': 'New name',
                    'description': 'New description',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find media type with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of media type.'}
        elif method in ['PATCH', 'PUT']:
            responses['200'] = {'description': 'Successful update of media type.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of media type.'}
        return responses
