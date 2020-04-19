import traceback
import logging

from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import AttributeTypeBase
from ..models import EntityMediaBase
from ..schema import parse

from ._util import delete_polymorphic_qs
from ._util import reverse_queryArgs
from ._permissions import ProjectFullControlPermission

logger = logging.getLogger(__name__)

class EntityTypeListAPIMixin(APIView):
    """ Generic service for associated EntityTypes with attributes

    Derived classes must set pkname + entity_endpoiunt
    """
    pkname=None
    entity_endpoint=None
    entityBaseObj=None
    baseObj=None
    entityTypeAttrSerializer=None
    permission_classes = [ProjectFullControlPermission]

    def get(self, request, format=None, **kwargs):
        """
        Returns a list of all LocalizationTypes associated with the given media.
        """
        response=Response({})

        try:
            params = parse(request)
            media_id = params.get('media_id', None)
            if media_id != None:
                logger.info(f"Getting media {media_id}")
                mediaElement = EntityMediaBase.objects.get(pk=media_id)
                if mediaElement.project.id != self.kwargs['project']:
                    raise Exception('Media Not in Project')
                entityTypes = self.entityBaseObj.objects.filter(media=mediaElement.meta)
            else:
                entityTypes = self.entityBaseObj.objects.filter(project=self.kwargs['project'])

            type_id = params.get('type', None)
            if type_id != None:
                entityTypes = entityTypes.filter(pk=type_id)

            results=list()
            for entityType in entityTypes:
                dataurl=None
                count=0
                if media_id:
                    dataurl=request.build_absolute_uri(
                        reverse_queryArgs(self.entity_endpoint,
                                          kwargs={'project': self.kwargs['project']},
                                          queryargs={self.pkname : media_id,
                                                     'type' : entityType.id}
                        ))

                    count=self.baseObj.selectOnMedia(media_id).filter(meta=entityType).count()
                results.append({"type": entityType,
                                "columns": AttributeTypeBase.objects.filter(applies_to=entityType.id),
                                "data" : dataurl,
                                "count" : count })

            response = Response(self.entityTypeAttrSerializer(results, many=True).data);
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

class EntityTypeDetailAPIMixin(RetrieveUpdateDestroyAPIView):
    pkname=None
    entity_endpoint=None
    entityBaseObj=None
    baseObj=None
    entityTypeAttrSerializer=None
    permission_classes = [ProjectFullControlPermission]
    
    def get(self, request, format=None, **kwargs):
        """ Returns single entity type.
        """
        response=Response({})

        try:
            params = parse(request)
            entityTypeId = params['id']

            entityType = self.entityBaseObj.objects.get(pk=entityTypeId)

            dataurl=request.build_absolute_uri(
                    reverse_queryArgs(self.entity_endpoint,
                                      kwargs={'project': entityType.project.pk},
                                      queryargs={'type' : entityTypeId}))
            result={"type": entityType,
                     "columns": AttributeTypeBase.objects.filter(applies_to=entityType),
                     "data" : dataurl,
                     "count": 0}

            response = Response(self.entityTypeAttrSerializer(result).data);
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

    def delete(self, request, format=None, **kwargs):
        """ Deletes a localization type.
        """
        response = Response({})
        try:
            params = parse(request)
            pk = params['id']
            obj = self.entityBaseObj.objects.get(pk=pk)
            attr_types = AttributeTypeBase.objects.filter(applies_to=pk)
            delete_polymorphic_qs(attr_types)
            obj.delete()
            response=Response({'message': f'{self.entity_endpoint} type deleted successfully!'},
                              status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

    def get_queryset(self):
        return self.entityBaseObj.objects.all()

