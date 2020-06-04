import traceback

from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from rest_framework import views
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from ._permissions import ProjectEditPermission

from ..models import TemporaryFile
from ..models import Project
from ..serializers import TemporaryFileSerializer
from ..schema import TemporaryFileDetailSchema
from ..schema import TemporaryFileListSchema
from rest_framework.schemas.openapi import AutoSchema
from ..schema import parse
import datetime

import os
import logging
import uuid
import shutil

# Load the main.view logger
logger = logging.getLogger(__name__)

class TemporaryFileListAPI(generics.ListAPIView):
    """ Interact with temporary file list.

        Temporary files are files stored server side for a defined duration. The file must
        first be uploaded via tus, and can subsequently be saved using this endpoint.
    """
    schema = TemporaryFileListSchema()
    permission_classes = [ProjectEditPermission]
    serializer_class = TemporaryFileSerializer

    def get_queryset(self):
        params = parse(self.request)
        qs = TemporaryFile.objects.filter(project__id=params['project'])
        if params['expired'] is None:
            expired = 0
        else:
            expired = params['expired']

        if expired > 0:
            qs = qs.filter(eol_datetime__lte=datetime.datetime.now())

        return qs

    def delete(self, request, format=None, **kwargs):
        response = Response({})
        try:
            qs = self.get_queryset()
            qs.delete()
            response=Response({'message': 'Delete successful'},
                              status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            logger.warning(traceback.format_exc())
        finally:
            return response

    def post(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = parse(request)
            url = params['url']
            project = params['project']
            name = params['name']
            hours = params['hours']
            if hours == None:
                hours = 24

            local_file_path = os.path.join(settings.UPLOAD_ROOT,url.split('/')[-1])
            temp_file = TemporaryFile.from_local(path=local_file_path,
                                                 name=params['name'],
                                                 project=Project.objects.get(pk=project),
                                                 user=request.user,
                                                 lookup=params['lookup'],
                                                 hours = hours)
            response = Response(
                {'message': f"Temporary file of {name} created!", 'id': temp_file.id},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            logger.warning(traceback.format_exc())
        finally:
            # Delete files from the uploads directory.
            if 'local_file_path' in locals():
                logger.info(f"Removing uploaded file {local_file_path}")
                if os.path.exists(local_file_path):
                    logger.info(f"{local_file_path} exists and is being removed!")
                    os.remove(local_file_path)
                info_path = os.path.splitext(local_file_path)[0] + '.info'
                if os.path.exists(info_path):
                    os.remove(info_path)
            return response;

class TemporaryFileDetailAPI(generics.RetrieveDestroyAPIView):
    """ Interact with temporary file.

        Temporary files are files stored server side for a defined duration. The file must
        first be uploaded via tus, and can subsequently be saved using this endpoint.
    """
    queryset = TemporaryFile.objects.all()
    serializer_class = TemporaryFileSerializer
    permission_classes = [ProjectEditPermission]
    schema = TemporaryFileDetailSchema()
