import traceback

from rest_framework.schemas.openapi import AutoSchema
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import FrameAssociation
from ..models import EntityMediaImage
from ..serializers import FrameAssociationSerializer

from ._schema import parse
from ._permissions import ProjectEditPermission

class FrameAssociationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['State']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a frame association.',
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
                        'frame': {
                            'description': 'Video frame number for this association.',
                            'type': 'integer',
                        },
                        'extracted': {
                            'description': 'Unique integer identifying an extracted image.',
                            'type': 'integer',
                        },
                    },
                },
                'example': {
                    'frame': 100,
                    'extracted': 1,
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find frame association with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'PATCH':
            responses['200'] = {'description': 'Successful update of frame association.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful delete of frame association.'}
        return responses

class FrameAssociationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Modify a frame association.

        Frame associations specify which frames that a `State` object applies to.
    """
    serializer_class = FrameAssociationSerializer
    queryset = FrameAssociation.objects.all()
    permission_classes = [ProjectEditPermission]
    schema = FrameAssociationDetailSchema()
    lookup_field = 'id'

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
                                status=status.HTTP_201_CREATED)

        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        return response;

