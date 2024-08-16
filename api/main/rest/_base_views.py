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
from ._util import format_multiline
from .._permission_util import augment_permission
from ._permissions import *
from main.models import *

logger = logging.getLogger(__name__)


import os

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
        logger.error(format_multiline(traceback.format_exc()))
        resp = Response(
            {"message": str(exc), "details": str(exc.__cause__)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return resp


class TatorAPIView(APIView):
    def initial(self, request, *args, **kwargs):
        """
        Runs anything that needs to occur prior to calling the method handler.
        """
        self.format_kwarg = self.get_format_suffix(**kwargs)

        # Perform content negotiation and store the accepted info on the request
        neg = self.perform_content_negotiation(request)
        request.accepted_renderer, request.accepted_media_type = neg

        # Determine the API version, if versioning is in use.
        version, scheme = self.determine_version(request, *args, **kwargs)
        request.version, request.versioning_scheme = version, scheme

        # Check throttles before permissions check which can be expensive
        self.perform_authentication(request)
        self.check_throttles(request)

        # parse the request and store the validated schema as a member
        self.params = parse(request)
        # Ensure that the incoming request is permitted

        self.check_permissions(request)

    def get_parent_objects(self):
        # Default to project as parents as that is usually the case
        return {
            "project": Project.objects.filter(pk=self.params["project"]),
            "version": Version.objects.filter(pk=-1),
            "section": Section.objects.filter(pk=-1),
        }

    def filter_only_viewables(self, qs):
        # Convenience function for filtering out objects for most views
        if os.getenv("TATOR_FINE_GRAINED_PERMISSIONS", None) == "true":
            qs = augment_permission(self.request.user, qs)
            return qs.filter(effective_permission__gte=0)
        else:
            return qs

class GetMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def get(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        resp = Response({})
        response_data = self._get(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class PostMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def post(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        resp = Response({})
        response_data = self._post(self.params)
        resp = Response(response_data, status=status.HTTP_201_CREATED)
        return resp


class PatchMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def patch(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        response_data = self._patch(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class DeleteMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def delete(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        response_data = self._delete(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class PutMixin:
    def put(self, request, format=None, **kwargs):
        response_data = self._put(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class BaseListView(TatorAPIView, GetMixin, PostMixin, PatchMixin, DeleteMixin, PutMixin):
    """Base class for list views."""

    http_method_names = ["get", "post", "patch", "delete", "put"]

    def handle_exception(self, exc):
        return process_exception(exc)


class BaseDetailView(TatorAPIView, GetMixin, PatchMixin, DeleteMixin):
    """Base class for detail views."""

    http_method_names = ["get", "patch", "delete"]

    def handle_exception(self, exc):
        return process_exception(exc)
