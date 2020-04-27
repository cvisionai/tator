import traceback
import logging
import time

from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityLocalizationBase
from ..models import EntityLocalizationBox
from ..models import EntityLocalizationLine
from ..models import EntityLocalizationDot
from ..models import EntityTypeLocalizationBase
from ..models import EntityTypeLocalizationBox
from ..models import EntityTypeLocalizationLine
from ..models import EntityTypeLocalizationDot
from ..models import EntityMediaBase
from ..models import EntityMediaImage
from ..models import EntityTypeMediaVideo
from ..models import EntityBase
from ..models import User
from ..models import Version
from ..models import type_to_obj
from ..serializers import EntityLocalizationSerializer
from ..serializers import FastEntityLocalizationSerializer
from ..search import TatorSearch
from ..schema import LocalizationListSchema
from ..schema import LocalizationDetailSchema
from ..schema import parse

from ._annotation_query import get_annotation_queryset
from ._attributes import AttributeFilterMixin
from ._attributes import patch_attributes
from ._attributes import bulk_patch_attributes
from ._attributes import validate_attributes
from ._attributes import convert_attribute
from ._util import delete_polymorphic_qs
from ._util import computeRequiredFields
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)

class LocalizationListAPI(APIView, AttributeFilterMixin):
    """ Interact with list of localizations.

        Localizations are shape annotations drawn on a video or image. They are currently of type
        box, line, or dot. Each shape has slightly different data members. Localizations are
        a type of entity in Tator, meaning they can be described by user defined attributes.

        This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
        Both are accomplished using the same query parameters used for a GET request.
    """
    serializer_class = EntityLocalizationSerializer
    schema=LocalizationListSchema()
    permission_classes = [ProjectEditPermission]

    def get_queryset(self):
        params = parse(self.request)
        self.validate_attribute_filter(params)
        annotation_ids, annotation_count, _ = get_annotation_queryset(
            params['project'],
            params,
            'localization',
        )
        queryset = EntityLocalizationBase.objects.filter(pk__in=annotation_ids)
        return queryset

    def get(self, request, format=None, **kwargs):
        try:
            params = parse(request)
            self.validate_attribute_filter(params)
            annotation_ids, annotation_count, _ = get_annotation_queryset(
                params['project'],
                params,
                'localization',
            )
            self.request=request
            before=time.time()
            qs = EntityLocalizationBase.objects.filter(pk__in=annotation_ids)
            if self.operation:
                if self.operation == 'count':
                    responseData = {'count': qs.count()}
                else:
                    raise Exception('Invalid operation parameter!')
            else:
                responseData=FastEntityLocalizationSerializer(qs)
                if request.accepted_renderer.format == 'csv':
                    # CSV creation requires a bit more
                    user_ids=list(qs.values('user').distinct().values_list('user', flat=True))
                    users=list(User.objects.filter(id__in=user_ids).values('id','email'))
                    email_dict={}
                    for user in users:
                        email_dict[user['id']] = user['email']

                    media_ids=list(qs.values('media').distinct().values_list('media', flat=True))
                    medias=list(EntityMediaBase.objects.filter(id__in=media_ids).values('id','name'))
                    filename_dict={}
                    for media in medias:
                        filename_dict[media['id']] = media['name']

                    filter_type=params.get('type', None)
                    type_obj=EntityTypeLocalizationBase.objects.get(pk=filter_type)
                    for element in responseData:
                        del element['meta']

                        oldAttributes = element['attributes']
                        del element['attributes']
                        element.update(oldAttributes)

                        user_id = element['user']
                        media_id = element['media']

                        element['user'] = email_dict[user_id]
                        element['media'] = filename_dict[media_id]

                    responseData = responseData
            after=time.time()
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;
        return Response(responseData)

    def addNewLocalization(self, reqObject, inhibit_signal, cache=None):
        media_id=[]

        stage = {}
        stage[0] = time.time()
        media_id = reqObject['media_id'];
        entityTypeId=reqObject['type']

        stage[1] = time.time()
        if cache:
            entityType = cache['type']
        else:
            entityType = EntityTypeLocalizationBase.objects.get(id=entityTypeId)

        if type(entityType) == EntityTypeMediaVideo:
            if 'frame' not in reqObject:
                raise Exception('Missing required frame identifier')

        project = entityType.project
        if cache:
            mediaElement=cache['media']
        else:
            mediaElement = EntityMediaBase.objects.get(pk=media_id)
        stage[2] = time.time()

        modified = None
        if 'modified' in reqObject:
            modified = bool(reqObject['modified'])

        if 'version' in reqObject:
            version = Version.objects.get(pk=reqObject['version'])
        else:
            # If no version is given, assign the localization to version 0 (baseline)
            version = Version.objects.filter(project=project, number=0)
            if version.exists():
                version = version[0]
            else:
                # If version 0 does not exist, create it.
                version = Version.objects.create(
                    name="Baseline",
                    description="Initial version",
                    project=project,
                    number=0,
                )

        newObjType=type_to_obj(type(entityType))
        stage[3] = time.time()

        if cache:
            requiredFields, reqAttributes, attrTypes=cache['required']
        else:
            requiredFields, reqAttributes, attrTypes=computeRequiredFields(entityType)

        for field in {**requiredFields,**reqAttributes}:
            if field not in reqObject:
                raise Exception('Missing key "{}". Required for = "{}"'.format(field,entityType.name));

        stage[4] = time.time()
        # Build required keys based on object type (box, line, etc.)
        # Query the model object and get the names we look for (x,y,etc.)
        localizationFields={}
        for field in requiredFields:
            localizationFields[field] = reqObject[field]

        attrs={}
        for field, attrType in zip(reqAttributes, attrTypes):
            convert_attribute(attrType, reqObject[field]) # Validates the attribute value
            attrs[field] = reqObject[field];

        stage[5] = time.time()
        # Finally make the object, filling in all the info we've collected
        obj = newObjType(project=project,
                         meta=entityType,
                         media=mediaElement,
                         user=self.request.user,
                         attributes=attrs,
                         modified=modified,
                         created_by=self.request.user,
                         modified_by=self.request.user,
                         version=version)

        for field, value in localizationFields.items():
            setattr(obj, field, value)
        stage[6] = time.time()
        if 'frame' in reqObject:
            obj.frame = reqObject['frame']
        else:
            obj.frame = 0

        if 'sequence' in reqObject:
            obj.state = reqObject['state']

        stage[7] = time.time()
        # Set temporary bridge flag for relative coordinates
        obj.relativeCoords=True
        if inhibit_signal:
            obj._inhibit = True
        obj.save()
        stage[8] = time.time()
        #for x in range(8):
        #    logger.info(f"stage {x}: {stage[x+1]-stage[x]}")
        return obj
    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            entityType=None
            many = params.get('many', None)
            obj_ids = []
            ts = TatorSearch()
            if many:
                documents = []
                group_by_media = {}
                begin = time.time()
                for obj in many:
                    media_id = obj['media_id']
                    if media_id in group_by_media:
                        group_by_media[media_id].append(obj)
                    else:
                        group_by_media[media_id] = [obj]

                for media_id in group_by_media:
                    cache={}
                    cache['media'] = EntityMediaBase.objects.get(pk=media_id)
                    cache['type'] = None
                    for obj in group_by_media[media_id]:
                        if cache['type'] is None or cache['type'].id != obj['type']:
                            cache['type'] = EntityTypeLocalizationBase.objects.get(id=obj['type'])
                            cache['required'] = computeRequiredFields(cache['type'])
                        new_obj = self.addNewLocalization(obj, True, cache)
                        obj_ids.append(new_obj.id)
                        documents.extend(ts.build_document(new_obj))
                after = time.time()
                logger.info(f"Total Add Duration = {after-begin}")
                begin = time.time()
                ts.bulk_add_documents(documents)
                after = time.time()
                logger.info(f"Total Index Duration = {after-begin}")
            else:
                new_obj = self.addNewLocalization(params, False)
                obj_ids.append(new_obj.id)
            response=Response({'id': obj_ids},
                              status=status.HTTP_201_CREATED)

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
            annotation_ids, annotation_count, query = get_annotation_queryset(
                params['project'],
                params,
                'localization',
            )
            if len(annotation_ids) == 0:
                raise ObjectDoesNotExist
            qs = EntityBase.objects.filter(pk__in=annotation_ids)
            delete_polymorphic_qs(qs)
            TatorSearch().delete(self.kwargs['project'], query)
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

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            self.validate_attribute_filter(params)
            annotation_ids, annotation_count, query = get_annotation_queryset(
                params['project'],
                params,
                'localization',
            )
            if len(annotation_ids) == 0:
                raise ObjectDoesNotExist
            qs = EntityBase.objects.filter(pk__in=annotation_ids)
            new_attrs = validate_attributes(request, qs[0])
            bulk_patch_attributes(new_attrs, qs)
            TatorSearch().update(self.kwargs['project'], query, new_attrs)
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


class LocalizationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Interact with single localization.

        Localizations are shape annotations drawn on a video or image. They are currently of type
        box, line, or dot. Each shape has slightly different data members. Localizations are
        a type of entity in Tator, meaning they can be described by user defined attributes.
    """
    schema = LocalizationDetailSchema()
    serializer_class = EntityLocalizationSerializer
    queryset = EntityLocalizationBase.objects.all()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            localization_object = EntityLocalizationBase.objects.get(pk=params['id'])

            # Patch frame.
            frame = params.get("frame", None)
            if frame:
                localization_object.frame = frame

            if type(localization_object) == EntityLocalizationBox:
                x = params.get("x", None)
                y = params.get("y", None)
                height = params.get("height", None)
                width = params.get("width", None)
                thumbnail_image = params.get("thumbnail_image", None)
                if x:
                    localization_object.x = x
                if y:
                    localization_object.y = y
                if height:
                    localization_object.height = height
                if width:
                    localization_object.width = width

                # If the localization moved; the thumbnail is expired
                if (x or y or height or width) and \
                   localization_object.thumbnail_image:
                    localization_object.thumbnail_image.delete()

                if thumbnail_image:
                    try:
                        thumbnail_obj=\
                            EntityMediaImage.objects.get(pk=thumbnail_image)
                        localization_object.thumbnail_image = thumbnail_obj
                    except:
                        logger.error("Bad thumbnail reference given")
                # TODO we shouldn't be saving here (after patch below)
                localization_object.save()
            elif type(localization_object) == EntityLocalizationLine:
                x0 = params.get("x0", None)
                y0 = params.get("y0", None)
                x1 = params.get("x1", None)
                y1 = params.get("y1", None)
                if x0:
                    localization_object.x0 = x0
                if y0:
                    localization_object.y0 = y0
                if x1:
                    localization_object.x1 = x1
                if y1:
                    localization_object.y1 = y1
                localization_object.save()
            elif type(localization_object) == EntityLocalizationDot:
                x = params.get("x", None)
                y = params.get("y", None)
                if x:
                    localization_object.x = x
                if y:
                    localization_object.y = y
                localization_object.save()
            else:
                # TODO: Handle lines and dots (and circles too someday.)
                pass

            # Patch modified field
            if "modified" in params:
                localization_object.modified = params["modified"]
                localization_object.save()

            new_attrs = validate_attributes(request, localization_object)
            patch_attributes(new_attrs, localization_object)

            # Patch the thumbnail attributes
            if localization_object.thumbnail_image:
                patch_attributes(new_attrs, localization_object.thumbnail_image)

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

