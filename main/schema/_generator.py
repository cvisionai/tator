from rest_framework.schemas.openapi import SchemaGenerator

class CustomGenerator(SchemaGenerator):
    def get_schema(self, request=None, public=False):
        schema = super().get_schema(request, public)
        schema['paths']['/rest/Token']['post']['requestBody'] = {
            'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['username', 'password'],
                    'properties': {
                        'username': {
                            'description': 'Account username.',
                            'type': 'string',
                        },
                        'password': {
                            'description': 'Account password.',
                            'type': 'string',
                        },
                    },
                },
            }},
        }
        schema['paths']['/rest/Token']['post']['responses'] = {
            '200': {
                'description': 'Login credentials accepted.',
                'content': {'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'token': {
                                'description': 'API token.',
                                'type': 'string',
                            },
                        },
                    },
                }},
            },
            400: {'description': 'Login credentials invalid.'},
        }
        schema['paths']['/rest/Token']['post']['tags'] = ['Token']
        return schema

