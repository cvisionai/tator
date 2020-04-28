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

class TemporaryFileAPI(generics.RetrieveDestroyAPIView):
    """ Access a detailed view of a temporary file given an id """
    queryset = TemporaryFile.objects.all()
    serializer_class = TemporaryFileSerializer
    permission_classes = [ProjectEditPermission]
    schema = TemporaryFileDetailSchema()

class TemporaryFileListAPI(generics.ListAPIView):
    """ Access a list of temporary files associated with a project """
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
            now = datetime.datetime.utcnow()
            eol =  now + datetime.timedelta(hours=hours)
            extension = os.path.splitext(name)[-1]
            local_file_path = os.path.join(settings.UPLOAD_ROOT,url.split('/')[-1])
            destination_fp=os.path.join(settings.MEDIA_ROOT, f"{project}", f"{uuid.uuid1()}{extension}")
            logger.info(f"Local path = {local_file_path}")
            logger.info(f"Local path = {destination_fp}")
            shutil.copyfile(local_file_path, destination_fp)
            temporary_file = TemporaryFile(name=params['name'],
                                           project=Project.objects.get(pk=project),
                                           user=request.user,
                                           path=destination_fp,
                                           lookup=params['lookup'],
                                           created_datetime=now,
                                           eol_datetime = eol)
            temporary_file.save()
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
