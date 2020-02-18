from django.forms import ModelForm
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.gis.db import models
from rest_framework.authtoken.admin import TokenAdmin

from .models import Organization
from .models import User
from .models import Project
from .models import Membership
from .models import EntityMediaImage
from .models import EntityMediaVideo
from .models import EntityLocalizationDot
from .models import EntityLocalizationLine
from .models import EntityLocalizationBox
from .models import EntityState
from .models import EntityTypeBase
from .models import EntityTypeMediaImage
from .models import EntityTypeMediaVideo
from .models import EntityTypeLocalizationDot
from .models import EntityTypeLocalizationLine
from .models import EntityTypeLocalizationBox
from .models import EntityTypeState
from .models import EntityTypeTreeLeaf
from .models import AttributeTypeBool
from .models import AttributeTypeInt
from .models import AttributeTypeFloat
from .models import AttributeTypeEnum
from .models import AttributeTypeString
from .models import AttributeTypeDatetime
from .models import AttributeTypeGeoposition
from .models import JobCluster
from .models import Algorithm
from .models import TreeLeaf
from .models import LocalizationAssociation
from .models import MediaAssociation
from .models import FrameAssociation
from .models import AnalysisCount
from .models import Version

admin.site.register(Organization)
admin.site.register(User, UserAdmin)
admin.site.register(Project)
admin.site.register(Membership)
admin.site.register(EntityMediaImage)
admin.site.register(EntityMediaVideo)
admin.site.register(EntityLocalizationDot)
admin.site.register(EntityLocalizationLine)
admin.site.register(EntityLocalizationBox)
admin.site.register(EntityState)
admin.site.register(EntityTypeMediaImage)
admin.site.register(EntityTypeMediaVideo)
admin.site.register(EntityTypeLocalizationDot)
admin.site.register(EntityTypeLocalizationLine)
admin.site.register(EntityTypeLocalizationBox)
admin.site.register(EntityTypeState)
admin.site.register(EntityTypeTreeLeaf)
admin.site.register(AttributeTypeBool)
admin.site.register(AttributeTypeInt)
admin.site.register(AttributeTypeFloat)
admin.site.register(AttributeTypeEnum)
admin.site.register(AttributeTypeString)
admin.site.register(AttributeTypeDatetime)
admin.site.register(AttributeTypeGeoposition)
admin.site.register(JobCluster)
admin.site.register(Algorithm)
admin.site.register(TreeLeaf)
admin.site.register(LocalizationAssociation)
admin.site.register(MediaAssociation)
admin.site.register(FrameAssociation)
admin.site.register(AnalysisCount)
admin.site.register(Version)

TokenAdmin.raw_id_fields = ('user',)
