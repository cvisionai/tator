from django.utils.deprecation import MiddlewareMixin
from threading import local

_http_method = local()


class HttpMethodMiddleware(MiddlewareMixin):
    def process_request(self, request):
        _http_method.method = request.method


def get_http_method():
    return getattr(_http_method, "method", None)
