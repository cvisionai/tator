import traceback
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.http import response

from ..schema import parse

logger = logging.getLogger(__name__)


def process_exception(exc):
    logger.info("Handling Exception!")
    logger.info(type(exc))
    if type(exc) is response.Http404:
        return Response({'message' : str(exc)},
                        status=status.HTTP_404_NOT_FOUND)
    elif type(exc) is ObjectDoesNotExist:
        logger.error(f"Not found in GET request: {str(exc)}")
        return Response({'message' : str(exc)},
                        status=status.HTTP_404_NOT_FOUND)
    elif type(exc) is PermissionDenied:
        logger.error(f"Permission denied error: {str(exc)}")
        return Response({'message': str(exc)},
                         status=status.HTTP_403_FORBIDDEN)
    else:
        logger.error(f"Exception in request: {traceback.format_exc()}")
        return Response({'message' : str(exc),
                         'details': traceback.format_exc()},
                        status=status.HTTP_400_BAD_REQUEST)
class GetMixin:
    def get(self, request, format=None, **kwargs):
        response = Response({})
        params = parse(request)
        response_data = self._get(params)
        response = Response(response_data, status=status.HTTP_200_OK)
        return response

class PostMixin:
    def post(self, request, format=None, **kwargs):
        response = Response({})
        params = parse(request)
        response_data = self._post(params)
        response = Response(response_data, status=status.HTTP_201_CREATED)
        return response

class PatchMixin:
    def patch(self, request, format=None, **kwargs):
        params = parse(request)
        response_data = self._patch(params)
        response = Response(response_data, status=status.HTTP_200_OK)
        return response

class DeleteMixin:
    def delete(self, request, format=None, **kwargs):
        params = parse(request)
        response_data = self._delete(params)
        response = Response(response_data, status=status.HTTP_204_NO_CONTENT)
        return response

class BaseListView(APIView, GetMixin, PostMixin, PatchMixin, DeleteMixin):
    """ Base class for list views.
    """
    http_method_names = ['get', 'post', 'patch', 'delete']

    @classmethod
    def copy_docstrings(cls):
        if 'get' in cls.http_method_names:
            cls.get.__doc__ = cls._get.__doc__
        if 'post' in cls.http_method_names:
            cls.post.__doc__ = cls._post.__doc__
        if 'patch' in cls.http_method_names:
            cls.patch.__doc__ = cls._patch.__doc__
        if 'delete' in cls.http_method_names:
            cls.delete.__doc__ = cls._delete.__doc__

    def handle_exception(self, exc):
        return process_exception(exc)

class BaseDetailView(APIView, GetMixin, PatchMixin, DeleteMixin):
    """ Base class for detail views.
    """
    http_method_names = ['get', 'patch', 'delete']

    @classmethod
    def copy_docstrings(cls):
        if 'get' in cls.http_method_names:
            cls.get.__doc__ = cls._get.__doc__
        if 'patch' in cls.http_method_names:
            cls.patch.__doc__ = cls._patch.__doc__
        if 'delete' in cls.http_method_names:
            cls.delete.__doc__ = cls._delete.__doc__

    def handle_exception(self, exc):
        return process_exception(exc)
