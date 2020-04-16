import logging

from rest_framework.schemas.openapi import AutoSchema
from rest_framework.compat import coreschema

logger = logging.getLogger(__name__)

def _get_type(field):
    type_ = 'string'
    if isinstance(field.schema, coreschema.String):
        type_ = 'string'
    elif isinstance(field.schema, coreschema.Integer):
        type_ = 'integer'

def _coreapi_to_dict(field):
    return {
        'name': field.name,
        'in': field.location,
        'required': field.required,
        'description': field.description,
        'schema': {
            'type': _get_type(field),
        },
    }

def _coreapi_to_property(field):
    return {field.name: {
        'type': _get_type(field),
        'description': field.description,
    }}

class Schema(AutoSchema):
    def __init__(self, fields, tags=None):
        """ Accepts a dict containing mapping from supported method to list of Field objects.
        """
        super().__init__()
        self._fields = fields
        self._tags = tags

    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = self._tags
        return operation

    def _get_fields(self, method, location):
        fields = self._fields.get(method, []) + self._fields.get('all', [])
        return [field for field in fields if field.location == location]

    def _get_path_parameters(self, path, method):
        return [_coreapi_to_dict(field) for field in self._get_fields(method, 'path')]

    def _get_filter_parameters(self, path, method):
        return [_coreapi_to_dict(field) for field in self._get_fields(method, 'query')]

    def _get_request_body(self, path, method):
        fields = self._get_fields(method, 'body')
        if len(fields) == 0:
            body = {}
        else:
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'properties': [_coreapi_to_property(field) for field in fields],
                },
            }}}
        return body

    def parse(self, request, kwargs):
        """ Returns a dict of parameter values from a request. Raises an exception if a required
            field is missing.
        """
        values = {}
        fields = self._fields.get('all', []) + self._fields.get(request.method)
        for field in fields:
            # Grab the field value
            if field.location == 'body':
                values[field.name] = request.data.get(field.name, None)
            elif field.location == 'path':
                values[field.name] = kwargs.get(field.name, None)
            elif field.location == 'query':
                values[field.name] = request.query_params.get(field.name, None)

            # Check if required field 
            if field.required and values[field.name] is None:
                raise Exception(f'Missing required field "{field.name}" in request '
                                f'{field.location} for {request.path}!')

            # Validate the value
            if values[field.name] is not None:
                valid = field.schema.validate(values[field.name])
                if len(valid) > 0:
                    raise Exception(f'Invalid value for field "{field.name}" in request '
                                    f'{field.location} for {request.path}! {valid[0].text}')
        return values
                
