import re

from rest_framework import serializers
from rest_polymorphic.serializers import PolymorphicSerializer

from django.conf import settings
from django.db import models
from django.db.models.functions import Cast

from .models import *
import logging
import datetime
import traceback

logger = logging.getLogger(__name__)

class EnumField(serializers.ChoiceField):
    def __init__(self, enum, **kwargs):
        self.enum = enum
        kwargs['choices'] = [(e.value, e.value) for e in enum]
        super().__init__(**kwargs)

    def to_representation(self, obj):
        return obj.value

    def to_internal_value(self, data):
        try:
            return self.enum[data]
        except:
            self.fail('invalid_choice', input=data)

class TemporaryFileSerializer(serializers.ModelSerializer):
    """ Basic serializer for outputting temporary files """
    path = serializers.SerializerMethodField()
    def get_path(self, obj):
        url = ""
        try: # Can fail if project has no media
            relpath = os.path.relpath(obj.path, settings.MEDIA_ROOT)
            urlpath = os.path.join(settings.MEDIA_URL, relpath)
            url = self.context['view'].request.build_absolute_uri(urlpath)
        except Exception as e:
            logger.warning(f"Exception {e}")
            logger.warning(traceback.format_exc())
        return url

    class Meta:
        model = TemporaryFile
        fields = ['id',
                  'name',
                  'project',
                  'user',
                  'path',
                  'lookup',
                  'created_datetime',
                  'eol_datetime']

class UserSerializerBasic(serializers.ModelSerializer):
    """ Specify a basic serializer for outputting users."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class ProjectSerializer(serializers.ModelSerializer):
    thumb = serializers.SerializerMethodField()
    usernames = serializers.SerializerMethodField()
    permission = serializers.SerializerMethodField()

    def get_thumb(self, obj):
        url = ""
        try: # Can fail if project has no media
            media = Media.objects.filter(project=obj)[0]
            url = self.context['view'].request.build_absolute_uri(media.thumbnail.url)
        except:
            pass
        return url

    def get_usernames(self, obj):
        users = User.objects.filter(pk__in=Membership.objects.filter(project=obj).values_list('user')).order_by('last_name')
        usernames = [str(user) for user in users]
        creator = str(obj.creator)
        if creator in usernames:
            usernames.remove(creator)
            usernames.insert(0, creator)
        return usernames

    def get_permission(self, obj):
        user_id = self.context['request'].user.pk
        if user_id == obj.creator.pk:
            permission = "Creator"
        else:
            permission = str(obj.user_permission(user_id))
        return permission

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'summary', 'thumb', 'num_files', 'size',
            'usernames', 'filter_autocomplete', 'permission'
        ]

class MembershipSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    permission = serializers.SerializerMethodField('get_permission_str')

    def get_username(self, obj):
        return obj.user.username

    def get_permission_str(self, obj):
        if obj.permission == Permission.VIEW_ONLY:
            out = 'view_only'
        elif obj.permission == Permission.CAN_EDIT:
            out = 'can_edit'
        elif obj.permission == Permission.CAN_EXECUTE:
            out = 'can_execute'
        elif obj.permission == Permission.FULL_CONTROL:
            out = 'full_control'
        else:
            raise RuntimeError("Invalid permission setting!")
        return out

    class Meta:
        model = Membership
        fields = ['id', 'username', 'permission']

class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Version
        fields = ['id', 'name', 'description', 'number', 'project', 'show_empty', 'bases']
