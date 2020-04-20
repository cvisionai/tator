import traceback
import logging
from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import TreeLeaf
from ..models import Project
from ..models import EntityTypeBase
from ..serializers import TreeLeafSerializer
from ..search import TatorSearch
from ..schema import TreeLeafSuggestionSchema
from ..schema import TreeLeafListSchema
from ..schema import TreeLeafDetailSchema
from ..schema import parse

from ._attributes import AttributeFilterMixin
from ._attributes import count_by_attribute
from ._attributes import patch_attributes
from ._attributes import bulk_patch_attributes
from ._attributes import validate_attributes
from ._attributes import convert_attribute
from ._util import paginate
from ._util import computeRequiredFields
from ._permissions import ProjectViewOnlyPermission
from ._permissions import ProjectFullControlPermission

logger = logging.getLogger(__name__)

class TreeLeafSuggestionAPI(APIView):
    """ Rest Endpoint compatible with devbridge suggestion format.

    <https://github.com/kraaden/autocomplete>
    """
    schema = TreeLeafSuggestionSchema()
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, format=None, **kwargs):
        params = parse(request)
        minLevel=int(params.get('minLevel', 1))
        startsWith=params.get('query', None)
        ancestor=params['ancestor']
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['size'] = 10
        query['sort']['_exact_treeleaf_name'] = 'asc'
        query['query']['bool']['filter'] = [
            {'match': {'_dtype': {'query': 'treeleaf'}}},
            {'range': {'_treeleaf_depth': {'gte': minLevel}}},
            {'query_string': {'query': f'{startsWith}* AND _treeleaf_path:{ancestor}*'}},
        ]
        ids, _ = TatorSearch().search(params['project'], query)
        queryset = list(TreeLeaf.objects.filter(pk__in=ids))

        suggestions=[]
        for idx,match in enumerate(queryset):
            group = params['ancestor']
            if match.parent:
                group = match.parent.name

            suggestion={
                "value": match.name,
                "group": group,
                "data": {}
            }

            if 'alias' in match.attributes:
                suggestion["data"]["alias"] = match.attributes['alias']

            catAlias=None
            if match.parent:
                if match.parent.attributes:
                    catAlias=match.parent.attributes.get("alias",None)
                if catAlias != None:
                    suggestion["group"] = f'{suggestion["group"]} ({catAlias})'


            suggestions.append(suggestion);

        def functor(elem):
            return elem["group"]

        suggestions.sort(key=functor)
        resp = Response(suggestions)
        return resp

class TreeLeafListAPI(ListAPIView, AttributeFilterMixin):
    """ Interact with a list of tree leaves.

        Tree leaves are used to define label hierarchies that can be used for autocompletion
        of string attribute types.
    """
    serializer_class = TreeLeafSerializer
    schema=TreeLeafListSchema()
    permission_classes = [ProjectFullControlPermission]

    def get(self, request, *args, **kwargs):
        try:
            params = parse(request)
            self.validate_attribute_filter(params)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;
        if self.operation:
            qs = self.get_queryset() # TODO self.get_queryset().count() fails figure out why
            if self.operation == 'count':
                return Response({'count': len(qs)})
            else:
                raise Exception('Invalid operation parameter!')
        else:
            return super().get(request, *args, **kwargs)

    def post(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = parse(request)
            parent = params.get('parent', None)
            name = params['name']
            entityTypeId = params['type']
            attr = params.get('attributes', None)
            project = Project.objects.get(pk=params['project'])

            try:
                entityType = EntityTypeBase.objects.get(pk=int(entityTypeId))
            except:
                raise Exception(f'Entity type ID {entityTypeId} does not exist!')

            requiredFields, reqAttributes, attrTypes = computeRequiredFields(entityType)

            for field in {**requiredFields, **reqAttributes}:
                if field not in params:
                    raise Exception('Missing key "{}". Required for = "{}"'.format(field,entityType.name));

            for attrType, field in zip(attrTypes, reqAttributes):
                convert_attribute(attrType, params[field]) # Validates attribute value

            tl=TreeLeaf(name=name,
                        project=project,
                        attributes=attr,
                        meta=entityType)
            if parent:
                tl.parent=TreeLeaf.objects.get(pk=parent)

            tl.path=tl.computePath()
            tl.save()
            response=Response({'id': tl.id},
                              status=status.HTTP_201_CREATED)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response

    def get_queryset(self):
        # Figure out what object we are dealing with
        params = parse(self.request)
        obj=TreeLeaf
        queryset = obj.objects.filter(project=params['project'])
        ancestorTree = None

        ancestorId=params.get('ancestor', None)
        name=params.get('name', None)
        type_id=params.get('type', None)

        if ancestorId != None:
            ancestor = TreeLeaf.objects.get(path=ancestorId)
            queryset = ancestor.subcategories(0)

        if name != None:
            queryset = queryset.filter(name=name)

        if type_id != None:
            queryset = queryset.filter(meta_id=type_id)

        queryset = self.filter_by_attribute(queryset)

        queryset = paginate(params, queryset)

        return queryset;

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            self.validate_attribute_filter(params)
            qs = self.get_queryset()
            if qs.count() > 0:
                new_attrs = validate_attributes(request, qs[0])
                bulk_patch_attributes(new_attrs, qs)
            response = Response({'message': 'Attribute patch successful!'},
                                status=status.HTTP_200_OK)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def delete(self, request, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            self.validate_attribute_filter(params)
            qs = list(self.get_queryset())
            types = set(map(lambda x: type(x), qs))
            ids = list(map(lambda x: x.id, list(qs)))
            for entity_type in types:
                # Go through each unique type
                qs = entity_type.objects.filter(pk__in=ids)
                qs.delete()
            response=Response({'message': 'Batch delete successful!'},
                              status=status.HTTP_204_NO_CONTENT)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class TreeLeafDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Interact with individual tree leaf.

        Tree leaves are used to define label hierarchies that can be used for autocompletion
        of string attribute types.
    """
    schema = TreeLeafDetailSchema()
    serializer_class = TreeLeafSerializer
    queryset = TreeLeaf.objects.all()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            leaf_object = TreeLeaf.objects.get(pk=params['id'])
            if 'name' in params:
                leaf_object.name = params['name']
                leaf_object.save()
            new_attrs = validate_attributes(request, leaf_object)
            patch_attributes(new_attrs, leaf_object)
        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        return response;

