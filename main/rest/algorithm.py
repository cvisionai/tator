from rest_framework.generics import ListAPIView
from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi

from ..models import Algorithm
from ..serializers import AlgorithmSerializer

from ._permissions import ProjectViewOnlyPermission

class AlgorithmListAPI(ListAPIView):
    serializer_class = AlgorithmSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')
        ),
    ])
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        project_id = self.kwargs['project']
        qs = Algorithm.objects.filter(project__id=project_id)
        return qs

