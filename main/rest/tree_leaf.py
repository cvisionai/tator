import traceback
import logging
import datetime
from collections import defaultdict

from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
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

from ._attributes import AttributeFilterSchemaMixin
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

    ```
    {
    <TBD>
    }
   ```
    """
    schema=AutoSchema(manual_fields=
                      [coreapi.Field(name='ancestor',
                                     required=False,
                                     location='path',
                                     schema=coreschema.String(description='Get descedants of a tree element (inclusive), by path (i.e. ITIS.Animalia)')),
                       coreapi.Field(name='minLevel',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='Integer specifying level of results that are inputable. I.e. 2 refers to grandchildren if ancestor points to a grandparent.')),
                       coreapi.Field(name='query',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='A string to search for matching names'))
    ])
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, format=None, **kwargs):
        s0 = datetime.datetime.now()
        minLevel=int(self.request.query_params.get('minLevel', 1))
        startsWith=self.request.query_params.get('query', None)
        ancestor=kwargs['ancestor']
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['size'] = 10
        query['sort']['_exact_treeleaf_name'] = 'asc'
        query['query']['bool']['filter'] = [
            {'match': {'_dtype': {'query': 'treeleaf'}}},
            {'range': {'_treeleaf_depth': {'gte': minLevel}}},
            {'query_string': {'query': f'{startsWith}* AND _treeleaf_path:{ancestor}*'}},
        ]
        ids, _ = TatorSearch().search(kwargs['project'], query)
        queryset = list(TreeLeaf.objects.filter(pk__in=ids))

        suggestions=[]
        s1 = datetime.datetime.now()
        for idx,match in enumerate(queryset):
            group = kwargs['ancestor']
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

        s2 = datetime.datetime.now()
        suggestions.sort(key=functor)
        s3 = datetime.datetime.now()
        resp = Response(suggestions)
        s4 = datetime.datetime.now()
        logger.info(f"Timing stage 0 = {s1-s0}, stage 1 = {s2-s1}, stage 2 = {s3-s2}, stage 3 = {s4-s3}, total={s4-s0}")
        return resp

class TreeLeafListSchema(AutoSchema, AttributeFilterSchemaMixin):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        postOnly_fields = []

        if (method=='GET'):
            getOnly_fields = [coreapi.Field(name='project',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
                              coreapi.Field(name='ancestor',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='Get descedants of a tree element (inclusive). Path name to root of tree.')),
                              coreapi.Field(name='type',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='Integer type id of tree leaf')),
                              coreapi.Field(name='name',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='A string to search for matching names'))
            ] + self.attribute_fields()
        if (method=='POST'):
             postOnly_fields = [coreapi.Field(name='name',
                                     required=True,
                                     location='body',
                                              schema=coreschema.String(description='A name to apply to the element')),
                                coreapi.Field(name='parent',
                                     required=False,
                                     location='body',
                                              schema=coreschema.String(description='ID to use as parent if there is one.')),
                                coreapi.Field(name='attributes',
                                     required=False,
                                     location='body',
                                              schema=coreschema.String(description='JSON structure representing attributes of this tree leaf element')),
                                coreapi.Field(name='project',
                                     required=False,
                                     location='body',
                                     schema=coreschema.String(description='ID to a project to associate with'))
             ]

        return manual_fields + getOnly_fields + postOnly_fields + self.attribute_fields()

class TreeLeafListAPI(ListAPIView, AttributeFilterMixin):
    serializer_class = TreeLeafSerializer
    schema=TreeLeafListSchema()
    permission_classes = [ProjectFullControlPermission]

    def get(self, request, *args, **kwargs):
        try:
            self.validate_attribute_filter(request.query_params)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;
        if self.operation:
            qs = self.get_queryset() # TODO self.get_queryset().count() fails figure out why
            if self.operation == 'count':
                return Response({'count': len(qs)})
            elif self.operation.startswith('attribute_count'):
                _, attr_name = self.operation.split('::')
                return Response(count_by_attribute(qs, attr_name))
            else:
                raise Exception('Invalid operation parameter!')
        else:
            return super().get(request, *args, **kwargs)

    def post(self, request, format=None, **kwargs):
        response=Response({})
        try:
            reqObject=request.data;
            parent=reqObject.get("parent", None)
            name=reqObject.get("name", None)
            attr=reqObject.get("attributes", None)
            project=Project.objects.get(pk=kwargs['project'])

            if name is None:
                raise Exception('Missing required field in request Object "name", got={}'.format(reqObject))

            if 'type' in reqObject:
                entityTypeId=reqObject['type']
            else:
                raise Exception('Missing required field in request object "entity_type_id"')

            try:
                entityType = EntityTypeBase.objects.get(pk=int(entityTypeId))
            except:
                raise Exception(f'Entity type ID {entityTypeId} does not exist!')

            requiredFields, reqAttributes, attrTypes=computeRequiredFields(entityType)

            for field in {**requiredFields,**reqAttributes}:
                if field not in reqObject:
                    raise Exception('Missing key "{}". Required for = "{}"'.format(field,entityType.name));

            for attrType, field in zip(attrTypes, reqAttributes):
                convert_attribute(attrType, reqObject[field]) # Validates attribute value

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
        obj=TreeLeaf
        queryset = obj.objects.filter(project=self.kwargs['project'])
        ancestorTree = None

        ancestorId=self.request.query_params.get('ancestor', None)
        name=self.request.query_params.get('name', None)
        type_id=self.request.query_params.get('type', None)

        if ancestorId != None:
            ancestor = TreeLeaf.objects.get(path=ancestorId)
            queryset = ancestor.subcategories(0)

        if name != None:
            queryset = queryset.filter(name=name)

        if type_id != None:
            queryset = queryset.filter(meta_id=type_id)

        queryset = self.filter_by_attribute(queryset)

        queryset = paginate(self.request.query_params, queryset)

        return queryset;

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            self.validate_attribute_filter(request.query_params)
            qs = self.get_queryset()
            if qs.count() > 0:
                new_attrs = validate_attributes(request, qs[0])
                bulk_patch_attributes(new_attrs, qs)
            response=Response({'message': 'Attribute patch successful!'},
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
            self.validate_attribute_filter(request.query_params)
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
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = TreeLeafSerializer
    queryset = TreeLeaf.objects.all()
    permission_classes = [ProjectFullControlPermission]

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            leaf_object = TreeLeaf.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, leaf_object)
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
        finally:
            return response;

