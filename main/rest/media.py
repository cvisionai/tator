import tempfile
import traceback
import logging
import os
import subprocess
import math
import io
from PIL import Image, ImageDraw, ImageFont
import textwrap

from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.db import connection
from django.conf import settings

from ..models import EntityBase
from ..models import EntityMediaBase
from ..models import EntityMediaImage
from ..models import EntityMediaVideo
from ..serializers import EntityMediaSerializer
from ..search import TatorSearch
from ..renderers import JpegRenderer
from ..renderers import GifRenderer

from ._media_query import get_media_queryset
from ._attributes import AttributeFilterSchemaMixin
from ._attributes import AttributeFilterMixin
from ._attributes import bulk_patch_attributes
from ._attributes import patch_attributes
from ._attributes import validate_attributes
from ._util import delete_polymorphic_qs
from ._schema import Schema
from ._permissions import ProjectEditPermission
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

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

class MediaListAPI(ListAPIView, AttributeFilterMixin):
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
            print(f"EXCEPTION: {dne}")
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"EXCEPTION: {e}")
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class MediaDetailAPI(RetrieveUpdateDestroyAPIView):
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

class GetFrameAPI(APIView):
    schema = Schema({'GET' : [
        coreapi.Field(name='pk',
                      required=True,
                      location='path',
                      schema=coreschema.Integer(description='A unique integer value identifying a media')),
        coreapi.Field(name='frames',
                      required=False,
                      location='query',
                      schema=coreschema.String(description='Comma-seperated list of frames to capture (default = 0)')),
        coreapi.Field(name='tile',
                      required=False,
                      location='query',
                      schema=coreschema.String(description='wxh, if not supplied is made as squarish as possible')),
        coreapi.Field(name='roi',
                      required=False,
                      location='query',
                      schema=coreschema.String(description='w:h:x:y,[w:h:x:y], optionally crop each frame to a given roi in relative coordinates. Supply either a single roi for all frames or a list one roi for each.')),
        coreapi.Field(name='animate',
                      required=False,
                      location='query',
                      schema=coreschema.String(description='If not tiling, animate each frame at a given fps in a gif.')),

    ]})


    renderer_classes = (JpegRenderer,)
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        return EntityBase.objects.all()

    def generate_error_image(self, code, message):
        font_bold = ImageFont.truetype("DejaVuSans-Bold.ttf", 32)
        font = ImageFont.truetype("DejaVuSans.ttf", 28)
        img = Image.open(os.path.join(settings.STATIC_ROOT,
                                      "images/computer.jpg"))
        draw = ImageDraw.Draw(img)
        W, H = img.size

        x_bias = 60
        header=f"Error {code}"
        w, h = draw.textsize(header)
        logger.info(f"{W}-{w}/2; {H}-{h}/2")
        offset = font.getoffset(header)
        logger.info(f"Offset = {offset}")

        draw.text((W/2-((w/2)+x_bias),80), header, (255,62,29), font=font_bold)


        _, line_height = draw.textsize(message)
        line_height *= 3
        start_height = 200-line_height
        lines = textwrap.wrap(message,17)
        for line_idx, line in enumerate(lines):
            draw.text((100,start_height+(line_height*line_idx)), line, (255,62,29), font=font)

        img_buf = io.BytesIO()
        img.save(img_buf, "jpeg", quality=95)
        return img_buf.getvalue()

    def get(self, request, **kwargs):
        """ Facility to get a frame(jpg/png) of a given video frame, returns a square tile of frames based on the input parameter """
        try:
            logger.info("Got here")
            # upon success we can return an image
            values = self.schema.parse(request, kwargs)
            video = EntityMediaVideo.objects.get(pk=values['pk'])
            logger.info(f"{values['frames']}")
            frames = request.query_params.get('frames', '0')
            frames = frames.split(",")

            if len(frames) > 32:
                raise Exception("Too many frames requested (Max = 32)")

            for frame in frames:
                if int(frame) >= video.num_frames:
                    raise Exception(f"Frame {frame} is invalid. Maximum frame is {video.num_frames-1}")
                elif int(frame) < 0:
                    raise Exception(f"Frame {frame} is invalid. Must be greater than 0.")
            tile_size = values['tile']

            if values['tile'] and values['animate']:
                raise Exception("Can't supply both tile and animate arguments")

            if values['animate']:
                if values['animate'].isdecimal() is False:
                    raise Exception('Animation FPS must be an integer')
                if int(values['animate']) > 15 or int(values['animate']) <= 0:
                    raise Exception('Animation FPS must be between >0 and <=15')

            try:
                if tile_size != None:
                    # check supplied tile size makes sense
                    comps=tile_size.split('x')
                    if len(comps) != 2:
                        raise Exception("Bad Tile Size")
                    if int(comps[0])*int(comps[1]) < len(frames):
                        raise Exception("Bad Tile Size")
            except:
                tile_size = None
            # compute the required tile size
            if tile_size == None:
                width = math.ceil(math.sqrt(len(frames)))
                height = math.ceil(len(frames) / width)
                tile_size = f"{width}x{height}"

            if video.file:
                video_file = video.file.path
                height = video.height
                width = video.width
                # Make file relative to URL to be consistent with streaming files below
                video_file = os.path.relpath(video_file, settings.MEDIA_ROOT)
                video_file = os.path.join(settings.MEDIA_URL, video_file)
            else:
                video_file = video.media_files["streaming"][0]["path"]
                height = video.media_files["streaming"][0]["resolution"][0]
                width = video.media_files["streaming"][0]["resolution"][1]

            fps = video.fps
            # compute the crop argument
            crop_filter = None
            roi = request.query_params.get('roi', None)
            if roi:
                crop_filter = [None] * len(frames)
                roi_list = roi.split(',')
                logger.info(roi_list)
                if len(roi_list) == 1:
                    # Repeat the same roi if only 1 is given for a set
                    comps = roi_list[0].split(':')
                    if len(comps) == 4:
                        box_width = round(float(comps[0])*width)
                        box_height = round(float(comps[1])*height)
                        x = round(float(comps[2])*width)
                        y = round(float(comps[3])*height)
                        crop_filter = [f"crop={box_width}:{box_height}:{x}:{y}"]*len(frames)
                else:
                    # If each individual roi is supplied manually set each one
                    if len(roi_list) != len(frames):
                        raise Exception(f'Explicit roi list{len(roi_list)} is different length than frame list{len(frames)}')
                    for idx,frame_roi in enumerate(roi_list):
                        comps = frame_roi.split(':')
                        if len(comps) == 4:
                            box_width = round(float(comps[0])*width)
                            box_height = round(float(comps[1])*height)
                            x = round(float(comps[2])*width)
                            y = round(float(comps[3])*height)
                            crop_filter[idx] = f"crop={box_width}:{box_height}:{x}:{y}"
                            logger.info(f"Crop_filter = {crop_filter[idx]}")

            def frame_to_time_str(frame):
                total_seconds = int(frame) / fps
                hours = math.floor(total_seconds / 3600)
                minutes = math.floor((total_seconds % 3600) / 60)
                seconds = total_seconds % 60
                return f"{hours}:{minutes}:{seconds}"


            with tempfile.TemporaryDirectory() as temp_dir:
                # Convert file to local path for processing
                video_file = os.path.relpath(video_file, settings.MEDIA_URL)
                video_file = os.path.join(settings.MEDIA_ROOT, video_file)
                logger.info(f"Processing {video_file}")
                args = ["ffmpeg"]
                inputs = []
                outputs = []
                for frame_idx,frame in enumerate(frames):
                    outputs.extend(["-map", f"{frame_idx}:v","-frames:v", "1", "-q:v", "3"])
                    if crop_filter:
                        outputs.extend(["-vf", crop_filter[frame_idx]])

                    outputs.append(os.path.join(temp_dir,f"{frame_idx}.jpg"))
                    inputs.extend(["-ss", frame_to_time_str(frame), "-i", video_file])
                args.extend(inputs)
                args.extend(outputs)
                logger.info(" ".join(args))

                proc = subprocess.run(args, check=True, capture_output=True)
                if len(frames) > 1 and values['animate']:
                    gif_args = ["ffmpeg",
                                 "-framerate", str(values['animate']),
                                 "-i", os.path.join(temp_dir, f"%d.jpg"),
                                 "-r", "2",
                                 os.path.join(temp_dir,"animation.gif")]
                    logger.info(gif_args)
                    proc = subprocess.run(gif_args, check=True, capture_output=True)
                    with open(os.path.join(temp_dir,"animation.gif"), 'rb') as data_file:
                        request.accepted_renderer = GifRenderer()
                        response = Response(data_file.read())
                elif len(frames) > 1:
                    # Make a tiled jpeg
                    tile_args = ["ffmpeg",
                                 "-i", os.path.join(temp_dir, f"%d.jpg"),
                                 "-vf", f"tile={tile_size}",
                                 "-q:v", "3",
                                 os.path.join(temp_dir,"tile.jpg")]
                    logger.info(tile_args)
                    proc = subprocess.run(tile_args, check=True, capture_output=True)
                    with open(os.path.join(temp_dir,"tile.jpg"), 'rb') as data_file:
                        response = Response(data_file.read())
                else:
                    with open(os.path.join(temp_dir,f"0.jpg"), 'rb') as data_file:
                        response = Response(data_file.read())


        except ObjectDoesNotExist as dne:
            response=Response(self.generate_error_image(404, "No Media Found"),
                              status=status.HTTP_404_NOT_FOUND)
            logger.warning(traceback.format_exc())
        except Exception as e:
            response=Response(self.generate_error_image(400, str(e)),
                              status=status.HTTP_400_BAD_REQUEST)
            logger.warning(traceback.format_exc())
        finally:
            return response
