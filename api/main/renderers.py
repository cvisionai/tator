from rest_framework.renderers import BaseRenderer
from rest_framework.renderers import JSONRenderer
from django_ltree.fields import PathValue
from .encoders import TatorJSONEncoder

import csv
import io
import ujson
import logging

from collections import OrderedDict
from pprint import pprint


logger = logging.getLogger(__name__)


class CsvRenderer(BaseRenderer):
    """renders an object (list of objects) to a CSV file"""

    media_type = "text/plain"
    format = "csv"

    def render(self, listObj, media_type=None, renderer_context=None):
        """Flattens list of objects into a CSV"""
        temp_file = io.StringIO()
        temp_list = []
        return_value = "No Records found."
        try:
            if len(listObj) > 0:
                field_names = set()
                for entry in listObj:
                    field_names.update(list(entry.keys()))
                for entry in listObj:
                    row_object = {}
                    for field in field_names:
                        if type(entry.get(field)) in [OrderedDict, dict]:
                            row_object.update(entry.get(field))
                        else:
                            row_object[field] = entry.get(field)
                    temp_list.append(row_object)
                writer = csv.DictWriter(temp_file, fieldnames=field_names, extrasaction="ignore")
                writer.writeheader()
                writer.writerows(temp_list)
                return_value = temp_file.getvalue()
        except Exception as e:
            return_value = str(e)
        finally:
            return return_value


class PprintRenderer(BaseRenderer):
    """renders an object (list of objects) to a CSV file"""

    media_type = "application/json"
    format = "pprint"

    def render(self, listObj, media_type=None, renderer_context=None):
        """Returns a pretty printed representation of the list object"""
        return ujson.dumps(listObj, indent=4, default=str)


class TatorRenderer(JSONRenderer):
    encoder_class = TatorJSONEncoder

class TatorJSONLRenderer(JSONRenderer):
    media_type = "application/jsonl"
    format = "jsonl"

    def render(self, data, media_type=None, renderer_context=None):
        """Renders a list of objects to JSON Lines format."""
        if isinstance(data, list):
            return "\n".join(ujson.dumps(item, default=str) for item in data) + "\n"
        return ujson.dumps(data, default=str)

class JpegRenderer(BaseRenderer):
    media_type = "image/jpeg"
    charset = None
    format = "jpg"

    def render(self, data, media_type=None, renderer_context=None):
        return data


class PngRenderer(BaseRenderer):
    media_type = "image/png"
    charset = None
    format = "png"

    def render(self, data, media_type=None, renderer_context=None):
        return data


class GifRenderer(BaseRenderer):
    media_type = "image/gif"
    charset = None
    format = "gif"

    def render(self, data, media_type=None, renderer_context=None):
        return data


class Mp4Renderer(BaseRenderer):
    media_type = "video/mp4"
    charset = None
    format = "mp4"

    def render(self, data, media_type=None, renderer_context=None):
        return data
