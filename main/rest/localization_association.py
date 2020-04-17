import traceback
import logging

from rest_framework.schemas.openapi import AutoSchema
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import LocalizationAssociation
from ..models import EntityLocalizationBox
from ..serializers import LocalizationAssociationSerializer

from ._schema import parse
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)

class LocalizationAssociationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['State']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a localization association.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'properties': {
                        'localizations': {
                            'description': 'List of localization IDs.',
                            'type': 'array',
                            'items': {'type': 'integer'},
                        },
                        'color': {
                            'description': 'A six digit hex-code Color to represent this '
                                           'association in the UI. If not given a color is '
                                           'used from a predefined progression.',
                            'type': 'string',
                        },
                    },
                },
                'example': {
                    'localizations': [1, 5, 10],
                    'color': '#03a1fc',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find localization association with '
                                           'given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'PATCH':
            responses['200'] = {'description': 'Successful update of localization association.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful delete of localization association.'}
        return responses


class LocalizationAssociationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Modify a localization association.

        Localization associations specify which localizations that a `State` object applies to.
    """
    schema = LocalizationAssociationDetailSchema()
    serializer_class = LocalizationAssociationSerializer
    queryset = LocalizationAssociation.objects.all()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'

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

