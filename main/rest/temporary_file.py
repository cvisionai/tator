import traceback

from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from rest_framework import views
from django.core.exceptions import ObjectDoesNotExist
from ._permissions import ProjectEditPermission

from ..models import TemporaryFile
from ..serializers import TemporaryFileSerializer
from ..schema import TemporaryFileDetailSchema
from ..schema import TemporaryFileListSchema
from rest_framework.schemas.openapi import AutoSchema
from ..schema import parse

class TemporaryFileAPI(generics.RetrieveDestroyAPIView):
    queryset = TemporaryFile.objects.all()
    serializer_class = TemporaryFileSerializer
    permission_classes = [ProjectEditPermission]
    schema = TemporaryFileDetailSchema()

class TemporaryFileListAPI(generics.ListAPIView):
    schema = TemporaryFileListSchema()
    permission_classes = [ProjectEditPermission]
    serializer_class = TemporaryFileSerializer

    def get_queryset(self):
        params = parse(self.request)
        qs = TemporaryFile.objects.filter(project__id=params['project'])
        return qs

    def post(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = parse(request)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            logger.warning(traceback.format_exc())
        finally:
            # Delete files from the uploads directory.
            if 'upload_paths' in locals():
                for key in upload_paths:
                    logger.info(f"Removing uploaded file {upload_paths[key]}")
                    if os.path.exists(upload_paths[key]):
                        logger.info(f"{upload_paths[key]} exists and is being removed!")
                        os.remove(upload_paths[key])
                    info_path = os.path.splitext(upload_paths[key])[0] + '.info'
                    if os.path.exists(info_path):
                        os.remove(info_path)
            return response;
