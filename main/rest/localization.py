from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView

from ..models import EntityLocalizationBase
from ..models import EntityLocalizationBox
from ..models import EntityLocalizationLine
from ..models import EntityLocalizationDot
from ..serializers import EntityLocalizationSerializer
from ..serializers import FastEntityLocalizationSerializer

from ._attributes import AttributeFilterSchemaMixin
from ._attributes import AttributeFilterMixin
from ._permissions import ProjectEditPermission

class LocalizationListSchema(AutoSchema, AttributeFilterSchemaMixin):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        postOnly_fields = []

        manual_fields += [
            coreapi.Field(
                name='project',
                required=True,
                location='path',
                schema=coreschema.String(description='A unique integer identifying a project')
            ),
        ]

        if (method=='GET'):
            getOnly_fields = [
                coreapi.Field(name='media_id',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a media_element')),
                coreapi.Field(name='type',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a LocalizationType')),
                coreapi.Field(name='version',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a Version')),
                coreapi.Field(name='modified',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Set to true for original + modified annotations, false for original only')),
            ] + self.attribute_fields()
        if (method=='POST'):
             postOnly_fields = [
                coreapi.Field(name='media_id',
                              required=True,
                              location='body',
                              schema=coreschema.String(description='A unique integer value identifying a media_element')),
                coreapi.Field(name='type',
                              required=True,
                              location='body',
                              schema=coreschema.String(description='A unique integer value identifying a LocalizationType')),
                coreapi.Field(name='<details>',
                              required=False,
                              location='body',
                              schema=coreschema.String(description='Various depending on `type`. See `/EntityTypeSchema` service.')),
                coreapi.Field(name='operation',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Operation to perform on the query. Valid values are:\ncount: Return the number of elements\nattribute_count: Return count split by a given attribute name')),

            ]

        return manual_fields + getOnly_fields + postOnly_fields + self.attribute_fields()

class LocalizationList(APIView, AttributeFilterMixin):
    """
    Endpoint for getting + adding localizations

    Example:

    #all types all videos
    GET /localizations

    #only lines for media_id=3 of type 1
    GET /localizations?type=1&media=id=3

    """
    serializer_class = EntityLocalizationSerializer
    schema=LocalizationListSchema()
    permission_classes = [ProjectEditPermission]

    def get_queryset(self):
        mediaId = self.request.query_params.get('media_id', None)
        filterType = self.request.query_params.get('type', None)
        attribute = self.request.query_params.get('attribute', None)
        # Figure out what object we are dealing with
        obj=EntityLocalizationBase
        if filterType != None:
            typeObj=EntityTypeLocalizationBase.objects.get(pk=filterType)
            if type(typeObj) == EntityTypeLocalizationBox:
                obj=EntityLocalizationBox
            elif type(typeObj) == EntityTypeLocalizationLine:
                obj=EntityLocalizationLine
            elif type(typeObj) == EntityTypeLocalizationDot:
                obj=EntityLocalizationDot
            else:
                raise Exception('Unknown localization type')
        else:
            raise Exception('Missing type parameter!')

        if mediaId != None:
            queryset = obj.objects.filter(media=mediaId)
        else:
            queryset = obj.objects.filter(project=self.kwargs['project'])

        if filterType != None:
            queryset = queryset.filter(meta=filterType)

        queryset = self.filter_by_attribute(queryset)

        return queryset

    def get(self, request, format=None, **kwargs):
        try:
            self.validate_attribute_filter(request.query_params)
            annotation_ids, annotation_count, _ = get_annotation_queryset(
                self.kwargs['project'],
                self.request.query_params,
                self,
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

                    filter_type=self.request.query_params.get('type', None)
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
        ## Check for required fields first
        if 'media_id' in reqObject:
            media_id = reqObject['media_id'];
        else:
            raise Exception('Missing required field in request Object "media_id", got={}'.format(reqObject))

        if 'type' in reqObject:
            entityTypeId=reqObject['type']
        else:
            raise Exception('Missing required field in request object "type"')

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
            entityType=None
            reqObject=request.data;
            many=reqObject.get('many', None)
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
                new_obj = self.addNewLocalization(reqObject, False)
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

class LocalizationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = EntityLocalizationSerializer
    queryset = EntityLocalizationBase.objects.all()
    permission_classes = [ProjectEditPermission]

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            localization_object = EntityLocalizationBase.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, localization_object)
            if type(localization_object) == EntityLocalizationBox:
                x = request.data.get("x", None)
                y = request.data.get("y", None)
                height = request.data.get("height", None)
                width = request.data.get("width", None)
                thumbnail_image = request.data.get("thumbnail_image", None)
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
                x0 = request.data.get("x0", None)
                y0 = request.data.get("y0", None)
                x1 = request.data.get("x1", None)
                y1 = request.data.get("y1", None)
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
                x = request.data.get("x", None)
                y = request.data.get("y", None)
                if x:
                    localization_object.x = x
                if y:
                    localization_object.y = y
                localization_object.save()
            else:
                # TODO: Handle lines and dots (and circles too someday.)
                pass

            # Patch modified field
            if "modified" in request.data:
                localization_object.modified = request.data["modified"]
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

