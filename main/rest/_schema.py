from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi

class Schema(AutoSchema):
    def __init__(self, fields):
        """ Accepts a dict containing mapping from supported method to list of Field objects.
        """
        super().__init__(self)
        self._fields = fields

    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path, method)
        if method in self._fields:
            return 
        if method in self._fields:
            return self._fields[method] + self._fields['all']

    def parse(self, request, kwargs):
        """ Returns a dict of parameter values from a request. Raises an exception if a required
            field is missing.
        """
        values = {}
        if request.method in self._fields:
            fields = self._fields.get('ALL', []) + self._fields.get(request.method)
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
                    raise Exception(f'Missing required field "{field.name}" in {field.location} '
                                     'for {path}!')

                # Validate the value
                if values[field.name] is not None:
                    valid = field.schema.validate(values[field.name])
                    if len(valid) > 0:
                        raise Exception(f'Invalid value for field "{field.name}" in {field.location} '
                                         'for {path}! {valid[0].text}')
        return values
                
