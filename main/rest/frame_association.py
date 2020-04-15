import traceback

from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import FrameAssociation
from ..models import EntityMediaImage
from ..serializers import FrameAssociationSerializer

from ._permissions import ProjectEditPermission

class FrameAssociationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Modifiy a Frame Association Object
    """
    serializer_class = FrameAssociationSerializer
    queryset = FrameAssociation.objects.all()
    permission_classes = [ProjectEditPermission]

    def patch(self, request, format=None, **kwargs):
        response=Response({})
        try:
            reqObject=request.data
            associationObject=FrameAssociation.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, associationObject)

            frame = reqObject.get("frame", None)
            if frame:
                associationObject.frame = frame

            extracted_id = reqObject.get("extracted", None)
            if extracted_id:
                image = EntityMediaImage.objects.get(pk=extracted_id)
                associationObject.extracted = image
            associationObject.save()

        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

