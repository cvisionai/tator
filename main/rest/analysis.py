from rest_framework.generics import ListCreateAPIView
from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi

from ..models import AnalysisBase
from ..serializers import AnalysisSerializer

from ._permissions import ProjectFullControlPermission

class AnalysisAPI(ListCreateAPIView):
    serializer_class = AnalysisSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
    ])
    permission_classes = [ProjectFullControlPermission]

    def get_queryset(self):
        project_id = self.kwargs['project']
        qs = AnalysisBase.objects.filter(project__id=project_id)
        return qs

