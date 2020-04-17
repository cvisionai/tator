import traceback

from rest_framework.schemas.openapi import AutoSchema
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

from ._schema import parse
from ._attributes import convert_attribute
from ._permissions import ProjectFullControlPermission

class AttributeTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['AttributeType']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        params = []
        if method == 'GET':
            params = [{
                'name': 'applies_to',
                'in': 'query',
                'required': False,
                'description': 'Unique integer identifying the entity type that this attribute '
                               'describes.',
                'schema': {'type': 'integer'},
            }]
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name', 'dtype', 'applies_to'],
                    'properties': {
                        'name': {
                            'description': 'Name of the attribute.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the attribute.',
                            'type': 'string',
                        },
                        'dtype': {
                            'description': 'Data type of the attribute.',
                            'type': 'string',
                            'enum': ['bool', 'int', 'float', 'enum', 'str',
                                     'datetime', 'geopos'],
                        },
                        'applies_to': {
                            'description': 'Unique integer identifying the entity type that '
                                           'this attribute describes.',
                            'type': 'integer',
                        },
                        'order': {
                            'description': 'Integer specifying relative order this attribute '
                                           'is displayed in the UI. Negative values are hidden '
                                           'by default.',
                            'type': 'integer',
                            'default': 0,
                        },
                        'default': {
                            'description': 'Default value for the attribute.',
                        },
                        'lower_bound': {
                            'description': 'Lower bound for int or float dtype.',
                        },
                        'upper_bound': {
                            'description': 'Upper bound for int or float dtype.',
                        },
                        'choices': {
                            'description': 'Array of possible values for enum dtype.',
                            'type': 'array',
                            'items': {'type': 'string'},
                        },
                        'labels': {
                            'description': 'Array of labels for enum dtype.',
                            'type': 'array',
                            'items': {'type': 'string'},
                        },
                        'autocomplete': {
                            'description': 'Object indicating URL of autocomplete service '
                                           'for string dtype.',
                            'type': 'object',
                        },
                        'use_current': {
                            'description': 'True to use current datetime as default for '
                                           'datetime dtype.',
                            'type': 'boolean',
                        },
                    },
                },
                'examples': {
                    'bool': {
                        'summary': 'Boolean attribute type',
                        'value': {
                            'name': 'My Boolean',
                            'dtype': 'bool',
                            'applies_to': 1,
                            'default': False,
                        },
                    },
                    'int': {
                        'summary': 'Integer attribute type',
                        'value': {
                            'name': 'My Integer',
                            'dtype': 'int',
                            'applies_to': 1,
                            'default': 0,
                            'lower_bound': -1,
                            'upper_bound': 1,
                        },
                    },
                    'float': {
                        'summary': 'Float attribute type',
                        'value': {
                            'name': 'My Float',
                            'dtype': 'float',
                            'applies_to': 1,
                            'default': 0.0,
                            'lower_bound': -1.0,
                            'upper_bound': 1.0,
                        },
                    },
                    'enum': {
                        'summary': 'Enumeration attribute type',
                        'value': {
                            'name': 'My Enumeration',
                            'dtype': 'enum',
                            'applies_to': 1,
                            'default': 'a',
                            'choices': ['a', 'b', 'c'],
                            'labels': ['a', 'b', 'c'],
                        },
                    },
                    'string': {
                        'summary': 'String attribute type',
                        'value': {
                            'name': 'My String',
                            'dtype': 'string',
                            'applies_to': 1,
                            'default': '---',
                            'autocomplete': {
                                'serviceUrl': 'https://www.example.com/suggestion',
                            },
                        },
                    },
                    'datetime': {
                        'summary': 'Datetime attribute type',
                        'value': {
                            'name': 'My Datetime',
                            'dtype': 'datetime',
                            'applies_to': 1,
                            'use_current': True,
                        },
                    },
                    'geopos': {
                        'summary': 'Geoposition attribute type',
                        'value': {
                            'name': 'My Geoposition',
                            'dtype': 'geopos',
                            'applies_to': 1,
                            'default': [-179.0, 90.0],
                        },
                    }
                }
            }}}
        return body

class AttributeTypeListAPI(APIView):
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

class AttributeTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['AttributeType']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an attribute type.',
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
                    'required': ['name', 'dtype', 'applies_to'],
                    'properties': {
                        'name': {
                            'description': 'Name of the attribute.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the attribute.',
                            'type': 'string',
                        },
                    },
                },
                'example': {
                    'name': 'New name',
                    'description': 'New description',
                }
            }}}
        return body

class AttributeTypeDetailAPI(RetrieveUpdateDestroyAPIView):
    serializer_class = AttributeTypeSerializer
    permission_classes = [ProjectFullControlPermission]
    schema = AttributeTypeDetailSchema()

    def patch(self, request, format=None, **kwargs):
        """ Updates a localization type.
        """
        response = Response({})
        try:
            params = self.schema.parse(request, kwargs)
            obj = AttributeTypeBase.objects.get(pk=params['pk'])
            if params['name'] is not None:
                obj.name = params['name']
            if params['description'] is not None:
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


