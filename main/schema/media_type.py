from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._attribute_type import attribute_type_properties
from ._attribute_type import attribute_type_example
from ._entity_type_mixins import entity_type_filter_parameters_schema
from .components.attribute_type import attribute_type as attribute_type_schema

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
    'keep_original': {
        'description': 'For video dtype, whether to keep the original '
                       'video file for archival purposes after transcoding. '
                       'If true, the originally uploaded file will be '
                       'available for download, otherwise downloads will '
                       'use the transcoded videos.',
        'type': 'boolean',
        'default': True,
    },
    'attribute_types': {
        'description': 'Attribute type definitions.',
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': attribute_type_properties,
        },
    },
}

media_type_schema = {
    'type': 'object',
    'description': 'Media type.',
    'properties': {
        'type': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'integer',
                    'description': 'Unique integer identifying a media type.',
                },
                **media_properties,
                'resourcetype': {
                    'type': 'string',
                    'description': 'Type of the media.',
                    'enum': ['EntityTypeMediaImage', 'EntityTypeMediaVideo'],
                },
            },
        },
        'columns': {
            'type': 'array',
            'description': 'Attribute types associated with this localization type.',
            'items': attribute_type_schema,
        },
    },
}

class MediaTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateMediaType'
        elif method == 'GET':
            operation['operationId'] = 'GetMediaTypeList'
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
                    'attribute_types': attribute_type_example,
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of media type list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': media_type_schema,
                }}},
            }
        elif method == 'POST':
            responses['201'] = {
                'description': 'Successful creation of media type.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message indicating successful creation.',
                        },
                        'id': {
                            'type': 'integer',
                            'description': 'Unique integer identifying created object.',
                        },
                    },
                }}}
            }
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
        operation['tags'] = ['Tator']
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
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of media type.',
                'content': {'application/json': {'schema': media_type_schema}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'media type')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of media type.'}
        return responses
