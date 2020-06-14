from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses
from ._media_query import media_filter_parameter_schema
from ._attributes import attribute_filter_parameter_schema

boilerplate = dedent("""\
A media may be an image or a video. Media are a type of entity in Tator,
meaning they can be described by user defined attributes.
""")

class MediaListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetMediaList'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateMediaList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteMediaList'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        short_desc = ''
        long_desc = ''
        if method == 'GET':
            short_desc = "Get media list."
        elif method == 'PATCH':
            short_desc = "Update media list."
            long_desc = dedent("""\
            This method does a bulk update on all media matching a query. Only 
            user-defined attributes may be bulk updated.
            """)
        elif method == 'DELETE':
            short_desc = "Delete media list."
            long_desc = dedent("""\
            This method performs a bulk delete on all media matching a query. It is 
            recommended to use a GET request first to check what is being deleted.
            """)
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

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
            params = media_filter_parameter_schema + attribute_filter_parameter_schema
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/AttributeBulkUpdate',
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
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of media list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Media'},
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'media list')
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'media list')
        return responses

class MediaDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetMedia'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateMedia'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteMedia'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        short_desc = ''
        long_desc = ''
        if method == 'GET':
            short_desc = "Get media."
        elif method == 'PATCH':
            short_desc = "Update media."
        elif method == 'DELETE':
            short_desc = "Delete media."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

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
                'schema': {'$ref': '#/components/schemas/MediaUpdate'},
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of media.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Media',
                }}},
            }
        if method == 'PATCH':
            responses['200'] = message_schema('update', 'media')
        if method == 'DELETE':
            responses['200'] = message_schema('deletion', 'media')
        return responses

class GetFrameSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetFrame'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Get frame(s) from a video.

        Facility to get a frame(jpg/png) of a given video frame, returns a square tile of
        frames based on the input parameter.
        """)

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
                {
                    'name': 'quality',
                    'in': 'query',
                    'required': False,
                    'description': 'Source resolution to use (default to highest quality)',
                    'schema': {
                        'type': 'integer',
                        'minimum': 0,
                    },
                },
            ]
        return params

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = {}
        if method == 'GET':
            responses['404'] = {
                'description': 'Not found.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
            responses['400'] = {
                'description': 'Bad request.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
            responses['200'] = {
                'description': 'Successful retrieval of frame image.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
        return responses


class GetClipSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetClip'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Get video clip.

        Facility to get a clip from the server. Returns a temporary file object that expires in 24 hours.
        """)

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
                    'name': 'frameRanges',
                    'in': 'query',
                    'required':True,
                    'description': 'Comma-seperated list of frame ranges to capture.',
                    'explode': False,
                    'schema': {
                        'type': 'array',
                        'items': {
                            'type': 'string',
                        },
                    },
                    'example': ["0:30", "50:90"],
                },
                {
                    'name': 'quality',
                    'in': 'query',
                    'required': False,
                    'description': 'Source resolution to use (default to highest quality)',
                    'schema': {
                        'type': 'integer',
                        'minimum': 0,
                    },
                },
            ]
        return params

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of video clip.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/TemporaryFile',
                }}},
            }
        return responses
