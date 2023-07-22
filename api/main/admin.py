import logging

from django.forms import ModelForm
from django.contrib import admin
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.auth.admin import UserAdmin
from django.contrib.gis.db import models
from django.db.models import Model
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


logger = logging.getLogger(__name__)


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


def _repr(obj, recurse=0, prettyprint=False, starting_depth=0):
    if isinstance(obj, Model):
        starting_depth += 1
        tab = "  " * starting_depth * bool(prettyprint)
        args_newline = "\n" if prettyprint else " "
        class_newline = "\n" if prettyprint else ""

        # Keep `recurse` non-negative
        recurse = max(recurse, 0)
        fn = _repr if recurse else lambda *args: str(args[0])
        recurse -= 1
        model_class = obj._meta.model
        args = []
        for f in model_class._meta.get_fields():
            if (
                f.name not in ["password", "auth_token", "confirmation_token"]
                and hasattr(obj, f.name)
                and getattr(obj, f.name)
                and not (f.is_relation and (f.many_to_many or f.one_to_many))
            ):
                raw_value = getattr(obj, f.name)
                try:
                    value = fn(raw_value, recurse, prettyprint, starting_depth)
                except RecursionError:
                    value = str(raw_value)
                if f.name == "action_flag" and value.isnumeric():
                    value = int(value)
                    if value == ADDITION:
                        value = '"Addition"'
                    elif value == CHANGE:
                        value = '"Change"'
                    elif value == DELETION:
                        value = '"Deletion"'
                args.append(f"{tab}{f.name}={value}")
        args = f",{args_newline}".join(args)
        tab = tab[:-2]
        return f"{model_class.__name__}({class_newline}{args}{class_newline}{tab})"
    if isinstance(obj, str):
        return f'"{obj}"'
    return str(obj)


@receiver(post_save, sender=LogEntry)
def log_entry_save(sender, instance, created, **kwargs):
    """
    Replaces the `object_repr` with `object.__repr__()`, since most `LogEntry` objects are created
    using `object.__str__()`, and logs the resulting `LogEntry` object
    """
    if created:
        model_class = instance.content_type.model_class()
        obj = model_class.objects.get(id=instance.object_id)

        # Use `_repr` method defined above to get the log entry's formatted representation
        instance.object_repr = _repr(obj, recurse=6, prettyprint=True, starting_depth=1)
        logger.info(
            f"Admin action taken (formatted):\n{_repr(instance, recurse=7, prettyprint=True)}"
        )

        # Also log the unformatted version
        instance.object_repr = _repr(obj, recurse=6, prettyprint=False, starting_depth=1)
        logger.info(
            f"Admin action taken (single line):\n{_repr(instance, recurse=7, prettyprint=False)}"
        )
