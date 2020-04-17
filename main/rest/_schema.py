import logging

from rest_framework.schemas.openapi import SchemaGenerator
from openapi_core import create_spec
from openapi_core.validation.request.validators import RequestValidator
from openapi_core.contrib.django import DjangoOpenAPIRequest

logger = logging.getLogger(__name__)

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

