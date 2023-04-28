from django.forms import ModelForm
from django.contrib import admin
from django.contrib.admin.models import LogEntry, DELETION
from django.contrib.auth.admin import UserAdmin
from django.contrib.gis.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.urls import reverse
from django.utils.html import escape
from django.utils.safestring import mark_safe
from rest_framework.authtoken.admin import TokenAdmin

from .models import Organization
from .models import Affiliation
from .models import Invitation
from .models import User
from .models import Project
from .models import Membership
from .models import Media
from .models import Localization
from .models import State
from .models import Leaf
from .models import MediaType
from .models import LocalizationType
from .models import StateType
from .models import LeafType
from .models import JobCluster
from .models import Algorithm
from .models import Version

admin.site.register(Organization)
admin.site.register(Affiliation)
admin.site.register(Invitation)
admin.site.register(User, UserAdmin)
admin.site.register(Project)
admin.site.register(Membership)
admin.site.register(Media)
admin.site.register(Localization)
admin.site.register(State)
admin.site.register(Leaf)
admin.site.register(MediaType)
admin.site.register(LocalizationType)
admin.site.register(StateType)
admin.site.register(LeafType)
admin.site.register(JobCluster)
admin.site.register(Algorithm)
admin.site.register(Version)

TokenAdmin.raw_id_fields = ("user",)


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    date_hierarchy = "action_time"
    list_filter = ["user", "content_type", "action_flag"]
    search_fields = ["object_repr", "change_message"]
    list_display = ["action_time", "user", "content_type", "object_link", "action_flag"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return request.user.is_staff

    def object_link(self, obj):
        if obj.action_flag == DELETION:
            link = escape(obj.object_repr)
        else:
            ct = obj.content_type
            link = '<a href="%s">%s</a>' % (
                reverse("admin:%s_%s_change" % (ct.app_label, ct.model), args=[obj.object_id]),
                escape(obj.object_repr),
            )
        return mark_safe(link)

    object_link.admin_order_field = "object_repr"
    object_link.short_description = "object"


@receiver(post_save, sender=LogEntry)
def log_entry_save(sender, instance, created, **kwargs):
    """
    Replaces the `object_repr` with `object.__repr__()`, since most `LogEntry` objects are created
    using `object.__str__()`
    """
    if created:
        model_class = instance.content_type.model_class()
        obj = model_class.objects.get(id=instance.object_id)
        args = ", ".join(f"{f.name}={getattr(obj, f.name)}" for f in model_class.get_fields() if f.name not in ["password"])

        instance.object_repr = f"{model_class.__name__}({args})"
        instance.save()
