import re

from rest_framework import serializers
from rest_polymorphic.serializers import PolymorphicSerializer

from django.db import models
from django.db.models.functions import Cast

from .models import *
import logging
import datetime

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
        media = EntityMediaBase.objects.filter(project=obj).order_by('id').first()
        if media:
            url = self.context['view'].request.build_absolute_uri(media.thumbnail.url)
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
            'usernames', 'filter_autocomplete', 'section_order', 'permission'
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

class EntityTypeStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeState
        fields = ['id', 'project', 'visible', 'name', 'description', 'association', 'interpolation']

    interpolation = EnumField(enum=InterpolationMethods)

class EntityTypeTreeLeafSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeTreeLeaf
        fields = ['id', 'project', 'name', 'description']

EntityTypeLocalization_BaseFields=['id', 'name', 'visible', 'description', 'colorMap']
EntityTypeLocalization_LWFields=['id', 'name']
class EntityTypeLocalizationDotSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeLocalizationDot
        fields = EntityTypeLocalization_BaseFields + ['dtype']

class EntityTypeLocalizationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeLocalizationLine
        fields = EntityTypeLocalization_BaseFields + ['dtype', 'line_width']

class EntityTypeLocalizationBoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeLocalizationBox
        fields = EntityTypeLocalization_BaseFields + ['dtype', 'line_width']

class EntityTypeLocalizationSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        EntityTypeLocalizationDot : EntityTypeLocalizationDotSerializer,
        EntityTypeLocalizationLine : EntityTypeLocalizationLineSerializer,
        EntityTypeLocalizationBox : EntityTypeLocalizationBoxSerializer,
        }

class EntityTypeLocalizationDotLWSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeLocalizationDot
        fields = EntityTypeLocalization_LWFields + ['dtype']

class EntityTypeLocalizationLineLWSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeLocalizationLine
        fields = EntityTypeLocalization_LWFields + ['dtype', 'line_width']

class EntityTypeLocalizationBoxLWSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeLocalizationBox
        fields = EntityTypeLocalization_LWFields + ['dtype', 'line_width']

class EntityTypeLocalizationLWSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        EntityTypeLocalizationDot : EntityTypeLocalizationDotLWSerializer,
        EntityTypeLocalizationLine : EntityTypeLocalizationLineLWSerializer,
        EntityTypeLocalizationBox : EntityTypeLocalizationBoxLWSerializer,
        }

# EntityTypeMedias are pretty similar, but keep the pattern going
# for flexibility down the line.
EntityTypeMedia_BaseFields=['id', 'name', 'description', 'editTriggers']
class EntityTypeMediaImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeMediaImage
        fields = EntityTypeMedia_BaseFields + ['file_format']

class EntityTypeMediaVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntityTypeMediaVideo
        fields = EntityTypeMedia_BaseFields + ['file_format']

class EntityTypeMediaSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        EntityTypeMediaImage : EntityTypeMediaImageSerializer,
        EntityTypeMediaVideo : EntityTypeMediaVideoSerializer,
        }

EntityLocalization_baseFields=[ 'id', 'meta', 'user', 'frame', 'media',
                                'attributes', 'thumbnail_image']
class EntityLocalizationBaseSerializer(serializers.Serializer):
    meta = EntityTypeLocalizationLWSerializer()

class EntityLocalizationDotSerializer(serializers.ModelSerializer,
                                      EntityLocalizationBaseSerializer):
    class Meta:
        model = EntityLocalizationDot
        fields = EntityLocalization_baseFields + ['x', 'y']

class EntityLocalizationLineSerializer(serializers.ModelSerializer,
                                       EntityLocalizationBaseSerializer):
    class Meta:
        model = EntityLocalizationLine
        fields = EntityLocalization_baseFields + ['x0', 'y0', 'x1', 'y1']

class EntityLocalizationBoxSerializer(serializers.ModelSerializer,
                                      EntityLocalizationBaseSerializer):
    class Meta:
        model = EntityLocalizationBox
        fields = EntityLocalization_baseFields + ['x', 'y', 'width', 'height']

class EntityLocalizationSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        EntityLocalizationDot : EntityLocalizationDotSerializer,
        EntityLocalizationLine : EntityLocalizationLineSerializer,
        EntityLocalizationBox : EntityLocalizationBoxSerializer,
        }

def FastEntityLocalizationSerializer(queryset):
    """ Serializes one type of localization quickly """

    fieldMap={
        EntityLocalizationDot: ['x', 'y'],
        EntityLocalizationLine: ['x0', 'y0', 'x1', 'y1'],
        EntityLocalizationBox: ['x', 'y', 'width', 'height']}

    data = []
    # Group by type to support universal serialization
    categories=queryset.values_list("meta", flat=True).distinct()
    ids=queryset.values_list("id", flat=True)
    for category in categories:
        obj=None
        typeObj=EntityTypeLocalizationBase.objects.get(pk=category)
        if type(typeObj) == EntityTypeLocalizationBox:
            obj=EntityLocalizationBox
        elif type(typeObj) == EntityTypeLocalizationLine:
            obj=EntityLocalizationLine
        elif type(typeObj) == EntityTypeLocalizationDot:
            obj=EntityLocalizationDot
        subquery=obj.objects.filter(meta=category)
        subquery=subquery.filter(id__in=ids).select_related('user').annotate(email=Cast('user__email', models.TextField()))
        temp_list=EntityLocalization_baseFields
        temp_list.append('email')
        if len(subquery) != 0:
            data.extend(subquery.values(*temp_list,
                                        *fieldMap[obj]))

    return data


EntityMedia_baseFields = [
    'id', 'project', 'meta', 'attributes', 'name', 'url',
    'last_edit_start', 'last_edit_end'
]
class EntityMediaBaseSerializer(serializers.Serializer):
    url = serializers.SerializerMethodField('get_file_url')
    attributes = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        return self.context['view'].request.build_absolute_uri(obj.file.url)

    def get_attributes(self, obj):
        attrs = {}
        if obj.attributes is not None:
            attrs = obj.attributes
        return attrs

class EntityMediaImageSerializer(serializers.ModelSerializer,
                                 EntityMediaBaseSerializer):
    thumb_url = serializers.SerializerMethodField()
    def get_thumb_url(self, obj):
        return self.context['view'].request.build_absolute_uri(obj.thumbnail.url)
    class Meta:
        model = EntityMediaImage
        fields = EntityMedia_baseFields + ['thumb_url', 'width', 'height']

class EntityMediaVideoSerializer(serializers.ModelSerializer,
                                 EntityMediaBaseSerializer):
    original_url = serializers.SerializerMethodField()
    thumb_gif_url = serializers.SerializerMethodField()
    thumb_url = serializers.SerializerMethodField()
    def get_thumb_url(self, obj):
        return self.context['view'].request.build_absolute_uri(obj.thumbnail.url)
    def get_original_url(self, obj):
        if obj.original != None:
            return self.context['view'].request.build_absolute_uri(obj.original)
        else:
            return None
    def get_thumb_gif_url(self, obj):
        return self.context['view'].request.build_absolute_uri(obj.thumbnail_gif.url)
    class Meta:
        model = EntityMediaVideo
        fields = EntityMedia_baseFields + [
            'original_url', 'thumb_url', 'thumb_gif_url',
            'num_frames', 'fps', 'width', 'height'
        ]


class EntityMediaSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        EntityMediaBase : EntityMediaBaseSerializer,
        EntityMediaImage : EntityMediaImageSerializer,
        EntityMediaVideo : EntityMediaVideoSerializer,
        }

AttributeTypeBase_BaseFields=['name', 'id', 'description', 'order']
class AttributeTypeBaseSerializer(serializers.Serializer):
    None

class AttributeTypeBoolSerializer(serializers.ModelSerializer,
                                  AttributeTypeBaseSerializer):
    class Meta:
        model = AttributeTypeBool
        fields = AttributeTypeBase_BaseFields + ['dtype', 'default']

class AttributeTypeIntSerializer(serializers.ModelSerializer,
                                 AttributeTypeBaseSerializer):
    class Meta:
        model = AttributeTypeInt
        fields = AttributeTypeBase_BaseFields + ['dtype', 'lower_bound', 'upper_bound', 'default']


class AttributeTypeFloatSerializer(serializers.ModelSerializer,
                                   AttributeTypeBaseSerializer):
    class Meta:
        model = AttributeTypeFloat
        fields = AttributeTypeBase_BaseFields + ['dtype', 'lower_bound', 'upper_bound', 'default']

class AttributeTypeEnumSerializer(serializers.ModelSerializer,
                                  AttributeTypeBaseSerializer):
    class Meta:
        model = AttributeTypeEnum
        fields = AttributeTypeBase_BaseFields + ['dtype', 'choices', 'default']

class AttributeTypeStringSerializer(serializers.ModelSerializer,
                                    AttributeTypeBaseSerializer):
    class Meta:
        model = AttributeTypeString
        fields = AttributeTypeBase_BaseFields + ['dtype', 'autocomplete', 'default']

class AttributeTypeDatetimeSerializer(serializers.ModelSerializer,
                                      AttributeTypeBaseSerializer):
    class Meta:
        model = AttributeTypeDatetime
        fields = AttributeTypeBase_BaseFields + ['dtype', 'default_timezone']

class AttributeTypeGeopositionSerializer(serializers.ModelSerializer,
                                         AttributeTypeBaseSerializer):
    class Meta:
        model = AttributeTypeDatetime
        fields = AttributeTypeBase_BaseFields + ['dtype']


class AttributeTypeSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        AttributeTypeBool : AttributeTypeBoolSerializer,
        AttributeTypeInt : AttributeTypeIntSerializer,
        AttributeTypeFloat : AttributeTypeFloatSerializer,
        AttributeTypeEnum : AttributeTypeEnumSerializer,
        AttributeTypeString : AttributeTypeStringSerializer,
        AttributeTypeDatetime : AttributeTypeDatetimeSerializer,
        AttributeTypeGeoposition : AttributeTypeGeopositionSerializer
        }

# No base fields here
class MediaAssociationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAssociation
        fields = ['id', 'media']

class LocalizationAssociationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalizationAssociation
        fields = ['id', 'media', 'color', 'localizations', 'segments']

class FrameAssociationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FrameAssociation
        fields = ['id', 'media', 'frame']

class AssociationSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        MediaAssociation : MediaAssociationSerializer,
        LocalizationAssociation : LocalizationAssociationSerializer,
        FrameAssociation : FrameAssociationSerializer,
        }

# Poor man's serializer to bypass polymorphic logjam
class EntityStateFrameSerializer():
    def __init__(self, data):
        self.serialized_data = []
        # TODO: If we make the client side response compatible with the
        # values object directly we can remove this iteration
        for datum in data.values():
            self.serialized_data.append(
                {"id": datum['id'],
                 "meta": datum['meta_id'],
                 "association" :
                 {"frame": datum['frame'],
                  "media": datum['association_media'],
                  "id": datum['association_id']},
                 "attributes": datum['attributes']
                })

    @property
    def data(self):
        return self.serialized_data

# Poor man's serializer to bypass polymorphic logjam
class EntityStateLocalizationSerializer():
    def __init__(self, data):
        self.serialized_data = []
        # TODO: If we make the client side response compatible with the
        # values object directly we can remove this iteration
        for datum in data.values():
            self.serialized_data.append(
                {"id": datum['id'],
                 "meta": datum['meta_id'],
                 "association" :
                 {"media": datum['association_media'],
                  "segments": datum['association_segments'],
                  "color": datum['association_color'],
                  "id": datum['association_id']},
                 "attributes": datum['attributes']
                })

    @property
    def data(self):
        return self.serialized_data

class EntityStateSerializer(serializers.ModelSerializer):
    """ Slower generic serializer """
    class Meta:
        model=EntityState
        fields=['id', 'meta', 'association', 'attributes']
    association=AssociationSerializer()

# Serializers for associating entity types to attribute data.
class EntityTypeStateAttrSerializer(serializers.Serializer):
    type=EntityTypeStateSerializer()
    columns=AttributeTypeSerializer(many=True)
    data=serializers.URLField()
    count=serializers.IntegerField()

class EntityTypeTreeLeafAttrSerializer(serializers.Serializer):
    type=EntityTypeTreeLeafSerializer()
    columns=AttributeTypeSerializer(many=True)
    count=serializers.IntegerField()

class EntityTypeLocalizationAttrSerializer(serializers.Serializer):
    type=EntityTypeLocalizationSerializer()
    columns=AttributeTypeSerializer(many=True)
    data=serializers.URLField()
    count=serializers.IntegerField()

class EntityTypeMediaAttrSerializer(serializers.Serializer):
    type=EntityTypeMediaSerializer()
    columns=AttributeTypeSerializer(many=True)
    data=serializers.URLField()

class TreeLeafSerializer(serializers.ModelSerializer):
    class Meta:
        model=TreeLeaf
        fields=['id', 'project', 'parent', 'name', 'attributes', 'path']

class PackageSerializer(serializers.ModelSerializer):

    url = serializers.SerializerMethodField('get_file_url')
    size = serializers.SerializerMethodField('get_file_size')
    user_str = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        return self.context['view'].request.build_absolute_uri(obj.file.url)

    def get_file_size(self, obj):
        return obj.file.size

    def get_user_str(self, obj):
        return str(obj.creator)

    class Meta:
        model = Package
        fields=['name', 'description', 'user_str', 'created', 'url', 'size', 'pk']

class AlgorithmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Algorithm
        fields = ['name', 'description', 'image_name', 'image_tag', 'pk']

class AlgorithmResultSerializer(serializers.ModelSerializer):
    alg_name = serializers.SerializerMethodField()
    user_str = serializers.SerializerMethodField()
    result_str = serializers.SerializerMethodField()
    setup_log_url = serializers.SerializerMethodField()
    algorithm_log_url = serializers.SerializerMethodField()
    teardown_log_url = serializers.SerializerMethodField()

    def get_alg_name(self, obj):
        return obj.algorithm.name

    def get_user_str(self, obj):
        return str(obj.user)

    def get_result_str(self, obj):
        return obj.result.value

    def get_setup_log_url(self, obj):
        try:
            return self.context['view'].request.build_absolute_uri(obj.setup_log.url)
        except ValueError:
            return ""

    def get_algorithm_log_url(self, obj):
        try:
            return self.context['view'].request.build_absolute_uri(obj.algorithm_log.url)
        except ValueError:
            return ""

    def get_teardown_log_url(self, obj):
        try:
            return self.context['view'].request.build_absolute_uri(obj.teardown_log.url)
        except ValueError:
            return ""

    class Meta:
        model = AlgorithmResult
        fields = [
            'alg_name',
            'result_str',
            'message',
            'started',
            'stopped',
            'user_str',
            'setup_log_url',
            'algorithm_log_url',
            'teardown_log_url',
            'pk'
        ]

Analysis_baseFields=[ 'project', 'name' ]
class AnalysisBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisBase
        fields = Analysis_baseFields

class AnalysisCountSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisCount
        fields = ['data_type', 'data_filter'] + Analysis_baseFields

class AnalysisPercentageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisCount
        fields = ['numerator_url', 'denominator_url'] + Analysis_baseFields

class AnalysisHistogramSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisCount
        fields = ['data_url', 'attribute', 'plot_type'] + Analysis_baseFields

class Analysis2DSerializer(serializers.ModelSerializer):
    class Meta:
        model = Analysis2D
        field = ['data_url', 'attribute_x', 'attribute_y', 'plot_type'] + Analysis_baseFields

class AnalysisSerializer(PolymorphicSerializer):
    model_serializer_mapping = {
        AnalysisBase : AnalysisBaseSerializer,
        AnalysisCount : AnalysisCountSerializer,
        AnalysisPercentage : AnalysisPercentageSerializer,
        AnalysisHistogram : AnalysisHistogramSerializer,
        Analysis2D : Analysis2DSerializer,
    }
