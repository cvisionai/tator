import logging

from openapi_core import OpenAPI
from openapi_core.contrib.django import DjangoOpenAPIRequest

from ._generator import CustomGenerator

logger = logging.getLogger(__name__)


def parse(request):
    """Parses a request using Tator's generated OpenAPI spec."""
    if parse.validator is None:
        generator = CustomGenerator(title="Tator REST API")
        spec = generator.get_schema(parser=True)
        parse.validator = OpenAPI.from_dict(spec)
    openapi_request = DjangoOpenAPIRequest(request)
    if openapi_request.mimetype.startswith("application/json") or (not openapi_request.mimetype):
        openapi_request.mimetype = "application/json"
    result = parse.validator.validate_request(openapi_request)
    result.raise_for_errors()
    out = {
        **result.parameters.path,
        **result.parameters.query,
    }
    if result.body:
        out["body"] = result.body
        if not isinstance(result.body, list):
            out = {**result.body, **out}

    # Handle turning off merge if single version is selected
    if "merge" in out:
        if len(out.get("version", [])) <= 1:
            out["merge"] = 0
    return out


parse.validator = None
