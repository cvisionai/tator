import logging

from rest_framework.schemas.openapi import SchemaGenerator
from openapi_core import create_spec
from openapi_core.validation.request.validators import RequestValidator
from openapi_core.contrib.django import DjangoOpenAPIRequest

logger = logging.getLogger(__name__)

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

def parse(request):
    if parse.validator is None:
        generator = SchemaGenerator(title='Tator REST API')
        spec = generator.get_schema()
        openapi_spec = create_spec(spec)
        parse.validator = RequestValidator(openapi_spec)
    openapi_request = DjangoOpenAPIRequest(request)
    if openapi_request.mimetype.startswith('application/json'):
        openapi_request.mimetype = 'application/json'
    result = parse.validator.validate(openapi_request)
    result.raise_for_errors()
    out = {
        **result.parameters.path,
        **result.parameters.query,
    }
    if result.body:
        out = {**out, **result.body}
    return out

parse.validator = None

