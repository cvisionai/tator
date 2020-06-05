from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class NotifySchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'Notify'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return []

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/NotifySpec'},
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['503'] = {'description': 'Service not available.'}
            responses['201'] = {'description': 'Message sent successfully.'}
        return responses

