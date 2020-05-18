import os

from django.contrib.gis.db.models import Model
from django.contrib.gis.db.models import ForeignKey
from django.contrib.gis.db.models import ManyToManyField
from django.contrib.gis.db.models import OneToOneField
from django.contrib.gis.db.models import CharField
from django.contrib.gis.db.models import TextField
from django.contrib.gis.db.models import URLField
from django.contrib.gis.db.models import SlugField
from django.contrib.gis.db.models import BooleanField
from django.contrib.gis.db.models import IntegerField
from django.contrib.gis.db.models import BigIntegerField
from django.contrib.gis.db.models import PositiveIntegerField
from django.contrib.gis.db.models import FloatField
from django.contrib.gis.db.models import DateTimeField
from django.contrib.gis.db.models import PointField
from django.contrib.gis.db.models import FileField
from django.contrib.gis.db.models import FilePathField
from django.contrib.gis.db.models import ImageField
from django.contrib.gis.db.models import PROTECT
from django.contrib.gis.db.models import CASCADE
from django.contrib.gis.db.models import SET_NULL
from django.contrib.gis.geos import Point
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.fields import JSONField
from django.core.validators import MinValueValidator
from django.core.validators import RegexValidator
from django.db.models import FloatField, Transform
from django.db.models.signals import post_save
from django.db.models.signals import pre_delete
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.conf import settings
from polymorphic.models import PolymorphicModel
from enumfields import Enum
from enumfields import EnumField
from django_ltree.fields import PathField

from .cache import TatorCache
from .search import TatorSearch

from collections import UserDict

import pytz
import datetime
import logging
import os
import shutil
import uuid

# Load the main.view logger
logger = logging.getLogger(__name__)

class Depth(Transform):
    lookup_name = "depth"
    function = "nlevel"

    @property
    def output_field(self):
        return IntegerField()

PathField.register_lookup(Depth)

FileFormat= [('mp4','mp4'), ('webm','webm'), ('mov', 'mov')]
ImageFileFormat= [('jpg','jpg'), ('png','png'), ('bmp', 'bmp'), ('raw', 'raw')]

## Describes different association models in the database
AssociationTypes = [('Media','Relates to one or more media items'),
                    ('Frame', 'Relates to a specific frame in a video'), #Relates to one or more frames in a video
                    ('Localization', 'Relates to localization(s)')] #Relates to one-to-many localizations

class MediaAccess(Enum):
    VIEWABLE = 'viewable'
    DOWNLOADABLE = 'downloadable'
    ARCHIVAL = 'archival'
    REMOVE = 'remove'

class Marker(Enum):
    NONE = 'none'
    CROSSHAIR = 'crosshair'
    SQUARE = 'square'
    CIRCLE = 'circle'

class InterpolationMethods(Enum):
    NONE = 'none'
    LATEST = 'latest'
    NEAREST = 'nearest'
    LINEAR = 'linear'
    SPLINE = 'spline'

class JobResult(Enum):
    FINISHED = 'finished'
    FAILED = 'failed'

class JobStatus(Enum): # Keeping for migration compatiblity
    pass

class JobChannel(Enum): # Keeping for migration compatiblity
    pass

class Permission(Enum):
    VIEW_ONLY = 'r'
    CAN_EDIT = 'w'
    CAN_TRANSFER = 't'
    CAN_EXECUTE = 'x'
    FULL_CONTROL = 'a'

class HistogramPlotType(Enum):
    PIE = 'pie'
    BAR = 'bar'

class TwoDPlotType(Enum):
    LINE = 'line'
    SCATTER = 'scatter'

class Organization(Model):
    name = CharField(max_length=128)
    def __str__(self):
        return self.name

class User(AbstractUser):
    middle_initial = CharField(max_length=1)
    initials = CharField(max_length=3)
    organization = ForeignKey(Organization, on_delete=SET_NULL, null=True, blank=True)
    last_login = DateTimeField(null=True, blank=True)
    last_failed_login = DateTimeField(null=True, blank=True)
    failed_login_count = IntegerField(default=0)

    def __str__(self):
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}"
        else:
            return "---"

def delete_polymorphic_qs(qs):
    """Deletes a polymorphic queryset.
    """
    types = set(map(lambda x: type(x), qs))
    ids = list(map(lambda x: x.id, list(qs)))
    for entity_type in types:
        qs = entity_type.objects.filter(pk__in=ids)
        qs.delete()

class Project(Model):
    name = CharField(max_length=128)
    creator = ForeignKey(User, on_delete=PROTECT, related_name='creator')
    created = DateTimeField(auto_now_add=True)
    size = BigIntegerField(default=0)
    """Size of all media in project in bytes.
    """
    num_files = IntegerField(default=0)
    summary = CharField(max_length=1024)
    filter_autocomplete = JSONField(null=True, blank=True)
    section_order = ArrayField(CharField(max_length=128), default=list)
    def has_user(self, user_id):
        return self.membership_set.filter(user_id=user_id).exists()
    def user_permission(self, user_id):
        permission = None
        qs = self.membership_set.filter(user_id=user_id)
        if qs.exists():
            permission = qs[0].permission
        return permission
    def __str__(self):
        return self.name

    def delete(self, *args, **kwargs):
        # Delete attribute types
        qs = AttributeTypeBase.objects.filter(project=self)
        delete_polymorphic_qs(qs)
        # Delete entities
        qs = EntityBase.objects.filter(project=self)
        delete_polymorphic_qs(qs)
        # Delete entity types
        qs = EntityTypeBase.objects.filter(project=self)
        delete_polymorphic_qs(qs)
        super().delete(*args, **kwargs)

class Version(Model):
    name = CharField(max_length=128)
    description = CharField(max_length=1024, blank=True)
    number = PositiveIntegerField()
    project = ForeignKey(Project, on_delete=CASCADE)
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='version_created_by')
    show_empty = BooleanField(default=False)
    """ Tells the UI to show this version even if the current media does not
        have any annotations.
    """

    def __str__(self):
        out = f"{self.name}"
        if self.description:
            out += f" | {self.description}"
        return out

def make_default_version(instance):
    return Version.objects.create(
        name="Baseline",
        description="Initial version",
        project=instance,
        number=0,
    )

@receiver(post_save, sender=Project)
def project_save(sender, instance, created, **kwargs):
    TatorCache().invalidate_project_cache(instance.pk)
    TatorSearch().create_index(instance.pk)
    if created:
        make_default_version(instance)

@receiver(pre_delete, sender=Project)
def delete_index_project(sender, instance, **kwargs):
    TatorSearch().delete_index(instance.pk)

class Membership(Model):
    """Stores a user and their access level for a project.
    """
    project = ForeignKey(Project, on_delete=CASCADE)
    user = ForeignKey(User, on_delete=CASCADE)
    permission = EnumField(Permission, max_length=1, default=Permission.CAN_EDIT)
    def __str__(self):
        return f'{self.user} | {self.permission} | {self.project}'

class EntityTypeBase(PolymorphicModel):
    """ .. deprecated :: Use MediaType, LocalizationType, or StateType object """
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True)
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible=BooleanField(default=True)
    def __str__(self):
        return f'{self.name} | {self.project}'

class EntityTypeMediaBase(EntityTypeBase):
    """ .. deprecated :: Use MediaType object """
    uploadable = BooleanField(default=True)
    editTriggers = JSONField(null=True,
                             blank=True)

class EntityTypeMediaImage(EntityTypeMediaBase):
    """ .. deprecated :: Use MediaType object """
    entity_name = 'Image'
    dtype = 'image'
    file_format = CharField(max_length=4,
                            null=True,
                            blank=True,
                            choices=ImageFileFormat,
                            default=None)

class EntityTypeMediaVideo(EntityTypeMediaBase):
    """ .. deprecated :: Use MediaType object """
    entity_name = 'Video'
    dtype = 'video'
    file_format = CharField(max_length=4,
                            null=True,
                            blank=True,
                            choices=FileFormat,
                            default=None)
    keep_original = BooleanField(default=True)

class EntityTypeLocalizationBase(EntityTypeBase):
    """ .. deprecated :: Use LocalizationType object """
    media = ManyToManyField(EntityTypeMediaBase)
    bounded = BooleanField(default=True)
    colorMap = JSONField(null=True, blank=True)

class EntityTypeLocalizationDot(EntityTypeLocalizationBase):
    """ .. deprecated :: Use LocalizationType object """
    entity_name = 'Dot'
    dtype = 'dot'
    marker = EnumField(Marker, max_length=9, default=Marker.CIRCLE)
    marker_size = PositiveIntegerField(default=12)

class EntityTypeLocalizationLine(EntityTypeLocalizationBase):
    """ .. deprecated :: Use LocalizationType object """
    entity_name = 'Line'
    dtype = 'line'
    line_width = PositiveIntegerField(default=3)

class EntityTypeLocalizationBox(EntityTypeLocalizationBase):
    """ .. deprecated :: Use LocalizationType object """
    entity_name = 'Box'
    dtype = 'box'
    line_width = PositiveIntegerField(default=3)

class EntityTypeState(EntityTypeBase):
    """ .. deprecated :: Use StateType object """
    entity_name = 'State'
    dtype = 'state'
    media = ManyToManyField(EntityTypeMediaBase)
    markers = BooleanField(default=False)
    interpolation = EnumField(
        InterpolationMethods,
        default=InterpolationMethods.NONE
    )
    association = CharField(max_length=64,
                            choices=AssociationTypes,
                            default=AssociationTypes[0][0])

class EntityTypeTreeLeaf(EntityTypeBase):
    """ .. deprecated :: Use LeafType object """
    entity_name = 'TreeLeaf'
    dtype = 'treeleaf'

class EntityBase(PolymorphicModel):
    """ .. deprecated :: Use Media, Localization, State, or Leaf object """
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True)
    meta = ForeignKey(EntityTypeBase, on_delete=CASCADE)
    """ Meta points to the defintion of the attribute field. That is
        a handful of AttributeTypes are associated to a given EntityType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True)
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='created_by')
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='modified_by')

class EntityMediaBase(EntityBase):
    """ .. deprecated :: Use Media object """
    name = CharField(max_length=256)
    uploader = ForeignKey(User, on_delete=PROTECT)
    upload_datetime = DateTimeField()
    md5 = SlugField(max_length=32)
    """ md5 hash of the originally uploaded file. """
    file = FileField()
    last_edit_start = DateTimeField(null=True, blank=True)
    """ Start datetime of a session in which the media's annotations were edited.
    """
    last_edit_end = DateTimeField(null=True, blank=True)
    """ End datetime of a session in which the media's annotations were edited.
    """

class EntityMediaImage(EntityMediaBase):
    """ .. deprecated :: Use Media object """
    thumbnail = ImageField()
    width=IntegerField(null=True)
    height=IntegerField(null=True)

def getVideoDefinition(path, codec, resolution, **kwargs):
    """ Convenience function to generate video definiton dictionary """
    obj = {"path": path,
           "codec": codec,
           "resolution": resolution}
    for arg in kwargs:
        if arg in ["segment_info",
                   "host",
                   "http_auth",
                   "codec_meme",
                   "codec_description"]:
            obj[arg] = kwargs[arg]
        else:
            raise TypeError(f"Invalid argument '{arg}' supplied")
    return obj

class EntityMediaVideo(EntityMediaBase):
    """ .. deprecated :: Use Media object """
    original = FilePathField(path=settings.RAW_ROOT, null=True, blank=True)
    thumbnail = ImageField()
    thumbnail_gif = ImageField()
    num_frames = IntegerField(null=True)
    fps = FloatField(null=True)
    codec = CharField(null=True,max_length=256)
    width=IntegerField(null=True)
    height=IntegerField(null=True)
    segment_info = FilePathField(path=settings.MEDIA_ROOT, null=True,
                                 blank=True)
    media_files = JSONField(null=True, blank=True)

class EntityLocalizationBase(EntityBase):
    """ .. deprecated :: Use Localization object """
    user = ForeignKey(User, on_delete=PROTECT)
    media = ForeignKey(EntityMediaBase, on_delete=CASCADE)
    frame = PositiveIntegerField(null=True)
    thumbnail_image = ForeignKey(EntityMediaImage, on_delete=SET_NULL,
                                 null=True,blank=True,
                                 related_name='thumbnail_image')
    version = ForeignKey(Version, on_delete=CASCADE, null=True, blank=True)
    modified = BooleanField(null=True, blank=True)
    """ Indicates whether an annotation is original or modified.
        null: Original upload, no modifications.
        false: Original upload, but was modified or deleted.
        true: Modified since upload or created via web interface.
    """

    def selectOnMedia(media_id):
        return EntityLocalizationBase.objects.filter(media=media_id)

class EntityLocalizationDot(EntityLocalizationBase):
    """ .. deprecated :: Use Localization object """
    x = FloatField()
    y = FloatField()

class EntityLocalizationLine(EntityLocalizationBase):
    """ .. deprecated :: Use Localization object """
    x0 = FloatField()
    y0 = FloatField()
    x1 = FloatField()
    y1 = FloatField()

class EntityLocalizationBox(EntityLocalizationBase):
    """ .. deprecated :: Use Localization object """
    x = FloatField()
    y = FloatField()
    width = FloatField()
    height = FloatField()

class AssociationType(PolymorphicModel):
    """ .. deprecated :: Use Association object """
    media = ManyToManyField(EntityMediaBase)
    def states(media_ids):
        # Get localization associations
        localizationsForMedia=EntityLocalizationBase.objects.filter(media__in=media_ids)
        localizationAssociations=LocalizationAssociation.objects.filter(localizations__in=localizationsForMedia).distinct()
        # Downcast to base class
        ids = [loc.id for loc in localizationAssociations]
        localizationAssociations=AssociationType.objects.filter(pk__in=ids)
        # Get other associations (frame, media)
        associations=AssociationType.objects.filter(media__in=media_ids)
        associations = list(associations.union(localizationAssociations))
        # Get states with these associations
        states = EntityState.objects.filter(association__in=associations)
        return states


class MediaAssociation(AssociationType):
    """ .. deprecated :: Use Association object """
    def states(media_id):
        mediaAssociations=MediaAssociation.objects.filter(media__in=media_id)
        return EntityState.objects.filter(association__in=mediaAssociations)

class LocalizationAssociation(AssociationType):
    """ .. deprecated :: Use Association object """
    """
    color : "#RRGGBB" or "RRGGBB" to represent track color. If not set, display
            will use automatic color progression.
    """
    localizations = ManyToManyField(EntityLocalizationBase)
    segments = JSONField(null=True)
    color = CharField(null=True,blank=True,max_length=8)

    def states(media_id):
        localizationsForMedia=EntityLocalizationBase.objects.filter(media__in=media_id)
        localizationAssociations=LocalizationAssociation.objects.filter(localizations__in=localizationsForMedia).distinct()
        return EntityState.objects.filter(association__in=localizationAssociations)

class FrameAssociation(AssociationType):
    """ .. deprecated :: Use Association object """
    frame = PositiveIntegerField()
    extracted = ForeignKey(EntityMediaImage,
                           on_delete=SET_NULL,
                           null=True,
                           blank=True)

    def states(media_id):
        frameAssociations=FrameAssociation.objects.filter(media__in=media_id)
        return EntityState.objects.filter(association__in=frameAssociations)

class EntityState(EntityBase):
    """ .. deprecated :: Use State object """
    association = ForeignKey(AssociationType, on_delete=CASCADE)
    version = ForeignKey(Version, on_delete=CASCADE, null=True, blank=True)
    modified = BooleanField(null=True, blank=True)
    """ Indicates whether an annotation is original or modified.
        null: Original upload, no modifications.
        false: Original upload, but was modified or deleted.
        true: Modified since upload or created via web interface.
    """

    def selectOnMedia(media_id):
        return AssociationType.states(media_id)

# Tree data type
class TreeLeaf(EntityBase):
    """ .. deprecated :: Use Leaf object """
    parent=ForeignKey('self', on_delete=SET_NULL, blank=True, null=True)
    path=PathField(unique=True)
    name = CharField(max_length=255)

    class Meta:
        verbose_name_plural = "TreeLeaves"

    def __str__(self):
        return str(self.path)

    def depth(self):
        return TreeLeaf.objects.annotate(depth=Depth('path')).get(pk=self.pk).depth

    def subcategories(self, minLevel=1):
        return TreeLeaf.objects.select_related('parent').filter(
            path__descendants=self.path,
            path__depth__gte=self.depth()+minLevel
        )

    def computePath(self):
        """ Returns the string representing the path element """
        pathStr=self.name.replace(" ","_").replace("-","_").replace("(","_").replace(")","_")
        if self.parent:
            pathStr=self.parent.computePath()+"."+pathStr
        elif self.project:
            projName=self.project.name.replace(" ","_").replace("-","_").replace("(","_").replace(")","_")
            pathStr=projName+"."+pathStr
        return pathStr

# Attribute types
# These table structures are used to describe the structure of
# an Entity's JSON-B attribute field

class AttributeTypeBase(PolymorphicModel):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    name = CharField(max_length=64)
    """ Name refers to the key in the JSON structure """
    description = CharField(max_length=256, blank=True)
    """ Human readable description of the column """
    applies_to = ForeignKey(EntityTypeBase, on_delete=CASCADE)
    """ Pointer to the owner of this type description. Either a media,
        state or sequence 'owns' this type and combines it into a set
        with other AttributeTypes to describe an AttributeSet """
    project = ForeignKey(Project, on_delete=CASCADE)
    order = IntegerField(default=0)
    """ Controls order (lower numbers first, negative is hide) """
    def __str__(self):
        return self.name

class AttributeTypeBool(AttributeTypeBase):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    attr_name = "Boolean"
    dtype = "bool"
    default = BooleanField(null=True, blank=True)

class AttributeTypeInt(AttributeTypeBase):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    attr_name = "Integer"
    dtype = "int"
    default = IntegerField(null=True, blank=True)
    lower_bound = IntegerField(null=True, blank=True)
    upper_bound = IntegerField(null=True, blank=True)

class AttributeTypeFloat(AttributeTypeBase):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    attr_name = "Float"
    dtype = "float"
    default = FloatField(null=True, blank=True)
    lower_bound = FloatField(null=True, blank=True)
    upper_bound = FloatField(null=True, blank=True)

class AttributeTypeEnum(AttributeTypeBase):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    attr_name = "Enum"
    dtype = "enum"
    choices = ArrayField(CharField(max_length=64))
    labels = ArrayField(CharField(max_length=64), null=True, blank=True)
    default = CharField(max_length=64, null=True, blank=True)

class AttributeTypeString(AttributeTypeBase):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    attr_name = "String"
    dtype = "str"
    default = CharField(max_length=256, null=True, blank=True)
    autocomplete = JSONField(null=True, blank=True)

class AttributeTypeDatetime(AttributeTypeBase):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    attr_name = "Datetime"
    dtype = "datetime"
    use_current = BooleanField()
    default_timezone = CharField(max_length=3, null=True, blank=True)

class AttributeTypeGeoposition(AttributeTypeBase):
    """ .. deprecated :: Use MediaType, LocalizationType, StateType, or LeafType object """
    attr_name = "Geoposition"
    dtype = "geopos"
    default = PointField(null=True, blank=True)

def ProjectBasedFileLocation(instance, filename):
    return os.path.join(f"{instance.project.id}", filename)

class JobCluster(Model):
    name = CharField(max_length=128)
    owner = ForeignKey(User, null=True, blank=True, on_delete=SET_NULL)
    host = CharField(max_length=1024)
    port = PositiveIntegerField()
    token = CharField(max_length=1024)
    cert = TextField(max_length=2048)

    def __str__(self):
        return self.name

# Algorithm models

class Algorithm(Model):
    name = CharField(max_length=128)
    project = ForeignKey(Project, on_delete=CASCADE)
    user = ForeignKey(User, on_delete=PROTECT)
    description = CharField(max_length=1024, null=True, blank=True)
    manifest = FileField(upload_to=ProjectBasedFileLocation, null=True, blank=True)
    cluster = ForeignKey(JobCluster, null=True, blank=True, on_delete=SET_NULL)
    files_per_job = PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1),]
    )
    max_concurrent = PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1),]
    )

    def __str__(self):
        return self.name

class AnalysisBase(PolymorphicModel):
    """ .. deprecated :: Use Analysis object """
    project = ForeignKey(Project, on_delete=CASCADE)
    name = CharField(max_length=64)

class AnalysisCount(AnalysisBase):
    """ .. deprecated :: Use Analysis object """
    data_type = ForeignKey(EntityTypeBase, on_delete=CASCADE)
    data_query = CharField(max_length=1024, default='*')

class AnalysisPercentage(AnalysisBase):
    """ .. deprecated :: Use Analysis object """
    data_type = ForeignKey(EntityTypeBase, on_delete=CASCADE)
    numerator_filter = JSONField(null=True, blank=True)
    denominator_filter = JSONField(null=True, blank=True)

class AnalysisHistogram(AnalysisBase):
    """ .. deprecated :: Use Analysis object """
    data_type = ForeignKey(EntityTypeBase, on_delete=CASCADE)
    data_filter = JSONField(null=True, blank=True)
    attribute = ForeignKey(AttributeTypeBase, on_delete=CASCADE)
    plot_type = EnumField(HistogramPlotType)

class Analysis2D(AnalysisBase):
    """ .. deprecated :: Use Analysis object """
    data_type = ForeignKey(EntityTypeBase, on_delete=CASCADE)
    data_filter = JSONField(null=True, blank=True)
    attribute_x = ForeignKey(AttributeTypeBase, on_delete=CASCADE, related_name='attribute_x')
    attribute_y = ForeignKey(AttributeTypeBase, on_delete=CASCADE, related_name='attribute_y')
    plot_type = EnumField(TwoDPlotType)

class TemporaryFile(Model):
    """ Represents a temporary file in the system, can be used for algorithm results or temporary outputs """
    name = CharField(max_length=128)
    """ Human readable name for display purposes """
    project = ForeignKey(Project, on_delete=CASCADE)
    """ Project the temporary file resides in """
    user = ForeignKey(User, on_delete=PROTECT)
    """ User who created the temporary file """
    path = FilePathField(path=settings.MEDIA_ROOT, null=True, blank=True)
    """ Path to file on storage """
    lookup = SlugField(max_length=32)
    """ unique lookup (md5sum of something useful) """
    created_datetime = DateTimeField()
    """ Time that the file was created """
    eol_datetime = DateTimeField()
    """ Time the file expires (reaches EoL) """

    def expire(self):
        """ Set a given temporary file as expired """
        past = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        past = pytz.timezone("UTC").localize(past)
        self.eol_datetime = past
        self.save()

    def from_local(path, name, project, user, lookup, hours):
        """ Given a local file create a temporary file storage object
        :returns A saved TemporaryFile:
        """
        extension = os.path.splitext(name)[-1]
        destination_fp=os.path.join(settings.MEDIA_ROOT, f"{project.id}", f"{uuid.uuid1()}{extension}")
        os.makedirs(os.path.dirname(destination_fp), exist_ok=True)
        shutil.copyfile(path, destination_fp)

        now = datetime.datetime.utcnow()
        eol =  now + datetime.timedelta(hours=hours)

        temp_file = TemporaryFile(name=name,
                                  project=project,
                                  user=user,
                                  path=destination_fp,
                                  lookup=lookup,
                                  created_datetime=now,
                                  eol_datetime = eol)
        temp_file.save()
        return temp_file

@receiver(pre_delete, sender=TemporaryFile)
def temporary_file_delete(sender, instance, **kwargs):
    if os.path.exists(instance.path):
        os.remove(instance.path)

# Entity types

class MediaType(Model):
    polymorphic = OneToOneField(EntityTypeBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='media_type_polymorphic')
    """ Temporary field for migration. """
    dtype = CharField(max_length=16, choices=[('image', 'image'), ('video', 'video')])
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    editTriggers = JSONField(null=True,
                             blank=True)
    file_format = CharField(max_length=4,
                            null=True,
                            blank=True,
                            default=None)
    keep_original = BooleanField(default=True, null=True, blank=True)
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: (optional) Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos.
        default: (optional) Default value. Valid for all dtypes except datetime.
                 The type should correspond to the dtype (string/enum are strings, 
                 int/float are numbers, geopos is a [lon, lat] list).
        minimum: (optional) Minimum value. Valid for int and float dtypes.
        maximum: (optional) Maximum value. Valid for int and float dtypes.
        choices: (optional) Available choices for enum dtype.
        labels: (optional) Labels for available choices for enum dtype.
        autocomplete: (optional) Object of the form {'serviceUrl': '<url>'} that
                      specifies URL of the autocomplete service. Valid for string
                      dtype only.
        use_current: (optional) Boolean indicating whether to use the current time
                     as the default for datetime dtype.
    """
    def __str__(self):
        return f'{self.name} | {self.project}'

@receiver(post_save, sender=MediaType)
def media_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)

class LocalizationType(Model):
    polymorphic = OneToOneField(EntityTypeBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='localization_type_polymorphic')
    """ Temporary field for migration. """
    dtype = CharField(max_length=16,
                      choices=[('box', 'box'), ('line', 'line'), ('dot', 'dot')])
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    media = ManyToManyField(MediaType)
    colorMap = JSONField(null=True, blank=True)
    line_width = PositiveIntegerField(default=3)
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos.
        default: (optional) Default value. Valid for all dtypes except datetime.
                 The type should correspond to the dtype (string/enum are strings, 
                 int/float are numbers, geopos is a [lon, lat] list).
        minimum: (optional) Minimum value. Valid for int and float dtypes.
        maximum: (optional) Maximum value. Valid for int and float dtypes.
        choices: (optional) Available choices for enum dtype.
        labels: (optional) Labels for available choices for enum dtype.
        autocomplete: (optional) Object of the form {'serviceUrl': '<url>'} that
                      specifies URL of the autocomplete service. Valid for string
                      dtype only.
        use_current: (optional) Boolean indicating whether to use the current time
                     as the default for datetime dtype.
    """
    def __str__(self):
        return f'{self.name} | {self.project}'

@receiver(post_save, sender=LocalizationType)
def localization_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)

class StateType(Model):
    polymorphic = OneToOneField(EntityTypeBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='state_type_polymorphic')
    """ Temporary field for migration. """
    dtype = CharField(max_length=16, choices=[('state', 'state')], default='state')
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    media = ManyToManyField(MediaType)
    interpolation = CharField(max_length=16,
                              choices=[('none', 'none'), ('latest', 'latest')],
                              default='latest')
    association = CharField(max_length=64,
                            choices=AssociationTypes,
                            default=AssociationTypes[0][0])
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos.
        default: (optional) Default value. Valid for all dtypes except datetime.
                 The type should correspond to the dtype (string/enum are strings, 
                 int/float are numbers, geopos is a [lon, lat] list).
        minimum: (optional) Minimum value. Valid for int and float dtypes.
        maximum: (optional) Maximum value. Valid for int and float dtypes.
        choices: (optional) Available choices for enum dtype.
        labels: (optional) Labels for available choices for enum dtype.
        autocomplete: (optional) Object of the form {'serviceUrl': '<url>'} that
                      specifies URL of the autocomplete service. Valid for string
                      dtype only.
        use_current: (optional) Boolean indicating whether to use the current time
                     as the default for datetime dtype.
    """
    def __str__(self):
        return f'{self.name} | {self.project}'

@receiver(post_save, sender=StateType)
def state_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)

class LeafType(Model):
    polymorphic = OneToOneField(EntityTypeBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='leaf_type_polymorphic')
    """ Temporary field for migration. """
    dtype = CharField(max_length=16, choices=[('leaf', 'leaf')], default='leaf')
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    attribute_types = JSONField(null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos.
        default: (optional) Default value. Valid for all dtypes except datetime.
                 The type should correspond to the dtype (string/enum are strings, 
                 int/float are numbers, geopos is a [lon, lat] list).
        minimum: (optional) Minimum value. Valid for int and float dtypes.
        maximum: (optional) Maximum value. Valid for int and float dtypes.
        choices: (optional) Available choices for enum dtype.
        labels: (optional) Labels for available choices for enum dtype.
        autocomplete: (optional) Object of the form {'serviceUrl': '<url>'} that
                      specifies URL of the autocomplete service. Valid for string
                      dtype only.
        use_current: (optional) Boolean indicating whether to use the current time
                     as the default for datetime dtype.
    """
    def __str__(self):
        return f'{self.name} | {self.project}'

@receiver(post_save, sender=LeafType)
def leaf_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)


# Entities (stores actual data)

class Media(Model):
    """
    Fields:

    original: Originally uploaded file. Users cannot interact with it except
              by downloading it.

              .. deprecated :: Use media_files object

    segment_info: File for segment files to support MSE playback.

                  .. deprecated :: Use meda_files instead

    media_files: Dictionary to contain a map of all files for this media.
                 The schema looks like this:

                 .. code-block ::

                     map = {"archival": [ VIDEO_DEF, VIDEO_DEF,... ],
                            "streaming": [ VIDEO_DEF, VIDEO_DEF, ... ]}
                     video_def = {"path": <path_to_disk>,
                                  "codec": <human readable codec>,
                                  "resolution": [<vertical pixel count, e.g. 720>, width]


                                  ###################
                                  # Optional Fields #
                                  ###################

                                  # Path to the segments.json file for streaming files.
                                  # not expected/required for archival. Required for
                                  # MSE playback with seek support for streaming files.
                                  segment_info = <path_to_json>

                                  # If supplied will use this instead of currently
                                  # connected host. e.g. https://example.com
                                  "host": <host url>
                                  # If specified will be used for HTTP authorization
                                  # in the request for media. I.e. "bearer <token>"
                                  "http_auth": <http auth header>

                                  # Example mime: 'video/mp4; codecs="avc1.64001e"'
                                  # Only relevant for straming files, will assume
                                  # example above if not present.
                                  "codec_mime": <mime for MSE decode>

                                  "codec_description": <description other than codec>}


    """
    polymorphic = OneToOneField(EntityBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='media_polymorphic')
    """ Temporary field for migration. """
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    meta = ForeignKey(MediaType, on_delete=CASCADE, db_column='meta')
    """ Meta points to the defintion of the attribute field. That is
        a handful of AttributeTypes are associated to a given MediaType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True)
    """ Values of user defined attributes. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                            related_name='media_created_by', db_column='created_by')
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                             related_name='media_modified_by', db_column='modified_by')
    name = CharField(max_length=256)
    md5 = SlugField(max_length=32)
    """ md5 hash of the originally uploaded file. """
    file = FileField()
    last_edit_start = DateTimeField(null=True, blank=True)
    """ Start datetime of a session in which the media's annotations were edited.
    """
    last_edit_end = DateTimeField(null=True, blank=True)
    """ End datetime of a session in which the media's annotations were edited.
    """
    original = FilePathField(path=settings.RAW_ROOT, null=True, blank=True)
    thumbnail = ImageField()
    thumbnail_gif = ImageField(null=True, blank=True)
    num_frames = IntegerField(null=True, blank=True)
    fps = FloatField(null=True, blank=True)
    codec = CharField(null=True, blank=True, max_length=256)
    width=IntegerField(null=True)
    height=IntegerField(null=True)
    segment_info = FilePathField(path=settings.MEDIA_ROOT, null=True,
                                 blank=True)
    media_files = JSONField(null=True, blank=True)

@receiver(post_save, sender=Media)
def media_save(sender, instance, created, **kwargs):
    TatorCache().invalidate_media_list_cache(instance.project.pk)
    TatorSearch().create_document(instance)

def safe_delete(path):
    try:
        logger.info(f"Deleting {path}")
        os.remove(path)
    except:
        logger.warning(f"Could not remove {path}")

@receiver(pre_delete, sender=Media)
def media_delete(sender, instance, **kwargs):
    TatorCache().invalidate_media_list_cache(instance.project.pk)
    TatorSearch().delete_document(instance)
    instance.file.delete(False)
    if instance.original != None:
        path = str(instance.original)
        safe_delete(path)

    # Delete all the files referenced in media_files
    if not instance.media_files is None:
        files = instance.media_files.get('streaming', [])
        for obj in files:
            path = "/data" + obj['path']
            safe_delete(path)
            path = "/data" + obj['segment_info']
            safe_delete(path)
        files = instance.media_files.get('archival', [])
        for obj in files:
            safe_delete(obj['path'])
    instance.thumbnail.delete(False)
    instance.thumbnail_gif.delete(False)

class Localization(Model):
    polymorphic = OneToOneField(EntityBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='localization_polymorphic')
    """ Temporary field for migration. """
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    meta = ForeignKey(LocalizationType, on_delete=CASCADE, db_column='meta')
    """ Meta points to the defintion of the attribute field. That is
        a handful of AttributeTypes are associated to a given LocalizationType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True)
    """ Values of user defined attributes. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                            related_name='localization_created_by', db_column='created_by')
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                             related_name='localization_modified_by', db_column='modified_by')
    user = ForeignKey(User, on_delete=PROTECT, db_column='user')
    media = ForeignKey(Media, on_delete=CASCADE, db_column='media')
    frame = PositiveIntegerField(null=True, blank=True)
    thumbnail_image = ForeignKey(Media, on_delete=SET_NULL,
                                 null=True, blank=True,
                                 related_name='localization_thumbnail_image',
                                 db_column='thumbnail_image')
    version = ForeignKey(Version, on_delete=CASCADE, null=True, blank=True, db_column='version')
    modified = BooleanField(null=True, blank=True)
    """ Indicates whether an annotation is original or modified.
        null: Original upload, no modifications.
        false: Original upload, but was modified or deleted.
        true: Modified since upload or created via web interface.
    """
    x = FloatField(null=True, blank=True)
    """ Horizontal position."""
    y = FloatField(null=True, blank=True)
    """ Vertical position."""
    u = FloatField(null=True, blank=True)
    """ Horizontal vector component for lines."""
    v = FloatField(null=True, blank=True)
    """ Vertical vector component for lines. """
    width = FloatField(null=True, blank=True)
    """ Width for boxes."""
    height = FloatField(null=True, blank=True)
    """ Height for boxes."""

@receiver(post_save, sender=Localization)
def localization_save(sender, instance, created, **kwargs):
    TatorCache().invalidate_localization_list_cache(instance.media.pk, instance.meta.pk)
    if getattr(instance,'_inhibit', False) == False:
        TatorSearch().create_document(instance)
    else:
        pass

@receiver(pre_delete, sender=Localization)
def localization_delete(sender, instance, **kwargs):
    TatorCache().invalidate_localization_list_cache(instance.media.pk, instance.meta.pk)
    TatorSearch().delete_document(instance)
    if instance.thumbnail_image:
        instance.thumbnail_image.delete()

class State(Model):
    """
    A State is an event that occurs, potentially independent, from that of
    a media element. It is associated with 0 (1 to be useful) or more media
    elements. If a frame is supplied it was collected at that time point.
    """
    polymorphic = OneToOneField(EntityBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='state_polymorphic')
    """ Temporary field for migration. """
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    meta = ForeignKey(StateType, on_delete=CASCADE, db_column='meta')
    """ Meta points to the defintion of the attribute field. That is
        a handful of AttributeTypes are associated to a given EntityType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True)
    """ Values of user defined attributes. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                            related_name='state_created_by', db_column='created_by')
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                             related_name='state_modified_by', db_column='modified_by')
    version = ForeignKey(Version, on_delete=CASCADE, null=True, blank=True, db_column='version')
    modified = BooleanField(null=True, blank=True)
    """ Indicates whether an annotation is original or modified.
        null: Original upload, no modifications.
        false: Original upload, but was modified or deleted.
        true: Modified since upload or created via web interface.
    """
    media = ManyToManyField(Media, related_name='media')
    localizations = ManyToManyField(Localization)
    segments = JSONField(null=True, blank=True)
    color = CharField(null=True, blank=True, max_length=8)
    frame = PositiveIntegerField(null=True, blank=True)
    extracted = ForeignKey(Media,
                           on_delete=SET_NULL,
                           null=True,
                           blank=True,
                           related_name='extracted',
                           db_column='extracted')
    def selectOnMedia(media_id):
        return State.objects.filter(media__in=media_id)

@receiver(post_save, sender=State)
def state_save(sender, instance, created, **kwargs):
    TatorSearch().create_document(instance)

@receiver(pre_delete, sender=State)
def state_delete(sender, instance, **kwargs):
    TatorSearch().delete_document(instance)

@receiver(m2m_changed, sender=State.localizations.through)
def calc_segments(sender, **kwargs):
    instance=kwargs['instance']
    sortedLocalizations=Localization.objects.filter(pk__in=instance.localizations.all()).order_by('frame')

    #Bring up related media to association
    instance.media.set(sortedLocalizations.all().values_list('media', flat=True))
    segmentList=[]
    current=[None,None]
    last=None
    for localization in sortedLocalizations:
        if current[0] is None:
            current[0] = localization.frame
            last = current[0]
        else:
            if localization.frame - 1 == last:
                last = localization.frame
            else:
                current[1] = last
                segmentList.append(current.copy())
                current[0] = localization.frame
                current[1] = None
                last = localization.frame
    if current[1] is None:
        current[1] = last
        segmentList.append(current)
    instance.segments = segmentList

class Leaf(Model):
    polymorphic = OneToOneField(EntityBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='leaf_polymorphic')
    """ Temporary field for migration. """
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column='project')
    meta = ForeignKey(LeafType, on_delete=CASCADE, db_column='meta')
    """ Meta points to the defintion of the attribute field. That is
        a handful of AttributeTypes are associated to a given EntityType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True)
    """ Values of user defined attributes. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                            related_name='leaf_created_by', db_column='created_by')
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True,
                             related_name='leaf_modified_by', db_column='modified_by')
    parent=ForeignKey('self', on_delete=SET_NULL, blank=True, null=True, db_column='parent')
    path=PathField(unique=True)
    name = CharField(max_length=255)

    class Meta:
        verbose_name_plural = "Leaves"

    def __str__(self):
        return str(self.path)

    def depth(self):
        return Leaf.objects.annotate(depth=Depth('path')).get(pk=self.pk).depth

    def subcategories(self, minLevel=1):
        return Leaf.objects.select_related('parent').filter(
            path__descendants=self.path,
            path__depth__gte=self.depth()+minLevel
        )

    def computePath(self):
        """ Returns the string representing the path element """
        pathStr=self.name.replace(" ","_").replace("-","_").replace("(","_").replace(")","_")
        if self.parent:
            pathStr=self.parent.computePath()+"."+pathStr
        elif self.project:
            projName=self.project.name.replace(" ","_").replace("-","_").replace("(","_").replace(")","_")
            pathStr=projName+"."+pathStr
        return pathStr

@receiver(post_save, sender=Leaf)
def leaf_save(sender, instance, **kwargs):
    for ancestor in instance.computePath().split('.'):
        TatorCache().invalidate_treeleaf_list_cache(ancestor)
    TatorSearch().create_document(instance)

@receiver(pre_delete, sender=Leaf)
def leaf_delete(sender, instance, **kwargs):
    for ancestor in instance.computePath().split('.'):
        TatorCache().invalidate_treeleaf_list_cache(ancestor)
    TatorSearch().delete_document(instance)

class Analysis(Model):
    polymorphic = OneToOneField(AnalysisBase, on_delete=SET_NULL, null=True, blank=True,
                                related_name='analysis_polymorphic')
    """ Temporary field for migration. """
    project = ForeignKey(Project, on_delete=CASCADE, db_column='project')
    name = CharField(max_length=64)
    data_query = CharField(max_length=1024, default='*')

def type_to_obj(typeObj):
    """Returns a data object for a given type object"""
    _dict = {
        MediaType: Media,
        LocalizationType: Localization,
        StateType: State,
        LeafType: Leaf,
    }

    if typeObj in _dict:
        return _dict[typeObj]
    else:
        return None

def make_dict(keys, row):
    d={}
    for idx,col in enumerate(keys):
        d[col.name] = row[idx]
    return d

def database_qs(qs):
    return database_query(str(qs.query))

def database_query(query):
    from django.db import connection
    import datetime
    with connection.cursor() as d_cursor:
        cursor = d_cursor.cursor
        bq=datetime.datetime.now()
        cursor.execute(query)
        aq=datetime.datetime.now()
        l=[make_dict(cursor.description, x) for x in cursor]
        af=datetime.datetime.now()
        print(f"Query = {aq-bq}")
        print(f"List = {af-aq}")
    return l
