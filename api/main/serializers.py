import os
import re

from rest_framework import serializers

from django.conf import settings
from django.db import models
from django.db.models.functions import Cast

from .models import TemporaryFile, User, Version
import logging
import datetime
import traceback

logger = logging.getLogger(__name__)


class EnumField(serializers.ChoiceField):
    def __init__(self, enum, **kwargs):
        self.enum = enum
        kwargs["choices"] = [(e.value, e.value) for e in enum]
        super().__init__(**kwargs)

    def to_representation(self, obj):
        return obj.value

    def to_internal_value(self, data):
        try:
            return self.enum[data]
        except:
            self.fail("invalid_choice", input=data)


class TemporaryFileSerializer(serializers.ModelSerializer):
    """Basic serializer for outputting temporary files"""

    path = serializers.SerializerMethodField()

    def get_path(self, obj):
        url = ""
        try:  # Can fail if project has no media
            relpath = os.path.relpath(obj.path, settings.MEDIA_ROOT)
            urlpath = os.path.join(settings.MEDIA_URL, relpath)
            url = self.context["view"].request.build_absolute_uri(urlpath)
        except Exception as e:
            logger.warning(f"Exception {e}")
            logger.warning(traceback.format_exc())
        return url

    class Meta:
        model = TemporaryFile
        fields = [
            "id",
            "name",
            "project",
            "user",
            "path",
            "lookup",
            "created_datetime",
            "eol_datetime",
        ]


class UserSerializerBasic(serializers.ModelSerializer):
    """Specify a basic serializer for outputting users."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "elemental_id",
            "profile",
        ]
