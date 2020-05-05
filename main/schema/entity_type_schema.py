from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class EntityTypeSchemaSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetEntityTypeSchema'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an entity type.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of entity type schema.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/EntityTypeSchema',
                }}},
            }
        return responses

