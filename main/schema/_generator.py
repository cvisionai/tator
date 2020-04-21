from rest_framework.schemas.openapi import SchemaGenerator
import logging
logger = logging.getLogger(__name__)
class CustomGenerator(SchemaGenerator):
    """ Schema generator for Swagger UI. Should not be used for request validation.
    """
    def get_schema(self, request=None, public=True):
        schema = super().get_schema(request, public)

        # Add schema for Token endpoint.
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

        # Set security scheme.
        schema['components'] = {
            'securitySchemes': {
                'BasicAuth': {
                    'type': 'http',
                    'scheme': 'basic',
                },
                'TokenAuth': {
                    'type': 'apiKey',
                    'in': 'header',
                    'name': 'Authorization',
                },
            }
        }
        schema['security'] = [
            {'BasicAuth': []},
            {'TokenAuth': []},
        ]

        # Remove deprecated paths.
        deprecated = [
            '/rest/EntityTypeMedias/{project}',
            '/rest/EntityTypeMedia/{id}',
            '/rest/EntityMedia/{id}',
            '/rest/EntityMedias/{project}',
            '/rest/EntityState/{id}',
            '/rest/EntityStates/{project}',
            '/rest/EntityStateTypes/{project}',
            '/rest/EntityStateType/{id}',
        ]
        for d in deprecated:
            if d in schema['paths']:
                del schema['paths'][d]
        return schema

