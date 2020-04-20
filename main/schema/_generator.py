from rest_framework.schemas.openapi import SchemaGenerator
import logging
logger = logging.getLogger(__name__)
class CustomGenerator(SchemaGenerator):
    """ Schema generator for Swagger UI. Should not be used for request validation.
    """
    def get_schema(self, request=None, public=False):
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

        # Remove deprecated paths.
        del schema['paths']['/rest/EntityTypeMedias/{project}']
        del schema['paths']['/rest/EntityTypeMedia/{id}']
        del schema['paths']['/rest/EntityMedia/{id}']
        del schema['paths']['/rest/EntityMedias/{project}']
        del schema['paths']['/rest/EntityState/{id}']
        del schema['paths']['/rest/EntityStates/{project}']
        del schema['paths']['/rest/EntityStateTypes/{project}']
        del schema['paths']['/rest/EntityStateType/{id}']
        return schema

