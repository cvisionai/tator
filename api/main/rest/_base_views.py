""" TODO: add documentation for this """
import logging
import traceback

from django.core.exceptions import ObjectDoesNotExist
from django.http import response
from rest_framework.exceptions import PermissionDenied
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..schema import parse

logger = logging.getLogger(__name__)

""" TODO: add documentation for this """


# N.B. When using this mix-in, it must be before APIView in the list of subclasses, due to the order
# in which overrides are considered (last to first in the list of subclasses)
class ExceptionMixin:
    def handle_exception(self, exc):
        """TODO: add documentation for this"""
        if isinstance(exc, response.Http404):
            msg = "Page not found: %s"
            resp = Response({"message": "Page not found"}, status=status.HTTP_404_NOT_FOUND)
        elif isinstance(exc, ObjectDoesNotExist):
            msg = "Object not found: %s"
            resp = Response({"message": "Object not found"}, status=status.HTTP_404_NOT_FOUND)
        elif isinstance(exc, PermissionDenied):
            msg = "Permission denied error: %s"
            resp = Response({"message": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        else:
            msg = "Exception in request: %s"
            resp = Response({"message": "Bad request"}, status=status.HTTP_400_BAD_REQUEST)
        logger.error(msg, traceback.format_exc())
        return resp


class GetMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def get(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        resp = Response({})
        params = parse(request)
        response_data = self._get(params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class PostMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def post(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        resp = Response({})
        params = parse(request)
        response_data = self._post(params)
        resp = Response(response_data, status=status.HTTP_201_CREATED)
        return resp


class PatchMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def patch(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        params = parse(request)
        response_data = self._patch(params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class DeleteMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def delete(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        params = parse(request)
        response_data = self._delete(params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class PutMixin:
    def put(self, request, format=None, **kwargs):
        params = parse(request)
        response_data = self._put(params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class BaseListView(ExceptionMixin, APIView, GetMixin, PostMixin, PatchMixin, DeleteMixin, PutMixin):
    """Base class for list views."""

    http_method_names = ["get", "post", "patch", "delete", "put"]


class BaseDetailView(ExceptionMixin, APIView, GetMixin, PatchMixin, DeleteMixin):
    """Base class for detail views."""

    http_method_names = ["get", "patch", "delete"]
