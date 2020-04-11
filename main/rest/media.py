from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.generics import ListAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView

from ..models import EntityMediaBase
from ..models import EntityMediaImage
from ..models import EntityMediaVideo
from ..serializers import EntityMediaSerializer
from ..search import TatorSearch

from ._media_query import get_media_queryset
from ._attributes import AttributeFilterSchemaMixin
from ._attributes import AttributeFilterMixin
from ._permissions import ProjectEditPermission

class MediaListSchema(AutoSchema, AttributeFilterSchemaMixin):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        if (method=='GET'):
            getOnly_fields = [
                coreapi.Field(name='project',
                              required=True,
                              location='path',
                              schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
                coreapi.Field(name='media_id',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a media_element')),
                coreapi.Field(name='type',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a MediaType')),
                coreapi.Field(name='name',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Name of the media to filter on')),
                coreapi.Field(name='search',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Searches against filename and attributes for matches')),
                coreapi.Field(name='md5',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='MD5 sum of the media file')),
                coreapi.Field(name='operation',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Operation to perform on the query. Valid values are:\ncount: Return the number of elements')),
            ]
        return manual_fields + getOnly_fields + self.attribute_fields()

class EntityMediaListAPI(ListAPIView, AttributeFilterMixin):
    """
    Endpoint for getting lists of media

    Example:

    #all types all videos
    GET /Medias

    #only lines for media_id=3 of type 1
    GET /Medias?type=1&media=id=3

    """
    serializer_class = EntityMediaSerializer
    schema=MediaListSchema()
    permission_classes = [ProjectEditPermission]

    def get(self, request, *args, **kwargs):
        try:
            self.validate_attribute_filter(request.query_params)
            media_ids, media_count, _ = get_media_queryset(
                self.kwargs['project'],
                self.request.query_params,
                self
            )
            if len(media_ids) > 0:
                qs = EntityMediaBase.objects.filter(pk__in=media_ids).order_by('name')
                # We are doing a full query; so we should bypass the ORM and
                # use the SQL cursor directly.
                # TODO: See if we can do this using queryset into a custom serializer instead
                # of naked SQL.
                original_sql,params = qs.query.sql_with_params()
                root_url = request.build_absolute_uri("/").strip("/")
                media_url = request.build_absolute_uri(settings.MEDIA_URL)
                raw_url = request.build_absolute_uri(settings.RAW_ROOT)
                # Modify original sql to have aliases to match JSON output
                original_sql = original_sql.replace('"main_entitybase"."id,"', '"main_entitybase"."id" AS id,',1)
                original_sql = original_sql.replace('"main_entitybase"."polymorphic_ctype_id",', '',1)
                original_sql = original_sql.replace('"main_entitybase"."project_id",', '"main_entitybase"."project_id" AS project,',1)
                original_sql = original_sql.replace('"main_entitybase"."meta_id",', '"main_entitybase"."meta_id" AS meta,',1)
                original_sql = original_sql.replace('"main_entitymediabase"."file",', f'CONCAT(\'{media_url}\',"main_entitymediabase"."file") AS url,',1)

                new_selections =  f'NULLIF(CONCAT(\'{media_url}\',"main_entitymediavideo"."thumbnail"),\'{media_url}\') AS video_thumbnail'
                new_selections += f', NULLIF(CONCAT(\'{media_url}\',"main_entitymediaimage"."thumbnail"),\'{media_url}\') AS image_thumbnail'
                new_selections += f', NULLIF(CONCAT(\'{media_url}\',"main_entitymediavideo"."thumbnail_gif"),\'{media_url}\') AS video_thumbnail_gif'
                new_selections += f', NULLIF(CONCAT(\'{root_url}\',"main_entitymediavideo"."original"),\'{root_url}\') AS original_url'
                new_selections += f', "main_entitymediavideo"."media_files" AS media_files'
                original_sql = original_sql.replace(" FROM ", f",{new_selections} FROM ",1)

                #Add new joins
                new_joins = f'LEFT JOIN "main_entitymediaimage" ON ("main_entitymediabase"."entitybase_ptr_id" = "main_entitymediaimage"."entitymediabase_ptr_id")'
                new_joins += f' LEFT JOIN "main_entitymediavideo" ON ("main_entitymediabase"."entitybase_ptr_id" = "main_entitymediavideo"."entitymediabase_ptr_id")'
                original_sql = original_sql.replace(" INNER JOIN ", f" {new_joins} INNER JOIN ",1)

                # Generate JSON serialization string
                json_sql = f"SELECT json_agg(r) FROM ({original_sql}) r"
                logger.info(json_sql)

                with connection.cursor() as cursor:
                    cursor.execute(json_sql,params)
                    result = cursor.fetchone()
                    responseData=result[0]
                    if responseData is None:
                        responseData=[]
            else:
                responseData = []
        except Exception as e:
            logger.error(traceback.format_exc())
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;

        return Response(responseData)

    def get_queryset(self):
        media_ids, media_count, _ = get_media_queryset(
            self.kwargs['project'],
            self.request.query_params,
            self
        )
        queryset = EntityMediaBase.objects.filter(pk__in=media_ids).order_by('name')
        return queryset

    def delete(self, request, **kwargs):
        response = Response({})
        try:
            self.validate_attribute_filter(request.query_params)
            media_ids, media_count, query = get_media_queryset(
                self.kwargs['project'],
                self.request.query_params,
                self
            )
            if len(media_ids) == 0:
                raise ObjectDoesNotExist
            qs = EntityBase.objects.filter(pk__in=media_ids)
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
            self.validate_attribute_filter(request.query_params)
            media_ids, media_count, query = get_media_queryset(
                self.kwargs['project'],
                self.request.query_params,
                self
            )
            if len(media_ids) == 0:
                raise ObjectDoesNotExist
            qs = EntityBase.objects.filter(pk__in=media_ids)
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

class EntityMediaDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = EntityMediaSerializer
    queryset = EntityMediaBase.objects.all()
    permission_classes = [ProjectEditPermission]

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            if 'attributes' in request.data:
                media_object = EntityMediaBase.objects.get(pk=self.kwargs['pk'])
                self.check_object_permissions(request, media_object)
                new_attrs = validate_attributes(request, media_object)
                patch_attributes(new_attrs, media_object)

                if type(media_object) == EntityMediaImage:
                    for localization in media_object.thumbnail_image.all():
                        patch_attributes(new_attrs, localization)

                del request.data['attributes']
            if 'media_files' in request.data:
                # TODO: for now just pass through, eventually check URL
                media_object = EntityMediaBase.objects.get(pk=self.kwargs['pk'])
                media_object.media_files = request.data['media_files']
                media_object.save()
                logger.info(f"Media files = {media_object.media_files}")

            if bool(request.data):
                super().patch(request, **kwargs)
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

