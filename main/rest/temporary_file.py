import traceback

from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from django.core.exceptions import ObjectDoesNotExist
from ._permissions import ProjectEditPermission

from ..models import TemporaryFile
from ..serializers import TemporaryFileSerializer
from ..schema import TemporaryFileDetailSchema
from rest_framework.schemas.openapi import AutoSchema

class TemporaryFileAPI(generics.RetrieveDestroyAPIView):
    queryset = TemporaryFile.objects.all()
    serializer_class = TemporaryFileSerializer
    permission_classes = [ProjectEditPermission]
    schema = TemporaryFileDetailSchema()
