from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status

from ..models import LocalizationAssociation
from ..models import EntityLocalizationBox
from ..serializers import LocalizationAssociationSerializer

from ._permissions import ProjectEditPermission

class LocalizationAssociationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = LocalizationAssociationSerializer
    queryset = LocalizationAssociation.objects.all()
    permission_classes = [ProjectEditPermission]

    def patch(self, request, format=None, **kwargs):
        response=Response({})
        try:
            reqObject=request.data
            associationObject=LocalizationAssociation.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, associationObject)
            localization_ids=reqObject.get("localizations", None)
            if localization_ids:
                logger.info("Localization ids = {}".format(localization_ids))
                localizations=EntityLocalizationBox.objects.filter(pk__in=localization_ids)
                logger.info("Localization query = {}".format(localizations))
                associationObject.localizations.add(*localizations)

            color = reqObject.get("color", None)
            if color:
                associationObject.color = color

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

