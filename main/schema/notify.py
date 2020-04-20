from rest_framework.schemas.openapi import AutoSchema

class NotifySchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Notify']
        return operation

    def _get_path_parameters(self, path, method):
        return []

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['message', 'sendAsFile'],
                    'properties': {
                        'message': {
                            'description': 'Message to send to administrators.',
                            'type': 'string',
                        },
                        'sendAsFile': {
                            'description': 'Whether to send message as a file.',
                            'type': 'string',
                        },
                    },
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = {}
        responses['503'] = {'description': 'Service not available.'}
        responses['404'] = {'description': 'Not found.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['201'] = {'description': 'Message sent successfully.'}
        return responses

