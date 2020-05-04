import traceback

from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import FrameAssociation
from ..models import EntityMediaImage
from ..serializers import FrameAssociationSerializer
from ..schema import FrameAssociationDetailSchema
from ..schema import parse

from ._permissions import ProjectEditPermission

class FrameAssociationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Modify a frame association.

        Frame associations specify which frames that a `State` object applies to.
    """
    serializer_class = FrameAssociationSerializer
    queryset = FrameAssociation.objects.all()
    permission_classes = [ProjectEditPermission]
    schema = FrameAssociationDetailSchema()
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def patch(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = parse(request)
            associationObject=FrameAssociation.objects.get(pk=params['id'])
            self.check_object_permissions(request, associationObject)

            if 'frame' in params:
                associationObject.frame = params['frame']

            if 'extracted' in params:
                image = EntityMediaImage.objects.get(pk=params['extracted'])
                associationObject.extracted = image
            associationObject.save()
            response = Response({'message': f"Frame association updated successfully!"},
                                status=status.HTTP_200_OK)

        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        return response;

