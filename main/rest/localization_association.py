import traceback
import logging

from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import LocalizationAssociation
from ..models import EntityLocalizationBox
from ..serializers import LocalizationAssociationSerializer
from ..schema import LocalizationAssociationDetailSchema
from ..schema import parse

from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)

class LocalizationAssociationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Modify a localization association.

        Localization associations specify which localizations that a `State` object applies to.
    """
    schema = LocalizationAssociationDetailSchema()
    serializer_class = LocalizationAssociationSerializer
    queryset = LocalizationAssociation.objects.all()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def patch(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = parse(request)
            associationObject=LocalizationAssociation.objects.get(pk=params['id'])
            self.check_object_permissions(request, associationObject)
            if 'localizations' in params:
                localization_ids = params['localizations']
                localizations=EntityLocalizationBox.objects.filter(pk__in=localization_ids)
                associationObject.localizations.add(*localizations)

            if 'color' in params:
                associationObject.color = params['color']

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

