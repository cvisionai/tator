""" TODO: add documentation for this """
import traceback
import sys
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.http import response
from django.conf import settings

from ..schema import parse

from ..rest import _base_views

logger = logging.getLogger(__name__)

""" TODO: add documentation for this """


def process_exception(exc):
    """TODO: add documentation for this"""
    logger.info("Handling Exception!")
    logger.info(type(exc))
    if isinstance(exc, response.Http404):
        resp = Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    elif isinstance(exc, ObjectDoesNotExist):
        logger.error(f"Not found in GET request: {str(exc)}")
        resp = Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    elif isinstance(exc, PermissionDenied):
        logger.error(f"Permission denied error: {str(exc)}")
        resp = Response({"message": str(exc)}, status=status.HTTP_403_FORBIDDEN)
    else:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        formatted_traceback = "".join(
            traceback.format_exception(exc_type, exc_value, exc_traceback)
        )
        single_line_traceback = formatted_traceback.replace("\n", " \\n ")
        logger.error(single_line_traceback)
        resp = Response(
            {"message": str(exc), "details": single_line_traceback if settings.DEBUG else ""},
            status=status.HTTP_400_BAD_REQUEST,
        )
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


class BaseListView(APIView, GetMixin, PostMixin, PatchMixin, DeleteMixin, PutMixin):
    """Base class for list views."""

    http_method_names = ["get", "post", "patch", "delete", "put"]

    def handle_exception(self, exc):
        return process_exception(exc)


class BaseDetailView(APIView, GetMixin, PatchMixin, DeleteMixin):
    """Base class for detail views."""

    http_method_names = ["get", "patch", "delete"]

    def handle_exception(self, exc):
        return process_exception(exc)
