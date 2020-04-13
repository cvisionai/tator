import traceback

from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import AttributeTypeBase
from ..models import AttributeTypeBool
from ..models import AttributeTypeInt
from ..models import AttributeTypeFloat
from ..models import AttributeTypeEnum
from ..models import AttributeTypeString
from ..models import AttributeTypeDatetime
from ..models import AttributeTypeGeoposition
from ..models import Project
from ..serializers import AttributeTypeSerializer

from ._schema import Schema
from ._attributes import convert_attribute
from ._permissions import ProjectFullControlPermission


class AttributeTypesAPI(APIView):
    serializer_class = AttributeTypeSerializer
    permission_classes = [ProjectFullControlPermission]
    schema = Schema({
        'all': [
            coreapi.Field(
                name='project',
                location='path',
                required=True,
                schema=coreschema.Integer(description='A unique integer identifying a project')),
        ],
        'GET': [
            coreapi.Field(
                name='applies_to',
                location='body',
                required=False,
                schema=coreschema.Integer(description='Unique integer identifying an entity type '
                                                      'that this attribute describes.')),
        ],
        'POST': [
            coreapi.Field(
                name='name',
                location='body',
                required=True,
                schema=coreschema.String(description='Name of the attribute.')),
            coreapi.Field(
                name='description',
                location='body',
                required=False,
                schema=coreschema.String(description='Description of the attribute.')),
            coreapi.Field(
                name='dtype',
                location='body',
                required=True,
                schema=coreschema.Enum(description='Data type of the attribute.',
                                       enum=['bool', 'int', 'float', 'enum', 'str', 
                                             'datetime', 'geopos'])),
            coreapi.Field(
                name='applies_to',
                location='body',
                required=True,
                schema=coreschema.Integer(description='Unique integer identifying an entity type '
                                                      'that this attribute describes.')),
            coreapi.Field(
                name='order',
                location='body',
                required=False,
                schema=coreschema.Integer(description='Integer specifying where this attribute '
                                                      'is displayed in the UI. Negative values '
                                                      'are hidden by default.')),
            coreapi.Field(
                name='default',
                location='body',
                required=False,
                schema=coreschema.String(description='Default value for the attribute.')),
            coreapi.Field(
                name='lower_bound',
                location='body',
                required=False,
                schema=coreschema.Number(description='Lower bound for float or int dtype.')),
            coreapi.Field(
                name='upper_bound',
                location='body',
                required=False,
                schema=coreschema.Number(description='Upper bound for float or int dtype.')),
            coreapi.Field(
                name='choices',
                location='body',
                required=False,
                schema=coreschema.Array(description='Array of possible values for enum dtype.')),
            coreapi.Field(
                name='labels',
                location='body',
                required=False,
                schema=coreschema.Array(description='Array of labels for enum dtype.')),
            coreapi.Field(
                name='autocomplete',
                location='body',
                required=False,
                schema=coreschema.Object(
                    description='JSON object indictating URL of autocomplete service.',
                    properties={'serviceUrl': coreschema.String(
                        description='URL of autocomplete service.',
                    )},
                ),
            ),
        ],
    })

    def get(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = self.schema.parse(request, kwargs)
            qs = AttributeTypeBase.object.filter(project=params['project'])
            if params['applies_to']:
                qs = qs.filter(**params)
            return qs
            response_data = AttributeTypeSerializer(qs)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;
        return Response(response_data)

    def post(self, request, format=None, **kwargs):
        response=Response({})
        try:
            # Get the parameters.
            params = self.schema.parse(request, kwargs)

            # Pop off optional parameters.
            dtype = params.pop('dtype')
            default = params.pop('default')
            lower_bound = params.pop('lower_bound')
            upper_bound = params.pop('upper_bound')
            choices = params.pop('choices')
            labels = params.pop('labels')

            # Create the attribute type.
            if dtype == 'bool':
                obj = AttributeTypeBool(**params)
            elif dtype == 'int':
                obj = AttributeTypeInt(**params)
            elif dtype == 'float':
                obj = AttributeTypeFloat(**params)
            elif dtype == 'enum':
                obj = AttributeTypeEnum(**params, choices=choices, labels=labels)
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
            return response;

class AttributeTypeAPI(RetrieveUpdateDestroyAPIView):
    serializer_class = AttributeTypeSerializer
    permission_classes = [ProjectFullControlPermission]
    schema = {
        'all': [
            coreapi.Field(
                name='pk',
                location='path',
                required=True,
                schema=coreschema.Integer(description='A unique integer identifying an attribute type')),
        ],
        'GET': [],
        'PATCH': [
            coreapi.Field(
                name='name',
                location='body',
                required=False,
                schema=coreschema.String(description='Name of the attribute.')),
            coreapi.Field(
                name='description',
                location='body',
                required=False,
                schema=coreschema.String(description='Description of the attribute.')),
        ],
        'DELETE': [],
    }

    def patch(self, request, format=None, **kwargs):
        """ Updates a localization type.
        """
        response = Response({})
        try:
            params = self.schema.parse(request, kwargs)
            obj = AttributeTypeBase.objects.get(pk=params['pk'])
            if params['name'] is not None:
                obj.name = name
            if params['description'] is not None:
                obj.description = description
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


