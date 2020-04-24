from rest_framework.schemas.openapi import AutoSchema

from ._attributes import attribute_filter_parameter_schema

media_properties = {
    'name': {
        'description': 'Name of the media.',
        'type': 'string',
    },
    'last_edit_start': {
        'description': 'Datetime of the start of the session when this media or its annotations '
                       'were last edited.',
        'type': 'string',
        'format': 'date-time',
    },
    'last_edit_end': {
        'description': 'Datetime of the end of the session when this media or its annotations were last edited.',
        'type': 'string',
        'format': 'date-time',
    },
    'media_files': {
        'description': 'Object containing media information.',
        'type': 'object',
        'additionalProperties': True,
    },
    'attributes': {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': True,
    },
}

class MediaListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Media']
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
        params = []
        if method in ['GET', 'PATCH', 'DELETE']:
            params = [
                {
                    'name': 'media_id',
                    'in': 'query',
                    'required': False,
                    'description': 'List of integers identifying media.',
                    'explode': False,
                    'schema': {
                        'type': 'array',
                        'items': {
                            'type': 'integer',
                            'minimum': 1,
                        },
                    },
                },
                {
                    'name': 'type',
                    'in': 'query',
                    'required': False,
                    'description': 'Unique integer identifying media type.',
                    'schema': {'type': 'integer'},
                },
                {
                    'name': 'name',
                    'in': 'query',
                    'required': False,
                    'description': 'Name of the media to filter on.',
                    'schema': {'type': 'string'},
                },
                {
                    'name': 'md5',
                    'in': 'query',
                    'required': False,
                    'description': 'MD5 sum of the media file.',
                    'schema': {'type': 'string'},
                },
            ] + attribute_filter_parameter_schema
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['attributes'],
                    'properties': {
                        'attributes': {
                            'description': 'Attribute values to bulk update.',
                            'type': 'object',
                            'additionalProperties': True,
                        },
                    },
                },
                'examples': {
                    'single': {
                        'summary': 'Update Species attribute of many images',
                        'value': {
                            'attributes': {
                                'Species': 'Tuna',
                            }
                        },
                    },
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of media list.'}
        elif method == 'PATCH':
            responses['200'] = {'description': 'Successful bulk update of media '
                                               'attributes.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful bulk delete of media.'}
        return responses

class MediaDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Media']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a media.',
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
                    'properties': media_properties,
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find media with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of media.'}
        if method == 'PATCH':
            responses['200'] = {'description': 'Successful update of media.'}
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of media.'}
        return responses

class GetFrameSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['GetFrame']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a media object.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        params = []
        if method == 'GET':
            params = [
                {
                    'name': 'frames',
                    'in': 'query',
                    'required': False,
                    'description': 'Comma-seperated list of frames to capture.',
                    'explode': False,
                    'schema': {
                        'type': 'array',
                        'items': {
                            'type': 'integer',
                            'minimum': 0,
                        },
                        'maxLength': 32,
                        'default': [0],
                    },
                    'example': [0, 100, 200],
                },
                {
                    'name': 'tile',
                    'in': 'query',
                    'required': False,
                    'description': 'wxh, if not supplied is made as squarish as possible.',
                    'schema': {'type': 'string'},
                },
                {
                    'name': 'roi',
                    'in': 'query',
                    'required': False,
                    'description': 'w:h:x:y, optionally crop each frame to a given roi in '
                                   'relative coordinates.',
                    'schema': {'type': 'string'},
                },
                {
                    'name': 'animate',
                    'in': 'query',
                    'required': False,
                    'description': 'If not tiling, animate each frame at a given fps in a gif.',
                    'schema': {
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 15,
                    },
                },
            ]
        return params

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Failure to find attribute type with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of frame image.'}
        return responses

