import logging
import tempfile
import traceback

from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist
from django.db.models.expressions import OuterRef
from django.db.models import Q
from django.db.models import F

from ..models import EntityState
from ..models import EntityTypeState
from ..models import EntityMediaBase
from ..models import EntityLocalizationBase
from ..models import MediaAssociation
from ..models import FrameAssociation
from ..models import LocalizationAssociation
from ..models import Version
from ..models import InterpolationMethods
from ..models import EntityBase
from ..renderers import JpegRenderer,GifRenderer,Mp4Renderer
from ..rest.media import MediaUtil
from ..serializers import EntityStateSerializer
from ..serializers import EntityStateFrameSerializer
from ..serializers import EntityStateLocalizationSerializer
from ..search import TatorSearch
from ..schema import StateListSchema
from ..schema import StateDetailSchema
from ..schema import parse

from ._annotation_query import get_annotation_queryset
from ._attributes import AttributeFilterMixin
from ._attributes import patch_attributes
from ._attributes import bulk_patch_attributes
from ._attributes import validate_attributes
from ._attributes import convert_attribute
from ._util import delete_polymorphic_qs
from ._util import computeRequiredFields
from ._util import Array
from ._permissions import ProjectEditPermission
from ._permissions import ProjectViewOnlyPermission
from ._schema import Schema

logger = logging.getLogger(__name__)

class StateListAPI(APIView, AttributeFilterMixin):
    """ Interact with list of states.

        A state is a description of a collection of other objects. The objects a state describes
        could be media (image or video), video frames, or localizations. A state referring
        to a collection of localizations is often referred to as a track. States are
        a type of entity in Tator, meaning they can be described by user defined attributes.

        This endpoint supports bulk patch of user-defined state attributes and bulk delete.
        Both are accomplished using the same query parameters used for a GET request.
    
        It is importarant to know the fields required for a given entity_type_id as they are 
        expected in the request data for this function. As an example, if the entity_type_id has 
        attribute types associated with it named time and position, the JSON object must have 
        them specified as keys.
    """
    schema=StateListSchema()
    permission_classes = [ProjectEditPermission]

    def get_queryset(self):
        params = parse(self.request)
        self.validate_attribute_filter(params)
        annotation_ids, annotation_count, _ = get_annotation_queryset(
            params['project'],
            params,
        )
        queryset = EntityState.objects.filter(pk__in=annotation_ids)
        return queryset

    def get(self, request, format=None, **kwargs):
        try:
            params = parse(request)
            filterType = params.get('type', None)
            self.validate_attribute_filter(params)
            annotation_ids, annotation_count, _ = get_annotation_queryset(
                params['project'],
                params,
            )
            allStates = EntityState.objects.filter(pk__in=annotation_ids)
            if self.operation:
                if self.operation == 'count':
                    return Response({'count': allStates.count()})
                else:
                    raise Exception('Invalid operation parameter!')
            else:
                if filterType:
                    type_object = EntityTypeState.objects.get(pk=filterType)
                    if type_object.association == 'Frame':
                        # Add frame association media to SELECT columns (frame is there from frame sort operation)
                        allStates = allStates.annotate(frame=F('association__frameassociation__frame')).order_by('frame')
                        # This optomization only works for frame-based associations
                        allStates = allStates.annotate(association_media=F('association__frameassociation__media'))
                        allStates = allStates.annotate(extracted=F('association__frameassociation__extracted'))
                        response = EntityStateFrameSerializer(allStates)
                    elif type_object.association == 'Localization':
                        localquery=LocalizationAssociation.objects.filter(entitystate=OuterRef('pk'))
                        allStates = allStates.annotate(association_color=F('association__localizationassociation__color'),
                                                       association_segments=F('association__localizationassociation__segments'),
                                                       association_localizations=Array(localquery.values('localizations')),
                                                       association_media=F('association__frameassociation__media'))
                        allStates = allStates.order_by('id')
                        response = EntityStateLocalizationSerializer(allStates)
                    else:
                        logger.warning("Using generic/slow serializer")
                        allStates = allStates.order_by('id')
                        response = EntityStateSerializer(allStates, many=True)
                    logger.info(allStates.query)
                else:
                    allStates = allStates.order_by('id')
                    response = EntityStateSerializer(allStates, many=True)
                responseData = response.data
                if request.accepted_renderer.format == 'csv':
                    if filterType:
                        type_object=EntityTypeState.objects.get(pk=filterType)
                        if type_object.association == 'Frame' and type_object.interpolation == InterpolationMethods.LATEST:
                            for idx,el in enumerate(responseData):
                                mediaEl=EntityMediaBase.objects.get(pk=el['association']['media'])
                                endFrame=0
                                if idx + 1 < len(responseData):
                                    next_element=responseData[idx+1]
                                    endFrame=next_element['association']['frame']
                                else:
                                    endFrame=mediaEl.num_frames
                                el['media']=mediaEl.name

                                el['endFrame'] = endFrame
                                el['startSeconds'] = int(el['association']['frame']) * mediaEl.fps
                                el['endSeconds'] = int(el['endFrame']) * mediaEl.fps
                return Response(responseData)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;

    def post(self, request, format=None, **kwargs):
        entityType=None
        response=Response({})

        try:
            params = parse(request)
            media_ids=[]
            if 'media_ids' in params:
                req_ids = params['media_ids'];
                if type(req_ids) == list:
                    media_ids = req_ids
                else:
                    ## Handle when someone uses a singular video
                    media_ids.append(req_ids)
            else:
                raise Exception('Missing required field in request Object "media_ids", got={}'.format(params))

            mediaElements=EntityMediaBase.objects.filter(pk__in=media_ids)

            if mediaElements.count() == 0:
                raise Exception('No matching media elements')

            project=mediaElements[0].project
            for video in mediaElements:
                if video.project != project:
                    raise Exception('Videos cross projects')


            modified = None
            if 'modified' in params:
                modified = bool(params['modified'])

            if 'version' in params:
                version = Version.objects.get(pk=params['version'])
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

            if 'type' in params:
                entityTypeId=params['type']
            else:
                raise Exception('Missing required field in request object "type"')

            entityType = EntityTypeState.objects.get(id=entityTypeId)

            if 'attributes' in params:
                params = {**params, **params['attributes']}

            reqFields, reqAttributes, attrTypes=computeRequiredFields(entityType)

            attrs={}
            for key, attrType in zip(reqAttributes, attrTypes):
                if key in params:
                    convert_attribute(attrType, params[key]) # Validates attr value
                    attrs[key] = params[key];
                else:
                    # missing a key
                    raise Exception('Missing attribute value for "{}". Required for = "{}"'.
                                   format(key,entityType.name));

            obj = EntityState(project=project,
                              meta=entityType,
                              attributes=attrs,
                              created_by=request.user,
                              modified_by=request.user,
                              modified=modified,
                              version=version)

            association=None
            if entityType.association == "Media":
                association=MediaAssociation()
                association.save()
                association.media.add(*mediaElements)
            elif entityType.association == "Frame":
                if 'frame' not in params:
                    raise Exception('Missing "frame" for Frame association')
                if len(media_ids) > 1:
                    raise Exception('Ambigious media id(s) specified for Frame Association')
                association=FrameAssociation(frame=params['frame'])
                association.save()
                association.media.add(*mediaElements)
            elif entityType.association == "Localization":
                if 'localization_ids' not in params:
                    raise Exception('Missing localization ids for localization association')
                localIds=params['localization_ids']
                association=LocalizationAssociation()
                association.save()
                elements=EntityLocalizationBase.objects.filter(pk__in=localIds)
                association.localizations.add(*elements)
            else:
                #This is a programming error
                assoc=entityType.association
                name=entityType.name
                raise Exception(f'Unknown association type {assoc} for {name}')

            association.save()
            obj.association=association
            obj.save()
            response = Response({'id': obj.id},
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

class StateDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Interact with an individual state.

        A state is a description of a collection of other objects. The objects a state describes
        could be media (image or video), video frames, or localizations. A state referring
        to a collection of localizations is often referred to as a track. States are
        a types of entity in Tator, meaning they can be described by user defined attributes.
    """
    schema = StateDetailSchema()
    serializer_class = EntityStateSerializer
    queryset = EntityState.objects.all()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'

    def delete(self, request, **kwargs):
        response = Response({}, status=status.HTTP_204_NO_CONTENT)
        try:
            params = parse(request)
            state_object = EntityState.objects.get(pk=params['id'])
            association_object = state_object.association
            association_object.delete()
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

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            state_object = EntityState.objects.get(pk=params['id'])
            # Patch modified fields
            if 'modified' in params:
                state_object.modified = params['modified']

            if 'frame' in params:
                state_object.association.frame = params['frame']

            if 'media_ids' in params:
                media_elements = EntityMediaBase.objects.filter(pk__in=params['media_ids'])
                state_object.association.media.set(media_elements)

            if 'localization_ids' in params:
                localizations = EntityLocalizationBase.objects.filter(pk__in=params['localization_ids'])
                state_object.association.localizations.set(localizations)
            state_object.save()

            new_attrs = validate_attributes(request, state_object)
            patch_attributes(new_attrs, state_object)


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


class StateGraphicAPI(APIView):
    schema = Schema({'GET' : [
        coreapi.Field(name='pk',
                      required=True,
                      location='path',
                      schema=coreschema.Integer(description='A unique integer value identifying a media')),
        coreapi.Field(name='mode',
                      required=False,
                      location='query',
                      schema=coreschema.String(description='Either "animate" or "tile"')),
        coreapi.Field(name='fps',
                      required=False,
                      location='query',
                      schema=coreschema.String(description='FPS if animating')),
    ]})


    renderer_classes = (JpegRenderer,GifRenderer,Mp4Renderer)
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        return EntityBase.objects.all()

    def get(self, request, **kwargs):
        """ Facility to get frame(s) of a given localization-associated state. Use the mode argument to control whether it is an animated gif or a tiled jpg. 

        TODO: Add logic for all state types
"""
        try:
            # upon success we can return an image
            values = self.schema.parse(request, kwargs)
            state = EntityState.objects.get(pk=values['pk'])

            mode = values['mode']
            if mode == None:
                mode = 'animate'
            fps = values['fps']

            if fps == None:
                fps = 2
            else:
                fps = int(fps)

            typeObj = state.meta
            if typeObj.association != 'Localization':
                raise Exception('Not a localization association state')

            video = state.association.media.all()[0]
            localizations = state.association.localizations.all()
            frames = [l.frame for l in localizations]
            roi = [(l.width, l.height, l.x, l.y) for l in localizations]
            with tempfile.TemporaryDirectory() as temp_dir:
                media_util = MediaUtil(video, temp_dir)
                if mode == "animate":
                    if any(x is request.accepted_renderer.format for x in ['mp4','gif']):
                        pass
                    else:
                        request.accepted_renderer = GifRenderer()
                    gif_fp = media_util.getAnimation(frames, roi, fps,request.accepted_renderer.format)
                    with open(gif_fp, 'rb') as data_file:
                        request.accepted_renderer = GifRenderer()
                        response = Response(data_file.read())
                else:
                    max_w = 0
                    max_h = 0
                    for el in roi:
                        if el[0] > max_w:
                            max_w = el[0]
                        if el[1] > max_h:
                            max_h = el[1]

                    # rois have to be the same size box for tile to work
                    new_rois = [(max_w,max_h, r[2]+((r[0]-max_w)/2), r[3]+((r[1]-max_h)/2)) for r in roi]
                    for idx,r in enumerate(roi):
                        print(f"{r} corrected to {new_rois[idx]}")
                    print(f"{max_w} {max_h}")
                    tiled_fp = media_util.getTileImage(frames, new_rois)
                    with open(tiled_fp, 'rb') as data_file:
                        request.accepted_renderer = JpegRenderer()
                        response = Response(data_file.read())


        except ObjectDoesNotExist as dne:
            response=Response(MediaUtil.generate_error_image(404, "No Media Found"),
                              status=status.HTTP_404_NOT_FOUND)
            logger.warning(traceback.format_exc())
        except Exception as e:
            response=Response(MediaUtil.generate_error_image(400, str(e)),
                              status=status.HTTP_400_BAD_REQUEST)
            logger.warning(traceback.format_exc())
        finally:
            return response
