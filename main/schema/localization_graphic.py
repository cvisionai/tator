from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

class LocalizationGraphicSchema(AutoSchema):
    """ Gets a thumbnail image of the localization

    #TODO Futurework would also entail modifying the thumbnail

    """

    # Parameters names
    PARAM_ARG_MODE = 'mode'
    PARAMS_IMAGE_SIZE = 'image_size'
    PARAMS_USE_DEFAULT_MARGINS = 'use_default_margins'
    PARAMS_MARGIN_X = 'margin_x'
    PARAMS_MARGIN_Y = 'margin_y'

    # Valid values for get mode
    MODE_USE_EXISTING_THUMBNAIL = 0
    MODE_CREATE_NEW_THUMBNAIL = 1
    
    # Margins (x,y pixels) to use if defaults are requested
    DEFAULT_MARGIN_DOT = (50, 50)
    DEFAULT_MARGIN_LINE = (50, 50)
    DEFAULT_MARGIN_BOX = (0, 0)

    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetLocalizationGraphic'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Get localization graphic from a media object (image/video).
        """)

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a localization.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):

        valid_for_create_only_message = f'Valid only if {self.PARAM_ARG_MODE} = {self.MODE_CREATE_NEW_THUMBNAIL}. '
        valid_for_non_default_margins_message = f'Valid only if {self.PARAMS_USE_DEFAULT_MARGINS} is false. '

        params = []
        if method == 'GET':
            params = [
                {
                    'name': self.PARAM_ARG_MODE,
                    'in': 'query',
                    'required': False,
                    'description': f'Set to {self.MODE_USE_EXISTING_THUMBNAIL} to use existing thumbnail '
                                   f'or {self.MODE_CREATE_NEW_THUMBNAIL} to generate a new thumbnail. '
                                   'If using existing thumbnail and it does not exist, a 400 Error will be reported.',
                    'schema': {
                        'type': 'number',
                        'default': self.MODE_USE_EXISTING_THUMBNAIL,
                    }
                },
                {
                    'name': self.PARAMS_IMAGE_SIZE,
                    'in': 'query',
                    'required': False,
                    'description': f'#TODO Size of final image to return. ' +
                                   valid_for_create_only_message,
                    'schema': {
                        'type': 'string',
                        'example': '100x100',
                        'default': '100x100',
                    },
                },
                {
                    'name': self.PARAMS_USE_DEFAULT_MARGINS,
                    'in': 'query',
                    'required': False,
                    'description': f'Use default margins for localization types. ' +
                                   valid_for_create_only_message,
                    'schema': {
                        'type': 'boolean',
                        'default': True,
                    }
                },
                {
                    'name': self.PARAMS_MARGIN_X,
                    'in': 'query',
                    'required': False,
                    'description': f'Pixel margin to apply to the height of the localization when generating the image. ' +
                                   valid_for_create_only_message +
                                   valid_for_non_default_margins_message,
                    'schema': {
                        'type': 'integer',
                    },
                },
                {
                    'name': self.PARAMS_MARGIN_Y,
                    'in': 'query',
                    'required': False,
                    'description': f'Pixel margin to apply to the width of the localization when generating the image. ' +
                                   valid_for_create_only_message +
                                   valid_for_non_default_margins_message,
                    'schema': {
                        'type': 'integer',
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
                'description': 'Successful retrieval of localization graphic.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
        return responses
