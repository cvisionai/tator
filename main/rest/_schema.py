import logging

from rest_framework.schemas.openapi import AutoSchema
from rest_framework.compat import coreschema
from rest_framework.schemas.openapi import SchemaGenerator
from openapi_core import create_spec
from openapi_core.validation.request.validators import RequestValidator
from openapi_core.contrib.django import DjangoOpenAPIRequest

logger = logging.getLogger(__name__)

def parse(request):
    if parse.openapi_spec is None:
        generator = SchemaGenerator(title='Tator REST API')
        spec = generator.get_schema()
        parse.openapi_spec = create_spec(spec)
    validator = RequestValidator(parse.openapi_spec)
    openapi_request = DjangoOpenAPIRequest(request)
    result = validator.validate(openapi_request)
    result.raise_for_errors()
    return result

parse.openapi_spec = None
