import traceback

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from django.core.exceptions import ObjectDoesNotExist

from ..models import AttributeTypeBase
from ..models import AttributeTypeBool
from ..models import AttributeTypeInt
from ..models import AttributeTypeFloat
from ..models import AttributeTypeEnum
from ..models import AttributeTypeString
from ..models import AttributeTypeDatetime
from ..models import AttributeTypeGeoposition
from ..models import EntityTypeBase
from ..models import Project
from ..serializers import AttributeTypeSerializer
from ..schema import AttributeTypeListSchema
from ..schema import AttributeTypeDetailSchema
from ..schema import parse

from ._attributes import convert_attribute
from ._permissions import ProjectFullControlPermission

class AttributeTypeListAPI(APIView):
    """ Create or list attribute types.

        Attribute types are used to define data types that describe entities. An
        attribute may give information about a media, localization, or state entity 
        in the form of a boolean, integer, float, string, enumeration, datetime, 
        or geoposition. Besides the data type, attribute types define attribute
        defaults, bounds, and other constraints.
    """
    serializer_class = AttributeTypeSerializer
    permission_classes = [ProjectFullControlPermission]
    schema = AttributeTypeListSchema()

    def get(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = parse(request)
            qs = AttributeTypeBase.objects.filter(project=params['project'])
            if 'applies_to' in params:
                qs = qs.filter(**params)
            response = Response(AttributeTypeSerializer(qs, many=True).data)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response

    def get_queryset(self):
        return AttributeTypeBase.objects.all()

    def post(self, request, format=None, **kwargs):
        response=Response({})
        try:
            # Get the parameters.
            params = parse(request)

            # Convert pk to objects.
            params['applies_to'] = EntityTypeBase.objects.get(pk=params['applies_to'])
            params['project'] = Project.objects.get(pk=params['project'])

            # Pull off parameters that need further processing.
            dtype = params.pop('dtype')
            default = params.pop('default', None)
            lower_bound = params.pop('lower_bound', None)
            upper_bound = params.pop('upper_bound', None)

            # Create the attribute type.
            if dtype == 'bool':
                obj = AttributeTypeBool(**params)
            elif dtype == 'int':
                obj = AttributeTypeInt(**params)
            elif dtype == 'float':
                obj = AttributeTypeFloat(**params)
            elif dtype == 'enum':
                obj = AttributeTypeEnum(**params)
            elif dtype == 'str':
                obj = AttributeTypeString(**params)
            elif dtype == 'datetime':
                obj = AttributeTypeDatetime(**params)
            elif dtype == 'geopos':
                obj = AttributeTypeGeoposition(**params)

            # Set parameters that need conversion.
            if default:
                obj.default = convert_attribute(obj, default)
            if lower_bound:
                obj.lower_bound = convert_attribute(obj, lower_bound)
            if upper_bound:
                obj.upper_bound = convert_attribute(obj, upper_bound)
            obj.save()
            response=Response({'message': 'Attribute type created successfully!', 'id': obj.id},
                              status=status.HTTP_201_CREATED)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response

class AttributeTypeDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Interact with an individual attribute type.

        Attribute types are used to define data types that describe entities. An
        attribute may give information about a media, localization, or state entity 
        in the form of a boolean, integer, float, string, enumeration, datetime, 
        or geoposition. Besides the data type, attribute types define attribute
        defaults, bounds, and other constraints.
    """
    serializer_class = AttributeTypeSerializer
    permission_classes = [ProjectFullControlPermission]
    schema = AttributeTypeDetailSchema()
    lookup_field='id'

    def patch(self, request, format=None, **kwargs):
        """ Updates a localization type.
        """
        response = Response({})
        try:
            params = parse(request)
            obj = AttributeTypeBase.objects.get(pk=params['id'])
            if 'name' in params:
                obj.name = params['name']
            if 'description' in params:
                obj.description = params['description']
            obj.save()
            response=Response({'message': 'Attribute type updated successfully!'},
                              status=status.HTTP_200_OK)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

    def get_queryset(self):
        return AttributeTypeBase.objects.all()

