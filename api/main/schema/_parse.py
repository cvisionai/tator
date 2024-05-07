import logging
import json
import re

from openapi_core import OpenAPI
from openapi_core.contrib.django import DjangoOpenAPIRequest
from openapi_core.datatypes import RequestParameters
from werkzeug.datastructures import Headers
from werkzeug.datastructures import ImmutableMultiDict
import django
from ._generator import CustomGenerator

logger = logging.getLogger(__name__)

PATH_PARAMETER_PATTERN = r"(?:[^/]*?)<(?:(?:.*?:))*?(\w+)>(?:(?:[^/]*?\[\^[^/]*/)?[^/]*)"


class DrfOpenAPIRequest:

    path_regex = re.compile(PATH_PARAMETER_PATTERN)

    def __init__(self, request):
        self.request = request

        path = (
            self.request._request.resolver_match
            and self.request._request.resolver_match.kwargs
            or {}
        )
        self.parameters = RequestParameters(
            path=path,
            query=ImmutableMultiDict(self.request._request.GET),
            header=Headers(self.request._request.headers.items()),
            cookie=ImmutableMultiDict(dict(self.request._request.COOKIES)),
        )

    @property
    def host_url(self):
        return self.request._request._current_scheme_host

    @property
    def path(self):
        return self.request._request.path

    @property
    def path_pattern(self):
        if self.request._request.resolver_match is None:
            return None

        route = self.path_regex.sub(r"{\1}", self.request._request.resolver_match.route)
        # Delete start and end marker to allow concatenation.
        if route[:1] == "^":
            route = route[1:]
        if route[-1:] == "$":
            route = route[:-1]
        return "/" + route

    @property
    def method(self):
        if self.request.method is None:
            return ""
        return self.request.method.lower()

    @property
    def body(self):
        try:
            assert isinstance(self.request.body, bytes)
            return self.request.body
        except django.http.response.RawPostDataException:
            return json.dumps(self.request.data)

    @property
    def content_type(self) -> str:
        return self.request.content_type


def parse(request):
    """Parses a request using Tator's generated OpenAPI spec."""
    if parse.validator is None:
        generator = CustomGenerator(title="Tator REST API")
        spec = generator.get_schema(parser=True)
        parse.validator = OpenAPI.from_dict(spec)
    openapi_request = DrfOpenAPIRequest(request)
    result = parse.validator.unmarshal_request(openapi_request)
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
