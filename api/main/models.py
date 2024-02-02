import json
import os
import psycopg2
import random
import string
from typing import List, Generator, Tuple

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
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
from django.contrib.gis.db.models import EmailField
from django.contrib.gis.db.models import PROTECT
from django.contrib.gis.db.models import CASCADE
from django.contrib.gis.db.models import SET_NULL
from django.contrib.gis.geos import Point
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator
from django.core.validators import RegexValidator
from django.db.models import JSONField
from django.db.models import FloatField, Transform, UUIDField
from django.db.models.signals import m2m_changed, pre_delete, pre_save, post_delete, post_save
from django.dispatch import receiver
from django.conf import settings
from django.forms.models import model_to_dict
from enumfields import Enum
from enumfields import EnumField
from django_ltree.fields import PathField
from django.db import transaction
from django.db.models import UniqueConstraint

from .backup import TatorBackupManager
from .search import TatorSearch
from .mail import get_email_service
from .download import download_file
from .encoders import TatorJSONEncoder
from .store import (
    get_tator_store,
    ObjectStore,
    get_storage_lookup,
    DEFAULT_STORAGE_CLASSES,
    VALID_STORAGE_CLASSES,
)
from .cognito import TatorCognito

from collections import UserDict
from urllib.parse import urlparse

import pytz
import datetime
import logging
import os
import shutil
import uuid

import pgtrigger

# Load the main.view logger
logger = logging.getLogger(__name__)

BEFORE_MARK_TRIGGER_FUNC = """
IF NEW.elemental_id IS NULL THEN
            RAISE EXCEPTION 'elemental_id cannot be null';
END IF;
IF NEW.version IS NULL THEN
            RAISE EXCEPTION 'version cannot be null';
END IF;
EXECUTE format('SELECT COALESCE(MAX(mark)+1,0) FROM %I.%I WHERE elemental_id=%L AND version=%s', TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.elemental_id, NEW.version) INTO _var;
NEW.mark = _var;
RETURN NEW;
"""

AFTER_MARK_TRIGGER_FUNC = """
EXECUTE format('SELECT COALESCE(MAX(mark),0) FROM %I.%I WHERE elemental_id=%L AND version=%s', TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.elemental_id, NEW.version) INTO _var;
EXECUTE format('UPDATE %I.%I SET latest_mark=%s WHERE elemental_id=%L AND version=%s',TG_TABLE_SCHEMA, TG_TABLE_NAME, _var, NEW.elemental_id, NEW.version);
RETURN NEW;
"""


class ModelDiffMixin(object):
    """
    A model mixin that tracks model fields' values and provide some useful api
    to know what fields have been changed.

    Based on the code in https://stackoverflow.com/a/13842223.
    """

    @staticmethod
    def _diff(old, new):
        """
        Calculates the difference between two model dicts from the same object after a change was
        applied.
        """
        for name, v in old.items():
            new_v = new[name]
            if name != "attributes" and v != new_v:
                yield (f"_{name}", v, new_v)

        old_attributes = old.get("attributes", {})
        new_attributes = new.get("attributes", {})
        for name, v in new_attributes.items():
            old_v = old_attributes.get(name)
            if v != old_v:
                yield (name, old_v, v)

    @property
    def model_dict(self):
        """
        Returns the dictionary representation of the model for comparison.
        """
        model_fields = [field.name for field in self._meta.fields]
        model_dict = model_to_dict(self, fields=model_fields)
        for field in model_fields:
            if (
                field in model_dict
                and self._meta.get_field(field).get_internal_type() == "JSONField"
            ):
                model_dict[field] = dict(model_dict[field]) if model_dict[field] else {}
        for k, v in model_dict.items():
            if type(v) == datetime.datetime:
                model_dict[k] = v.strftime("%Y_%m_%d__%H_%M_%S")
        return model_dict

    @staticmethod
    def _init_change_dict():
        return {"old": [], "new": []}

    def change_dict(self, old):
        """
        Returns the dictionary that is stored in the `description_of_change` field of the ChangeLog
        table.
        """
        change_dict = self._init_change_dict()

        for name, old_val, new_val in self._diff(old, self.model_dict):
            change_dict["old"].append({"name": name, "value": old_val})
            change_dict["new"].append({"name": name, "value": new_val})

        return change_dict

    @property
    def delete_dict(self):
        """
        Returns the dictionary that is stored in the `description_of_change` field of the ChangeLog
        table when a row is deleted.
        """
        change_dict = self._init_change_dict()

        old = self.model_dict
        new = {key: None for key in old.keys() if key != "attributes"}
        new["attributes"] = {key: None for key in old.get("attributes", {})}

        for name, old_val, new_val in self._diff(old, new):
            change_dict["old"].append({"name": name, "value": old_val})
            change_dict["new"].append({"name": name, "value": new_val})

        return change_dict

    @property
    def create_dict(self):
        """
        Returns the dictionary that is stored in the `description_of_change` field of the ChangeLog
        table when a row is created.
        """
        change_dict = self._init_change_dict()

        new = self.model_dict
        old = {key: None for key in new.keys() if key != "attributes"}
        old["attributes"] = {key: None for key in new.get("attributes", {})}

        for name, old_val, new_val in self._diff(old, new):
            change_dict["old"].append({"name": name, "value": old_val})
            change_dict["new"].append({"name": name, "value": new_val})

        return change_dict


class Depth(Transform):
    lookup_name = "depth"
    function = "nlevel"

    @property
    def output_field(self):
        return IntegerField()


PathField.register_lookup(Depth)

FileFormat = [("mp4", "mp4"), ("webm", "webm"), ("mov", "mov")]
ImageFileFormat = [("jpg", "jpg"), ("png", "png"), ("bmp", "bmp"), ("raw", "raw")]

## Describes different association models in the database
AssociationTypes = [
    ("Media", "Relates to one or more media items"),
    ("Frame", "Relates to a specific frame in a video"),  # Relates to one or more frames in a video
    ("Localization", "Relates to localization(s)"),
]  # Relates to one-to-many localizations


class MediaAccess(Enum):
    VIEWABLE = "viewable"
    DOWNLOADABLE = "downloadable"
    ARCHIVAL = "archival"
    REMOVE = "remove"


class Marker(Enum):
    NONE = "none"
    CROSSHAIR = "crosshair"
    SQUARE = "square"
    CIRCLE = "circle"


class InterpolationMethods(Enum):
    NONE = "none"
    LATEST = "latest"
    NEAREST = "nearest"
    LINEAR = "linear"
    SPLINE = "spline"


class JobResult(Enum):
    FINISHED = "finished"
    FAILED = "failed"


class JobStatus(Enum):  # Keeping for migration compatiblity
    pass


class JobChannel(Enum):  # Keeping for migration compatiblity
    pass


class Permission(Enum):
    NO_ACCESS = "n"
    VIEW_ONLY = "r"
    CAN_EDIT = "w"
    CAN_TRANSFER = "t"
    CAN_EXECUTE = "x"
    FULL_CONTROL = "a"


class HistogramPlotType(Enum):
    PIE = "pie"
    BAR = "bar"


class TwoDPlotType(Enum):
    LINE = "line"
    SCATTER = "scatter"


class Organization(Model):
    name = CharField(max_length=128)
    thumb = CharField(max_length=1024, null=True, blank=True)
    # TODO Reinstate the `default=Permission.NO_ACCESS` after the next release
    default_membership_permission = EnumField(Permission, max_length=1, blank=True, null=True)

    def user_permission(self, user_id):
        permission = None
        qs = self.affiliation_set.filter(user_id=user_id)
        if qs.exists():
            permission = qs[0].permission
        return permission

    def __str__(self):
        return self.name


class TatorUserManager(UserManager):
    valid_providers = ["cognito", "okta"]

    def get_or_create_for_oauth2(self, payload, provider):
        if provider not in self.valid_providers:
            raise ValueError(
                f"Expected oauth2 provider in {self.valid_providers}, got '{provider}'"
            )

        # The field to query in the user model is the provider name with `_id` appended
        provider_id = {f"{provider}_id": payload["sub"]}

        try:
            return self.get(**provider_id)
        except self.model.DoesNotExist:
            pass

        first_name = payload["given_name"]
        last_name = payload["family_name"]
        initials = f"{first_name[0]}{last_name[0]}"
        user_definition = {
            "username": payload["email"],
            "first_name": first_name,
            "last_name": last_name,
            "initials": initials,
            "email": payload["email"],
            "is_active": True,
        }
        user_definition.update(provider_id)
        user = User(**user_definition)
        user.save()

        return user

    # Override allows for case-insensitive username matching, to avoid duplicate usernames that only
    # differ by case
    def get_by_natural_key(self, username):
        return self.get(**{f"{self.model.USERNAME_FIELD}__iexact": username})


class User(AbstractUser):
    objects = TatorUserManager()
    cognito_id = UUIDField(primary_key=False, db_index=True, null=True, blank=True, editable=False)
    okta_id = CharField(
        max_length=32, primary_key=False, db_index=True, null=True, blank=True, editable=False
    )
    middle_initial = CharField(max_length=1)
    initials = CharField(max_length=3)
    last_login = DateTimeField(null=True, blank=True)
    last_failed_login = DateTimeField(null=True, blank=True)
    failed_login_count = IntegerField(default=0)
    confirmation_token = UUIDField(primary_key=False, db_index=True, null=True, blank=True)
    """ Used for email address confirmation for anonymous registrations. """

    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

    profile = JSONField(default=dict)
    """ Store user specific information (avatar image, tbd elements) """

    def move_to_cognito(self, email_verified=False, temp_pw=None):
        cognito = TatorCognito()
        response = cognito.create_user(self, email_verified, temp_pw)
        for attribute in response["User"]["Attributes"]:
            if attribute["Name"] == "sub":
                self.cognito_id = attribute["Value"]
        self.save()

    def set_password_cognito(self, password, permanent=False):
        cognito = TatorCognito()
        cognito.set_password(self, password, permanent)

    def reset_password_cognito(self):
        cognito = TatorCognito()
        cognito.reset_password(self)

    def set_password(self, password):
        super().set_password(password)
        if os.getenv("COGNITO_ENABLED") == "TRUE":
            self.set_password_cognito(password, True)

    def __str__(self):
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}"
        else:
            return f"{self.username}"

    def natural_key(self):
        return (self.username.lower(),)

    def get_description(self):
        return "\n".join(
            f"{field}={getattr(self, field)}"
            for field in [
                "id",
                "username",
                "first_name",
                "last_name",
                "email",
                "is_active",
                "profile",
            ]
        )


def block_user_save_email(instance, method, *args, **kwargs):
    # Create random attribute name with static prefix for determining if this is the root trigger of
    # this signal
    attr_prefix = "_saving_"
    random_attr = f"{attr_prefix}{''.join(random.sample(string.ascii_lowercase, 16))}"

    # Adds random attribute to suppress email from save during creation, then removes it
    setattr(instance, random_attr, True)
    getattr(instance, method)(*args, **kwargs)
    delattr(instance, random_attr)


@receiver(post_save, sender=User)
def user_save(sender, instance, created, **kwargs):
    if os.getenv("COGNITO_ENABLED") == "TRUE":
        if created:
            block_user_save_email(instance, "move_to_cognito")
        else:
            TatorCognito().update_attributes(instance)
    if created:
        if instance.username:
            instance.username = instance.username.strip()
            block_user_save_email(instance, "save")
        if settings.SAML_ENABLED and not instance.email:
            instance.email = instance.username
            block_user_save_email(instance, "save")
        invites = Invitation.objects.filter(email=instance.email, status="Pending")
        if (invites.count() == 0) and (os.getenv("AUTOCREATE_ORGANIZATIONS")):
            organization = Organization.objects.create(name=f"{instance}'s Team")
            Affiliation.objects.create(organization=organization, user=instance, permission="Admin")


@receiver(pre_save, sender=User)
def user_pre_save(sender, instance, **kwargs):
    # Prefix for random attribute name to determine if this is the root trigger of this signal
    attr_prefix = "_saving_"
    user_desc = instance.get_description()
    if all(not attr.startswith(attr_prefix) for attr in dir(instance)):
        created = not instance.pk
        if created:
            msg = (
                f"You are being notified that a new user {instance} (username {instance.username}, "
                f"email {instance.email}) has been added to the Tator deployment with the "
                f"following attributes:\n\n{user_desc}"
            )
            is_monitored = True
            password_modified = False
        else:
            msg = (
                f"You are being notified that an existing user {instance} been modified with the "
                f"following values:\n\n{user_desc}"
            )

            # Only send an email if this is the root `pre_save` trigger, i.e. does not have a random
            # attribute added to it, and is a modification of a monitored field.
            original_instance = type(instance).objects.get(pk=instance.id)
            monitored_fields = [
                "username",
                "first_name",
                "last_name",
                "email",
                "is_staff",
                "profile",
                "password",
            ]
            password_modified = instance.password != original_instance.password
            is_monitored = password_modified or any(
                getattr(instance, fieldname, None) != getattr(original_instance, fieldname, None)
                for fieldname in monitored_fields
            )

        if is_monitored:
            if password_modified:
                instance.failed_login_count = 0
                block_user_save_email(instance, "save")
            logger.info(msg)
            email_service = get_email_service()
            if email_service:
                email_service.email_staff(
                    sender=settings.TATOR_EMAIL_SENDER,
                    title=f"{'Created' if created else 'Modified'} user",
                    text=msg,
                )


@receiver(post_delete, sender=User)
def user_post_delete(sender, instance, **kwargs):
    """Clean up avatar and notify deployment staff on user deletion."""
    if instance.profile.get("avatar"):
        avatar_key = instance.profile.get("avatar")
        # Out of an abundance of caution check to make sure the object key
        # matches the user's scope
        if avatar_key.startswith(f"user_data/{instance.pk}"):
            generic_store = get_tator_store()
            generic_store.delete_object(avatar_key)

    msg = f"You are being notified that the user {instance} has been removed from the system."
    logger.info(msg)
    email_service = get_email_service()
    if email_service:
        email_service.email_staff(
            sender=settings.TATOR_EMAIL_SENDER,
            title=f"Deleted user {instance}",
            text=msg,
        )


class PasswordReset(Model):
    user = ForeignKey(User, on_delete=CASCADE)
    reset_token = UUIDField(primary_key=False, db_index=True, editable=False, default=uuid.uuid1)
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)


class Invitation(Model):
    email = EmailField()
    organization = ForeignKey(Organization, on_delete=CASCADE)
    permission = CharField(
        max_length=16, choices=[("Member", "Member"), ("Admin", "Admin")], default="Member"
    )
    registration_token = UUIDField(
        primary_key=False, db_index=True, editable=False, default=uuid.uuid1
    )
    status = CharField(
        max_length=16,
        choices=[("Pending", "Pending"), ("Expired", "Expired"), ("Accepted", "Accepted")],
        default="Pending",
    )
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True)
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return (
            f"{self.email} | {self.organization} | {self.created_by} | "
            f"{self.created_datetime} | {self.status}"
        )


class Affiliation(Model):
    """Stores a user and their permissions in an organization."""

    organization = ForeignKey(Organization, on_delete=CASCADE)
    user = ForeignKey(User, on_delete=CASCADE)
    permission = CharField(
        max_length=16, choices=[("Member", "Member"), ("Admin", "Admin")], default="Member"
    )

    def __str__(self):
        return f"{self.user} | {self.organization}"


@receiver(post_save, sender=Affiliation)
def affiliation_save(sender, instance, created, **kwargs):
    organization = instance.organization
    user = instance.user
    email_service = get_email_service()
    if created:
        # Send email notification to organizational admins.
        if email_service:
            recipients = Affiliation.objects.filter(
                organization=organization, permission="Admin"
            ).values_list("user", flat=True)
            recipients = User.objects.filter(pk__in=recipients).values_list("email", flat=True)
            recipients = list(recipients)
            title = f"{user} added to {organization}"
            text = (
                f"You are being notified that a new user {user} (username {user.username}, email "
                f"{user.email}) has been added to the Tator organization {organization}."
            )
            footer = (
                " This message has been sent to all organization admins. No action is required."
            )

            email_service.email(
                sender=settings.TATOR_EMAIL_SENDER,
                recipients=recipients,
                title=title,
                text=text + footer,
            )
            logger.info(f"Sent email to {recipients} indicating {user} added to {organization}.")
    else:
        title = f"{user}'s affiliation with {organization} modified"
        text = (
            f"You are being notified that {user}'s affiliation with {organization} has been "
            f"modified to the {instance.permission} level."
        )

    if email_service:
        email_service.email_staff(sender=settings.TATOR_EMAIL_SENDER, title=title, text=text)


@receiver(post_delete, sender=Affiliation)
def affiliation_delete(sender, instance, using, **kwargs):
    email_service = get_email_service()
    if email_service:
        user = instance.user
        organization = instance.organization
        title = f"{user} affiliation removed"
        text = f"You are being notified that {user} is no longer affiliated with {organization}."
        email_service.email_staff(sender=settings.TATOR_EMAIL_SENDER, title=title, text=text)


class Bucket(Model):
    """Stores info required for remote S3 buckets."""

    organization = ForeignKey(Organization, on_delete=SET_NULL, null=True, blank=True)
    name = CharField(max_length=63)
    config = JSONField(null=True, blank=True)
    store_type = EnumField(ObjectStore, max_length=32, null=True, blank=True)
    external_host = CharField(max_length=128, null=True, blank=True)
    archive_sc = CharField(
        max_length=16,
        choices=[
            ("STANDARD", "STANDARD"),
            ("DEEP_ARCHIVE", "DEEP_ARCHIVE"),
            ("COLDLINE", "COLDLINE"),
        ],
    )
    live_sc = CharField(max_length=16, choices=[("STANDARD", "STANDARD")])

    def __str__(self):
        return " | ".join(
            [
                f"{self.name} ({self.id})",
                str(self.store_type),
                f"{self.organization} ({self.organization.id})",
            ]
        )

    @staticmethod
    def validate_storage_classes(store_type, params):
        """
        Checks for the existence of `live_sc` and `archive_sc` and validates them if they exist. If
        they are invalid for the given `endpoint_url`, raises a `ValueError`. If they do not exist,
        they are set in a copy of the `params` dict and this copy is returned.
        """
        new_params = dict(params)
        storage_type = {
            ObjectStore.AWS: "Amazon S3",
            ObjectStore.MINIO: "MinIO",
            ObjectStore.GCP: "Google Cloud Storage",
            ObjectStore.OCI: "Oracle Cloud Storage",
        }

        for sc_type in ["archive_sc", "live_sc"]:
            try:
                valid_storage_classes = VALID_STORAGE_CLASSES[sc_type][store_type]
                default_storage_class = DEFAULT_STORAGE_CLASSES[sc_type][store_type]
            except KeyError:
                raise ValueError(f"Found unknown server type {store_type}")

            storage_class = new_params.setdefault(sc_type, default_storage_class)
            if storage_class not in valid_storage_classes:
                raise ValueError(
                    f"{sc_type[:-3].title()} storage class '{storage_class}' invalid for {storage_type[store_type]} store"
                )

        return new_params


class Project(Model):
    name = CharField(max_length=128)
    creator = ForeignKey(User, on_delete=PROTECT, related_name="creator", db_column="creator")
    organization = ForeignKey(
        Organization, on_delete=SET_NULL, null=True, blank=True, db_column="organization"
    )
    created = DateTimeField(auto_now_add=True)
    size = BigIntegerField(default=0)
    """Size of all media in project in bytes.
    """
    num_files = IntegerField(default=0)
    duration = BigIntegerField(default=0)
    """ Duration of all videos in this project.
    """
    summary = CharField(max_length=1024)
    filter_autocomplete = JSONField(null=True, blank=True)
    attribute_type_uuids = JSONField(default=dict, null=True, blank=True)
    enable_downloads = BooleanField(default=True)
    thumb = CharField(max_length=1024, null=True, blank=True)
    usernames = ArrayField(CharField(max_length=256), default=list)
    bucket = ForeignKey(
        Bucket, null=True, blank=True, on_delete=SET_NULL, related_name="+", db_column="bucket"
    )
    """ If set, media will use this bucket by default.
    """
    upload_bucket = ForeignKey(
        Bucket,
        null=True,
        blank=True,
        on_delete=SET_NULL,
        related_name="+",
        db_column="upload_bucket",
    )
    """ If set, uploads will use this bucket by default.
    """
    backup_bucket = ForeignKey(
        Bucket,
        null=True,
        blank=True,
        on_delete=SET_NULL,
        related_name="+",
        db_column="backup_bucket",
    )
    """ If set, backups will use this bucket by default.
    """
    default_media = ForeignKey(
        "MediaType",
        null=True,
        blank=True,
        on_delete=SET_NULL,
        related_name="+",
        db_column="default_media",
    )

    """ Default media type for uploads.
    """

    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

    attribute_types = JSONField(default=list, null=True, blank=True)
    """ Defines the attribute types that can be used to filter sections for this project
    """

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

    def get_bucket(self, *, upload=False, backup=False):
        """Abstracts getting the bucket from a project for ease of use"""
        if upload:
            return self.upload_bucket
        if backup:
            return self.backup_bucket
        return self.bucket

    def delete(self, *args, **kwargs):
        Version.objects.filter(project=self).delete()
        MediaType.objects.filter(project=self).delete()
        LocalizationType.objects.filter(project=self).delete()
        StateType.objects.filter(project=self).delete()
        LeafType.objects.filter(project=self).delete()
        FileType.objects.filter(project=self).delete()
        super().delete(*args, **kwargs)


class Version(Model):
    name = CharField(max_length=128)
    description = CharField(max_length=1024, blank=True)
    number = IntegerField()
    project = ForeignKey(Project, on_delete=CASCADE)
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(
        User, on_delete=SET_NULL, null=True, blank=True, related_name="version_created_by"
    )
    show_empty = BooleanField(default=True)
    """ Tells the UI to show this version even if the current media does not
        have any annotations.
    """
    bases = ManyToManyField("self", symmetrical=False, blank=True)
    """ This version is a patch to an existing version. A use-case here is using one version
        for each generation of a state-based inference algorithm; all referencing localizations
        in another layer.
    """
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

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
        show_empty=True,
    )


def add_org_users(project):
    organization = project.organization
    if not organization:
        return

    # TODO Remove `or ...` when there is a default default_membership_permission
    permission = organization.default_membership_permission or Permission.NO_ACCESS

    # If no access is given by default, don't create memberships
    if permission == Permission.NO_ACCESS:
        return

    users = list(
        Affiliation.objects.filter(organization=organization)
        .values_list("user", flat=True)
        .distinct()
    )
    user_qs = User.objects.filter(pk__in=users)
    for user in user_qs:
        if Membership.objects.filter(project=project, user=user).exists():
            continue

        Membership.objects.create(project=project, user=user, permission=permission).save()


@receiver(post_save, sender=Project)
def project_save(sender, instance, created, **kwargs):
    if created:
        make_default_version(instance)
        add_org_users(instance)
        TatorSearch().create_section_index(instance)
    if instance.thumb:
        Resource.add_resource(instance.thumb, None)


@receiver(post_delete, sender=Project)
def project_post_delete(sender, instance, **kwargs):
    TatorSearch().delete_project_indices(instance.pk)
    if instance.thumb:
        safe_delete(instance.thumb, instance.id)


class Membership(Model):
    """Stores a user and their access level for a project."""

    project = ForeignKey(Project, on_delete=CASCADE, db_column="project")
    user = ForeignKey(User, on_delete=PROTECT, db_column="user")
    permission = EnumField(Permission, max_length=1, default=Permission.CAN_EDIT)
    default_version = ForeignKey(Version, null=True, blank=True, on_delete=SET_NULL)

    def __str__(self):
        return f"{self.user} | {self.permission} | {self.project}"


@receiver(post_save, sender=Membership)
def membership_save(sender, instance, created, **kwargs):
    email_service = get_email_service()
    if email_service:
        project = instance.project
        user = instance.user
        permission = instance.permission
        default_version = instance.default_version
        if created:
            title = f"{user} added to {project}"
            text = (
                f"You are being notified that {user} was added to {project} with permission "
                f"{permission} and default version {default_version}."
            )
        else:
            title = f"{user}'s Membership with project {project} modified"
            text = (
                f"You are being notified that {user}'s membership with {project} was modified to "
                f"have permission {permission} and default version {default_version}."
            )

        email_service.email_staff(sender=settings.TATOR_EMAIL_SENDER, title=title, text=text)


@receiver(post_delete, sender=Membership)
def membership_delete(sender, instance, using, **kwargs):
    email_service = get_email_service()
    if email_service:
        user = instance.user
        project = instance.project
        title = f"{user} membership removed"
        text = f"You are being notified that {user}'s membership with {project} has been deleted."
        email_service.email_staff(sender=settings.TATOR_EMAIL_SENDER, title=title, text=text)


def getVideoDefinition(path, codec, resolution, **kwargs):
    """Convenience function to generate video definiton dictionary"""
    obj = {"path": path, "codec": codec, "resolution": resolution}
    for arg in kwargs:
        if arg in ["segment_info", "host", "http_auth", "codec_meme", "codec_description"]:
            obj[arg] = kwargs[arg]
        else:
            raise TypeError(f"Invalid argument '{arg}' supplied")
    return obj


def ProjectBasedFileLocation(instance, filename):
    return os.path.join(f"{instance.project.id}", filename)


class JobCluster(Model):
    name = CharField(max_length=128)
    organization = ForeignKey(Organization, null=True, blank=True, on_delete=SET_NULL)
    host = CharField(max_length=1024)
    port = PositiveIntegerField()
    token = CharField(max_length=1024)
    cert = TextField(max_length=2048)

    def __str__(self):
        return self.name


# Algorithm models


class Algorithm(Model):
    name = CharField(max_length=128)
    project = ForeignKey(Project, on_delete=CASCADE, db_column="project")
    user = ForeignKey(User, on_delete=PROTECT, db_column="user")
    description = CharField(max_length=1024, null=True, blank=True)
    manifest = FileField(upload_to=ProjectBasedFileLocation, null=True, blank=True)
    cluster = ForeignKey(JobCluster, null=True, blank=True, on_delete=SET_NULL, db_column="cluster")
    files_per_job = PositiveIntegerField(
        default=1,
        validators=[
            MinValueValidator(1),
        ],
    )
    categories = ArrayField(CharField(max_length=128), default=list, null=True)
    parameters = JSONField(default=list, null=True, blank=True)
    template = ForeignKey(HostedFile, on_delete=SET_NULL, null=True)
    """ Hosted template, if given then `manifest` is ignored. """
    tparams = JSONField(default=dict)
    """ Template parameters, any values set here override default values in
        the HostedTemplate object.
    """
    headers = JSONField(default=dict)
    """ Request headers for hosted template, any values set here override 
        default values in the HostedTemplate object.
    """

    def __str__(self):
        return self.name


class TemporaryFile(Model):
    """Represents a temporary file in the system, can be used for algorithm results or temporary outputs"""

    name = CharField(max_length=128)
    """ Human readable name for display purposes """
    project = ForeignKey(Project, on_delete=CASCADE)
    """ Project the temporary file resides in """
    user = ForeignKey(User, on_delete=PROTECT)
    """ User who created the temporary file """
    path = FilePathField(path=settings.MEDIA_ROOT, null=True, blank=True)
    """ Path to file on storage """
    lookup = SlugField(max_length=256)
    """ unique lookup (md5sum of something useful) """
    created_datetime = DateTimeField()
    """ Time that the file was created """
    eol_datetime = DateTimeField()
    """ Time the file expires (reaches EoL) """

    def expire(self):
        """Set a given temporary file as expired"""
        past = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        past = pytz.timezone("UTC").localize(past)
        self.eol_datetime = past
        self.save()

    @staticmethod
    def from_local(path, name, project, user, lookup, hours, is_upload=False):
        """Given a local file create a temporary file storage object
        :returns A saved TemporaryFile:
        """
        extension = os.path.splitext(name)[-1]
        destination_fp = os.path.join(
            settings.MEDIA_ROOT, f"{project.id}", f"{uuid.uuid1()}{extension}"
        )
        os.makedirs(os.path.dirname(destination_fp), exist_ok=True)
        if is_upload:
            download_file(path, destination_fp)
        else:
            shutil.copyfile(path, destination_fp)

        now = datetime.datetime.utcnow()
        eol = now + datetime.timedelta(hours=hours)

        temp_file = TemporaryFile(
            name=name,
            project=project,
            user=user,
            path=destination_fp,
            lookup=lookup,
            created_datetime=now,
            eol_datetime=eol,
        )
        temp_file.save()
        return temp_file


@receiver(pre_delete, sender=TemporaryFile)
def temporary_file_delete(sender, instance, **kwargs):
    if os.path.exists(instance.path):
        os.remove(instance.path)


# Entity types


class MediaType(Model):
    dtype = CharField(
        max_length=16,
        choices=[("image", "image"), ("video", "video"), ("multi", "multi"), ("live", "live")],
    )
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column="project")
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    edit_triggers = JSONField(null=True, blank=True)
    file_format = CharField(max_length=4, null=True, blank=True, default=None)
    default_volume = IntegerField(default=0)
    """ Default Volume for Videos (default is muted) """
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: (optional) Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos, float_array.
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
        style: (optional) String of GUI-related styles.
    """
    archive_config = JSONField(default=None, null=True, blank=True)
    streaming_config = JSONField(default=None, null=True, blank=True)
    overlay_config = JSONField(default=None, null=True, blank=True)
    """
    Overlay configuration provides text overlay on video / image based on
    configruation examples:
    Example: {"mode": "constant", "source": "name"} Overlays file name
    Time example:
             {"mode": "datetime", "locale": [locale], "options" : [options]}
            options can contain 'timeZone' which comes from the TZ database name
            https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            Example: America/Los_Angeles or America/New_York

    Overlay can optionally be a list of multiple overlays
    """
    default_box = ForeignKey(
        "LocalizationType", null=True, blank=True, on_delete=SET_NULL, related_name="+"
    )
    """ Box type used as default in UI. """
    default_line = ForeignKey(
        "LocalizationType", null=True, blank=True, on_delete=SET_NULL, related_name="+"
    )
    """ Line type used as default in UI. """
    default_dot = ForeignKey(
        "LocalizationType", null=True, blank=True, on_delete=SET_NULL, related_name="+"
    )
    """ Dot type used as default in UI. """
    default_poly = ForeignKey(
        "LocalizationType", null=True, blank=True, on_delete=SET_NULL, related_name="+"
    )
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

    def __str__(self):
        return f"{self.name} | {self.project}"


@receiver(post_save, sender=MediaType)
def media_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)


class LocalizationType(Model):
    dtype = CharField(
        max_length=16, choices=[("box", "box"), ("line", "line"), ("dot", "dot"), ("poly", "poly")]
    )
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column="project")
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    drawable = BooleanField(default=True)
    """ Whether this type can be drawn in the UI."""
    grouping_default = BooleanField(default=True)
    """ Whether to group elements in the UI by default."""
    media = ManyToManyField(MediaType)
    color_map = JSONField(null=True, blank=True)
    line_width = PositiveIntegerField(default=3)
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos, float_array.
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
        style: (optional) String of GUI-related styles.
    """
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

    def __str__(self):
        return f"{self.name} | {self.project}"


@receiver(post_save, sender=LocalizationType)
def localization_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)


class StateType(Model):
    dtype = CharField(max_length=16, choices=[("state", "state")], default="state")
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column="project")
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    grouping_default = BooleanField(default=True)
    """ Whether to group elements in the UI by default."""
    media = ManyToManyField(MediaType)
    interpolation = CharField(
        max_length=16, choices=[("none", "none"), ("latest", "latest")], default="latest"
    )
    association = CharField(max_length=64, choices=AssociationTypes, default=AssociationTypes[0][0])
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos, float_array.
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
        style: (optional) String of GUI-related styles.
    """
    delete_child_localizations = BooleanField(default=False)
    """ If enabled, child localizations will be deleted when states of this
        type are deleted.
    """
    default_localization = ForeignKey(
        LocalizationType, on_delete=SET_NULL, null=True, blank=True, related_name="+"
    )
    """ If this is a track type, this is the default localization that is created when
        a track is created via the UI.
    """
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

    def __str__(self):
        return f"{self.name} | {self.project}"


@receiver(post_save, sender=StateType)
def state_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)


class LeafType(Model):
    dtype = CharField(max_length=16, choices=[("leaf", "leaf")], default="leaf")
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column="project")
    name = CharField(max_length=64)
    description = CharField(max_length=256, blank=True)
    visible = BooleanField(default=True)
    """ Whether this type should be displayed in the UI."""
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ User defined attributes.

        An array of objects, each containing the following fields:

        name: Name of the attribute.
        description: Description of the attribute.
        order: Order that the attribute should appear in web UI. Negative means
               do not display.
        dtype: Data type of the attribute. Valid values are bool, int, float,
               string, enum, datetime, geopos, float_array.
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
        style: (optional) String of GUI-related styles.
    """
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

    def __str__(self):
        return f"{self.name} | {self.project}"


@receiver(post_save, sender=LeafType)
def leaf_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)


# Entities (stores actual data)


class Media(Model, ModelDiffMixin):
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
                            "streaming": [ VIDEO_DEF, VIDEO_DEF, ... ],
                            <"audio": [AUDIO_DEF]>}
                     video_def = {"path": <path_to_disk>,
                                  "codec": <human readable codec>,
                                  "resolution": [<vertical pixel count, e.g. 720>, width]
                     audio_def = {"path": <path_to_disk>,
                                  "codec": <human readable codec>}


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

    project = ForeignKey(
        Project,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        db_column="project",
        related_name="media_project",
    )
    type = ForeignKey(MediaType, on_delete=SET_NULL, null=True, blank=True, db_column="meta")
    """ Meta points to the definition of the attribute field. That is
        a handful of AttributeTypes are associated to a given MediaType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True, default=dict)
    """ Values of user defined attributes. """
    gid = CharField(max_length=36, null=True, blank=True)
    """ Group ID for the upload that created this media. Note we intentionally do
        not use UUIDField because this field is provided by the uploader and not
        guaranteed to be an actual UUID. """
    uid = CharField(max_length=36, null=True, blank=True)
    """ Unique ID for the upload that created this media. Note we intentionally do
        not use UUIDField because this field is provided by the uploader and not
        guaranteed to be an actual UUID. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="media_created_by",
        db_column="created_by",
    )
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="media_modified_by",
        db_column="modified_by",
    )
    name = CharField(max_length=256, db_index=True)
    md5 = SlugField(max_length=32)
    """ md5 hash of the originally uploaded file. """
    last_edit_start = DateTimeField(null=True, blank=True)
    """ Start datetime of a session in which the media's annotations were edited.
    """
    last_edit_end = DateTimeField(null=True, blank=True)
    """ End datetime of a session in which the media's annotations were edited.
    """
    num_frames = IntegerField(null=True, blank=True)
    fps = FloatField(null=True, blank=True)
    codec = CharField(null=True, blank=True, max_length=256)
    width = IntegerField(null=True)
    height = IntegerField(null=True)
    media_files = JSONField(null=True, blank=True)
    deleted = BooleanField(default=False, db_index=True)
    restoration_requested = BooleanField(default=False)
    archive_status_date = DateTimeField(auto_now_add=True, null=True, blank=True)
    archive_state = CharField(
        max_length=16,
        choices=[
            ("live", "live"),
            ("to_live", "to_live"),
            ("archived", "archived"),
            ("to_archive", "to_archive"),
        ],
        default="live",
    )
    recycled_from = ForeignKey(
        Project, on_delete=SET_NULL, null=True, blank=True, related_name="recycled_from"
    )
    source_url = CharField(max_length=2048, blank=True, null=True)
    """ URL where original media was hosted. """
    summary_level = IntegerField(null=True, blank=True)
    """ Level at which this media is best summarized, e.g. every N frames. """
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a media to facilitate cross-cluster sync operations """

    def get_file_sizes(self):
        """Returns total size and download size for this media object."""
        total_size = 0
        download_size = None
        if not self.media_files:
            return (total_size, download_size)

        media_keys = [
            "archival",
            "streaming",
            "image",
            "audio",
            "thumbnail",
            "thumbnail_gif",
            "attachment",
        ]
        for key, media_def in self.media_def_iterator(keys=media_keys):
            size = media_def.get("size", 0)
            # Not all path descriptions have a size field or have it populated with a valid
            # value; if it is not an integer or less than 1, get it from storage and cache the
            # result
            if type(size) != int or size < 1:
                size = TatorBackupManager().get_size(Resource.objects.get(path=media_def["path"]))
                media_def["size"] = size

            total_size += size
            if key in ["archival", "streaming", "image"] and download_size is None:
                download_size = size
            if key == "streaming":
                json_path = media_def.get("segment_info")
                if json_path:
                    total_size += TatorBackupManager().get_size(
                        Resource.objects.get(path=json_path)
                    )

        return (total_size, download_size)

    def is_backed_up(self):
        """
        Returns True if all resources referenced by the media are backed up.
        """
        if self.type.dtype == "multi":
            media_qs = Media.objects.filter(pk__in=self.media_files["ids"])
            return all(media.is_backed_up() for media in media_qs.iterator())

        resource_qs = Resource.objects.filter(media=self)
        return all(resource.backed_up for resource in resource_qs.iterator())

    def media_def_iterator(self, keys: List[str] = None) -> Generator[Tuple[str, dict], None, None]:
        """
        Returns a generator that yields the media definition dicts for the desired set of
        `media_files` entries.

        :param keys: The list of keys to search `media_files` for.
        :type keys: List[str]
        :rtype: Generator[Tuple[str, dict], None, None]
        """
        accepted_keys = [
            "archival",
            "streaming",
            "audio",
            "image",
            "attachment",
            "thumbnail",
            "thumbnail_gif",
        ]
        if self.media_files:
            keys = keys or self.media_files.keys()
        else:
            keys = []

        for key in keys:
            if key not in accepted_keys:
                continue
            files = self.media_files.get(key, [])
            if files is None:
                files = []
            for obj in files:
                # Make sure `obj` is subscriptable
                if hasattr(obj, "__getitem__"):
                    yield (key, obj)

    def path_iterator(self, keys: List[str] = None) -> Generator[str, None, None]:
        """
        Returns a generator that yields the path strings for the desired set of `media_files` entries.

        :param keys: The list of keys to search `media_files` for.
        :type keys: List[str]
        :rtype: Generator[str, None, None]
        """
        if self.media_files:
            keys = keys or self.media_files.keys()
        else:
            keys = []

        for key, media_def in self.media_def_iterator(keys):
            # Do not yield invalid media definitions; must have at least the `path` field and, if
            # streaming, must also have the `segment_info` field
            if "path" not in media_def:
                continue
            if key == "streaming" and "segment_info" not in media_def:
                continue

            yield media_def["path"]

            if key == "streaming":
                yield media_def["segment_info"]


class FileType(Model):
    """Non-media generic file. Has user-defined attributes."""

    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True, db_column="project")
    """ Project associated with the file type """
    name = CharField(max_length=64)
    """ Name of the file type"""
    description = CharField(max_length=256, blank=True)
    """ Description of the file type"""
    attribute_types = JSONField(default=list, null=True, blank=True)
    """ Refer to the attribute_types field for the other *Type models
    """
    dtype = CharField(max_length=16, choices=[("file", "file")], default="file")
    """ Required as part of building the TatorSearch documents
    """
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """


@receiver(post_save, sender=FileType)
def file_type_save(sender, instance, **kwargs):
    TatorSearch().create_mapping(instance)


class File(Model, ModelDiffMixin):
    """Non-media generic file stored within a project"""

    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    """ Datetime when file was created """
    created_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="file_created_by",
        db_column="created_by",
    )
    """ User who originally created the file """
    description = CharField(max_length=1024, blank=True)
    """Description of the file"""
    path = FileField(upload_to=ProjectBasedFileLocation, null=True, blank=True)
    """ Path of file """
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    """ Datetime when file was last modified """
    modified_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="file_modified_by",
        db_column="modified_by",
    )
    """ User who last modified the file """
    name = CharField(max_length=128)
    """ Project associated with the file """
    project = ForeignKey(Project, on_delete=CASCADE, db_column="project")
    """ Project associated with the file """
    type = ForeignKey(FileType, on_delete=SET_NULL, null=True, blank=True, db_column="meta")
    """ Type associated with file """
    attributes = JSONField(null=True, blank=True, default=dict)
    """ Values of user defined attributes. """
    deleted = BooleanField(default=False, db_index=True)
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """


class Resource(Model):
    path = CharField(db_index=True, max_length=256)
    media = ManyToManyField(Media, related_name="resource_media")
    generic_files = ManyToManyField(File, related_name="resource_files")
    bucket = ForeignKey(Bucket, on_delete=PROTECT, null=True, blank=True, related_name="bucket")
    backup_bucket = ForeignKey(
        Bucket, on_delete=PROTECT, null=True, blank=True, related_name="backup_bucket"
    )
    backed_up = BooleanField(default=False)

    @staticmethod
    def get_project_from_path(path):
        project_id = path.split("/")[1]
        return Project.objects.get(pk=project_id)

    @staticmethod
    @transaction.atomic
    def add_resource(path_or_link, media, generic_file=None):
        if urlparse(path_or_link).scheme != "":
            raise ValueError("Can't supply a url to a resource path")
        if os.path.islink(path_or_link):
            path = os.readlink(path_or_link)
        else:
            path = path_or_link
        obj, created = Resource.objects.get_or_create(path=path)
        if media is None and generic_file is not None:
            if created:
                obj.bucket = generic_file.project.bucket
                obj.save()
            obj.generic_files.add(generic_file)
        elif media is not None:
            if created:
                obj.bucket = media.project.bucket
                obj.save()
            obj.media.add(media)

    @staticmethod
    @transaction.atomic
    def delete_resource(path_or_link, project_id):
        path = path_or_link
        if os.path.exists(path_or_link):
            if os.path.islink(path_or_link):
                path = os.readlink(path_or_link)
                os.remove(path_or_link)
        obj = Resource.objects.get(path=path)

        # If any media or generic files still reference this resource, don't delete it
        if obj.media.all().count() > 0 or obj.generic_files.all().count() > 0:
            return

        logger.info(f"Deleting object {path}")
        obj.delete()
        tator_store = get_tator_store(obj.bucket)
        if tator_store.check_key(path):
            tator_store.delete_object(path)

        # If the resource is not backed up or a `project_id` is not provided, don't try to delete
        # its backup
        if not obj.backed_up or project_id is None:
            return

        # If an object is backed up, that means it is either in a project-specific backup bucket or
        # the default backup bucket
        backup_bucket = Project.objects.get(pk=project_id).get_bucket(backup=True)

        # Use the default backup bucket if the project specific backup bucket is not set
        use_default_backup_bucket = backup_bucket is None
        backup_store = get_tator_store(backup_bucket, backup=use_default_backup_bucket)
        if backup_store.check_key(path):
            backup_store.delete_object(path)

    @staticmethod
    @transaction.atomic
    def archive_resource(path):
        """
        Moves the object into archive storage. If True is returned by every call to
        Resource.archive_resource on each path in a media object, the following should be executed
        by the management command that called this method:

            media.archive_state = "archived"
            media.save()
        """
        obj = Resource.objects.get(path=path)
        logger.info(f"Archiving object {path}")
        return get_tator_store(obj.bucket).archive_object(path)

    @staticmethod
    @transaction.atomic
    def request_restoration(path, min_exp_days):
        """
        Requests object restortation from archive storage. If True is returned by every call to
        Resource.request_restoration on each path in a media object, the following should be
        executed by the management command that called this method:

            media.restoration_requested = True
            media.save()
        """
        project = Resource.get_project_from_path(path)
        logger.info(f"Requesting restoration of object {path}")
        return TatorBackupManager().request_restore_resource(path, project, min_exp_days)

    @staticmethod
    @transaction.atomic
    def restore_resource(path, domain):
        """
        Performs the final copy operation that makes a restoration request permanent. Returns True
        if the copy operation succeeds or if it has succeeded previously. If True is returned by
        every call to Resource.restore_resource on each path in a media object, the following should
        be executed by the management command that called this method:

            media.restoration_requested = False
            media.archive_state = "live"
            media.save()
        """
        project = Resource.get_project_from_path(path)
        logger.info(f"Restoring object {path}")
        return TatorBackupManager().finish_restore_resource(path, project, domain)


@receiver(post_save, sender=Media)
def media_save(sender, instance, created, **kwargs):
    if instance.media_files and created:
        for path in instance.path_iterator():
            Resource.add_resource(path, instance)


def safe_delete(path, project_id=None):
    proj_str = f" from project {project_id}" if project_id else ""
    logger.info(f"Deleting resource for {path}{proj_str}")

    try:
        Resource.delete_resource(path, project_id)
    except:
        logger.warning(f"Could not remove {path}{proj_str}", exc_info=True)


def drop_file_from_resource(path, generic_file):
    """Drops the specified generic file from the resource. This should be called when
    removing a resource from a File object but the File object is
    not being deleted.
    """
    try:
        logger.info(f"Dropping file {generic_file} from resource {path}")
        obj = Resource.objects.get(path=path)
        obj.generic_files.remove(generic_file)
    except:
        logger.warning(f"Could not remove {generic_file} from {path}", exc_info=True)


def drop_media_from_resource(path, media):
    """Drops the specified media from the resource. This should be called when
    removing a resource from a Media object's media_files but the Media is
    not being deleted.
    """
    try:
        logger.info(f"Dropping media {media} from resource {path}")
        obj = Resource.objects.get(path=path)
        obj.media.remove(media)
    except:
        logger.warning(f"Could not remove {media} from {path}", exc_info=True)


@receiver(post_delete, sender=Media)
def media_post_delete(sender, instance, **kwargs):
    # Delete all the files referenced in media_files
    project_id = instance.project and instance.project.id
    for path in instance.path_iterator():
        safe_delete(path, project_id)


@receiver(post_save, sender=File)
def file_save(sender, instance, created, **kwargs):
    if instance.path and created:
        Resource.add_resource(instance.path, None, instance)


@receiver(post_delete, sender=File)
def file_post_delete(sender, instance, **kwargs):
    # Delete the path reference
    if not (instance.path is None and getattr(instance.path, "name") is None):
        safe_delete(instance.path.name, instance.project.id)


class Localization(Model, ModelDiffMixin):
    class Meta:
        triggers = [
            pgtrigger.Trigger(
                name="localization_mark_trigger",
                operation=pgtrigger.Insert,
                when=pgtrigger.Before,
                declare=[("_var", "integer")],
                func=BEFORE_MARK_TRIGGER_FUNC,
            ),
            pgtrigger.Trigger(
                name="post_localization_mark_trigger",
                operation=pgtrigger.Insert,
                when=pgtrigger.After,
                declare=[("_var", "integer")],
                func=AFTER_MARK_TRIGGER_FUNC,
            ),
        ]

    project = ForeignKey(Project, on_delete=SET_NULL, null=True, blank=True, db_column="project")
    type = ForeignKey(LocalizationType, on_delete=SET_NULL, null=True, blank=True, db_column="meta")
    """ Meta points to the definition of the attribute field. That is
        a handful of AttributeTypes are associated to a given LocalizationType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True, default=dict)
    """ Values of user defined attributes. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="localization_created_by",
        db_column="created_by",
    )
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="localization_modified_by",
        db_column="modified_by",
    )
    user = ForeignKey(User, on_delete=PROTECT, db_column="user")
    media = ForeignKey(Media, on_delete=SET_NULL, null=True, blank=True, db_column="media")
    frame = PositiveIntegerField(null=True, blank=True)
    thumbnail_image = ForeignKey(
        Media,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="localization_thumbnail_image",
        db_column="thumbnail_image",
    )
    version = ForeignKey(Version, on_delete=CASCADE, null=True, blank=False, db_column="version")
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
    points = JSONField(null=True, blank=True)
    """ List of points used by poly dtype. """
    parent = ForeignKey("self", on_delete=SET_NULL, null=True, blank=True, db_column="parent")
    """ Pointer to localization in which this one was generated from """
    deleted = BooleanField(default=False, db_index=True)
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    variant_deleted = BooleanField(default=False, null=True, blank=True, db_index=True)
    """ Indicates this is a variant that is deleted """
    mark = PositiveIntegerField(default=0, blank=True)
    """ Mark represents the revision number of the element  """
    latest_mark = PositiveIntegerField(default=0, blank=True, null=True)
    """ Mark represents the latest revision number of the element  """


@receiver(pre_delete, sender=Localization)
def localization_delete(sender, instance, **kwargs):
    if instance.thumbnail_image:
        instance.thumbnail_image.delete()


class State(Model, ModelDiffMixin):
    """
    A State is an event that occurs, potentially independent, from that of
    a media element. It is associated with 0 (1 to be useful) or more media
    elements. If a frame is supplied it was collected at that time point.
    """

    class Meta:
        triggers = [
            pgtrigger.Trigger(
                name="state_mark_trigger",
                operation=pgtrigger.Insert,
                when=pgtrigger.Before,
                declare=[("_var", "integer")],
                func=BEFORE_MARK_TRIGGER_FUNC,
            ),
            pgtrigger.Trigger(
                name="post_state_mark_trigger",
                operation=pgtrigger.Insert,
                when=pgtrigger.After,
                declare=[("_var", "integer")],
                func=AFTER_MARK_TRIGGER_FUNC,
            ),
        ]

    project = ForeignKey(Project, on_delete=SET_NULL, null=True, blank=True, db_column="project")
    type = ForeignKey(StateType, on_delete=SET_NULL, null=True, blank=True, db_column="meta")
    """ Meta points to the definition of the attribute field. That is
        a handful of AttributeTypes are associated to a given EntityType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True, default=dict)
    """ Values of user defined attributes. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="state_created_by",
        db_column="created_by",
    )
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="state_modified_by",
        db_column="modified_by",
    )
    version = ForeignKey(Version, on_delete=CASCADE, null=True, blank=False, db_column="version")
    parent = ForeignKey("self", on_delete=SET_NULL, null=True, blank=True, db_column="parent")
    """ Pointer to localization in which this one was generated from """
    media = ManyToManyField(Media, related_name="media")
    localizations = ManyToManyField(Localization)
    segments = JSONField(null=True, blank=True)
    color = CharField(null=True, blank=True, max_length=8)
    frame = PositiveIntegerField(null=True, blank=True)
    extracted = ForeignKey(
        Media,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="extracted",
        db_column="extracted",
    )
    deleted = BooleanField(default=False, db_index=True)
    elemental_id = UUIDField(
        primary_key=False, db_index=True, blank=True, null=True, editable=True, default=uuid.uuid4
    )
    variant_deleted = BooleanField(default=False, null=True, blank=True, db_index=True)
    """ Indicates this is a variant that is deleted """
    mark = PositiveIntegerField(default=0, blank=True)
    """ Mark represents the revision number of the element  """
    latest_mark = PositiveIntegerField(default=0, blank=True, null=True)
    """ Mark represents the latest revision number of the element  """

    @staticmethod
    def selectOnMedia(media_id):
        return State.objects.filter(media__in=media_id)


@receiver(m2m_changed, sender=State.localizations.through)
def calc_segments(sender, **kwargs):
    instance = kwargs["instance"]
    sortedLocalizations = Localization.objects.filter(pk__in=instance.localizations.all()).order_by(
        "frame"
    )

    # Bring up related media to association
    instance.media.set(sortedLocalizations.all().values_list("media", flat=True))
    segmentList = []
    current = [None, None]
    last = None
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


class Leaf(Model, ModelDiffMixin):
    project = ForeignKey(Project, on_delete=SET_NULL, null=True, blank=True, db_column="project")
    type = ForeignKey(LeafType, on_delete=SET_NULL, null=True, blank=True, db_column="meta")
    """ Meta points to the definition of the attribute field. That is
        a handful of AttributeTypes are associated to a given EntityType
        that is pointed to by this value. That set describes the `attribute`
        field of this structure. """
    attributes = JSONField(null=True, blank=True, default=dict)
    """ Values of user defined attributes. """
    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    created_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="leaf_created_by",
        db_column="created_by",
    )
    modified_datetime = DateTimeField(auto_now=True, null=True, blank=True)
    modified_by = ForeignKey(
        User,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name="leaf_modified_by",
        db_column="modified_by",
    )
    parent = ForeignKey("self", on_delete=SET_NULL, blank=True, null=True, db_column="parent")
    path = PathField()
    name = CharField(max_length=255)
    deleted = BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name_plural = "Leaves"

    def __str__(self):
        return str(self.path)

    def depth(self):
        return Leaf.objects.annotate(depth=Depth("path")).get(pk=self.pk).depth

    def subcategories(self, minLevel=1):
        return Leaf.objects.select_related("parent").filter(
            path__descendants=self.path, path__depth__gte=self.depth() + minLevel
        )

    def computePath(self):
        """Returns the string representing the path element"""
        pathStr = self.name.replace(" ", "_").replace("-", "_").replace("(", "_").replace(")", "_")
        if self.parent:
            pathStr = self.parent.computePath() + "." + pathStr
        elif self.project:
            projName = (
                self.project.name.replace(" ", "_")
                .replace("-", "_")
                .replace("(", "_")
                .replace(")", "_")
            )
            pathStr = projName + "." + pathStr
        return pathStr


class Section(Model):
    project = ForeignKey(Project, on_delete=CASCADE, db_column="project")
    name = CharField(max_length=128)
    """ Name of the section.
    """

    path = PathField(null=True, blank=True)
    """ Path of the section. Can only have A-Za-z0-9_- in the path name, versus any ASCII for name """

    lucene_search = CharField(max_length=1024, null=True, blank=True)
    """ Optional lucene query syntax search string.
    """

    object_search = JSONField(null=True, blank=True)
    """
    Object search using a search structure defined as AttributeOperationSpec
    """

    related_object_search = JSONField(null=True, blank=True)
    """
    Object search for using a search struction on related metadata and retreiving the media
    """

    tator_user_sections = CharField(max_length=128, null=True, blank=True)
    """ Identifier used to label media that is part of this section via the
        tator_user_sections attribute. If not set, this search is not scoped
        to a "folder".
    """
    object_search = JSONField(null=True, blank=True)
    """
    Object search using a search structure defined as AttributeOperationSpec
    """
    related_object_search = JSONField(null=True, blank=True)
    """
    Object search for using a search structure on related metadata and retrieving the media
    """
    visible = BooleanField(default=True)
    """ Whether this section should be displayed in the UI.
    """
    elemental_id = UUIDField(
        primary_key=False, db_index=True, editable=True, null=True, blank=True, default=uuid.uuid4
    )
    """ Unique ID for a to facilitate cross-cluster sync operations """

    created_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    """ Time in which the section was created """

    created_by = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, db_column="created_by")

    attributes = JSONField(null=True, blank=True, default=dict)

    explicit_listing = BooleanField(default=False, null=True, blank=True)
    media = ManyToManyField(Media)


class Favorite(Model):
    """Stores an annotation saved by a user."""

    project = ForeignKey(Project, on_delete=CASCADE, db_column="project")
    user = ForeignKey(User, on_delete=CASCADE, db_column="user")
    localization_type = ForeignKey(LocalizationType, on_delete=CASCADE, null=True, blank=True)
    state_type = ForeignKey(StateType, on_delete=CASCADE, null=True, blank=True)
    type = PositiveIntegerField()
    name = CharField(max_length=128)
    page = PositiveIntegerField(default=1)
    values = JSONField()
    entity_type_name = CharField(
        max_length=16,
        choices=[("Localization", "Localization"), ("State", "State")],
        null=True,
        blank=True,
    )


class Bookmark(Model):
    """Stores a link saved by a user."""

    project = ForeignKey(Project, on_delete=CASCADE, db_column="project")
    user = ForeignKey(User, on_delete=CASCADE, db_column="user")
    name = CharField(max_length=128)
    uri = CharField(max_length=1024)
    """ Unique ID for a to facilitate cross-cluster sync operations """


class ChangeLog(Model):
    """Stores individual changesets for entities"""

    project = ForeignKey(Project, on_delete=CASCADE)
    user = ForeignKey(User, on_delete=SET_NULL, null=True)
    modified_datetime = DateTimeField(auto_now_add=True, null=True, blank=True)
    description_of_change = JSONField(encoder=TatorJSONEncoder)
    """
    The description of the change applied. A single object with the keys `old` and `new`, each
    containing a list of objects with the keys `name` and `value`. Each object in the `old` list
    should have a pair in the `new` list (i.e. the same value in the `name` field) with different
    values in the `value` field. For example:
    {
      old: [{
        name: "Species",
        value: "Lobster"
      }, {
        name: "Length",
        value: 31
      }],
      new: [{
        name: "Species",
        value: "Cod"
      }, {
        name: "Length",
        value: 52
      }]
    }
    """


class ChangeToObject(Model):
    """Association table that correlates a ChangeLog object to one or more objects"""

    ref_table = ForeignKey(ContentType, on_delete=SET_NULL, null=True)
    """ The model of the changed object """
    ref_id = PositiveIntegerField()
    """ The id of the changed object """
    change_id = ForeignKey(ChangeLog, on_delete=SET_NULL, null=True)
    """ The change that affected the object """


class Announcement(Model):
    """Message that may be displayed to users."""

    markdown = CharField(max_length=2048)
    """ This text will be displayed using a markdown parser. """
    created_datetime = DateTimeField(auto_now_add=True)
    eol_datetime = DateTimeField()


class AnnouncementToUser(Model):
    """Mapping between announcement and user. The presence of a row in this table
    means an announcement should be displayed to the user.
    """

    announcement = ForeignKey(Announcement, on_delete=CASCADE)
    user = ForeignKey(User, on_delete=CASCADE)


class Dashboard(Model):
    """Standalone HTML page shown as an dashboard/applet within a project."""

    categories = ArrayField(CharField(max_length=128), default=list, null=True)
    """ List of categories associated with the applet. This field is currently ignored. """
    description = CharField(max_length=1024, blank=True)
    """ Description of the applet. """
    html_file = FileField(upload_to=ProjectBasedFileLocation, null=True, blank=True)
    """ Dashboard/Applet's HTML file """
    name = CharField(max_length=128)
    """ Name of the applet """
    project = ForeignKey(Project, on_delete=CASCADE, db_column="project")
    """ Project associated with the applet """
    template = ForeignKey(HostedTemplate, on_delete=SET_NULL, null=True)
    """ Hosted template, if given then `html_file` is ignored. """
    tparams = JSONField(default=dict)
    """ Template parameters, any values set here override default values in
        the HostedTemplate object.
    """
    headers = JSONField(default=dict)
    """ Request headers for hosted template, any values set here override 
        default values in the HostedTemplate object.
    """


def type_to_obj(typeObj):
    """Returns a data object for a given type object"""
    _dict = {
        FileType: File,
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
    d = {}
    for idx, col in enumerate(keys):
        d[col.name] = row[idx]
    return d


def database_qs(qs):
    return database_query(str(qs.query))


def database_query(query):
    from django.db import connection
    import datetime

    with connection.cursor() as d_cursor:
        cursor = d_cursor.cursor
        psycopg2.extras.register_default_jsonb(conn_or_curs=cursor)
        bq = datetime.datetime.now()
        cursor.execute(query)
        aq = datetime.datetime.now()
        l = [make_dict(cursor.description, x) for x in cursor]
        af = datetime.datetime.now()
        logger.info(f"Query = {aq-bq}")
        logger.info(f"List = {af-aq}")
    return l


def database_query_ids(table, ids, order):
    """Given table name and list of IDs, do query using a subquery expression.
    TODO: Is this faster than just using `database_qs()` in conjunction
    with `database_query()`?
    """
    query = (
        f'SELECT * FROM "{table}" WHERE "{table}"."id" IN '
        f'(VALUES ({"), (".join([str(id_) for id_ in ids])})) '
        f"ORDER BY {order}"
    )
    return database_query(query)


class Group(Model):
    """Represents a group of users in an organization, presumably that share access levels"""

    organization = ForeignKey(Organization, on_delete=CASCADE, null=True, blank=True)
    """ Organization that the group belongs to """
    name = CharField(max_length=128)
    """ Descriptive name for the group """


class GroupMembership(Model):
    """Associates a user to a group"""

    project = ForeignKey(Project, on_delete=CASCADE)
    user = ForeignKey(User, on_delete=CASCADE)
    group = ForeignKey(Group, on_delete=CASCADE)
    group_admin = BooleanField(default=False)
    """ Can add/remove people from the group if set to true """
    name = CharField(max_length=128, blank=True, null=True)
    """ Descriptive name for the role of this user in the group """


class RowProtection(Model):
    # Pointer to protected row element, one of the following should be non-null.
    # Note: Currently type objects are protected by project membership status
    project = ForeignKey(Project, on_delete=CASCADE, null=True, blank=True)
    media = ForeignKey(Media, on_delete=CASCADE, null=True, blank=True)
    localization = ForeignKey(Localization, on_delete=CASCADE, null=True, blank=True)
    state = ForeignKey(State, on_delete=CASCADE, null=True, blank=True)
    file = ForeignKey(File, on_delete=CASCADE, null=True, blank=True)
    section = ForeignKey(Section, on_delete=CASCADE, null=True, blank=True)

    # One of the following must be non-null
    user = ForeignKey(User, on_delete=CASCADE, null=True, blank=True)
    """ Pointer to the user this permission/rule refers to """
    organization = ForeignKey(Organization, on_delete=CASCADE, null=True, blank=True)
    """ Pointer to the organization this permission/rule refers to """
    group = ForeignKey(Group, on_delete=CASCADE, null=True, blank=True)
    """ Pointer to the group this permission/rule refers to """

    permission = BigIntegerField(default=0, db_index=True)
    """ Permission bitmask for the row in question
        0 - Can not see
        0x1 - Exist
        0x2 - Read
        0x4 - Write
        0x8 - Full control (ability to delete)
        bits above this are reserved for future use.
    """

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=[
                    "project",
                    "media",
                    "localization",
                    "state",
                    "file",
                    "user",
                    "organization",
                    "group",
                ],
                name="permission_uniqueness_check",
            )
        ]

class HostedTemplate(Model):
    name = CharField(max_length=128)
    """ Name of the template. """
    url = CharField(max_length=2048)
    """ URL where jinja2 template is hosted, must be retrievable with a GET
        using supplied headers."""
    headers = JSONField(default=dict)
    """ Headers to be used in the GET request. """
    tparams = JSONField(default=dict)
    """ Template parameters used to substitute values in the jinja2 template. """
    def __str__(self):
        return self.name

# Structure to handle identifying columns with project-scoped indices
# e.g. Not relaying solely on `db_index=True` in django.
BUILT_IN_INDICES = {
    MediaType: [
        {"name": "$id", "dtype": "native"},
        {"name": "$name", "dtype": "native_string"},
        {"name": "$created_datetime", "dtype": "native"},
        {"name": "$modified_datetime", "dtype": "native"},
        {"name": "tator_user_sections", "dtype": "section"},
        {"name": "tator_user_sections", "dtype": "section_btree"},
        # {"name": "tator_user_sections", "dtype": "section_uuid_btree"}, # This doesn't work well, because we don't enforce uuids well enough, leaving in for growth
        {"name": "$restoration_requested", "dtype": "native"},
        {"name": "$archive_status_date", "dtype": "native"},
        {"name": "$archive_state", "dtype": "native_string"},
    ],
    LocalizationType: [
        {"name": "$id", "dtype": "native"},
        {"name": "$created_datetime", "dtype": "native"},
        {"name": "$modified_datetime", "dtype": "native"},
    ],
    StateType: [
        {"name": "$id", "dtype": "native"},
        {"name": "$created_datetime", "dtype": "native"},
        {"name": "$modified_datetime", "dtype": "native"},
    ],
    LeafType: [
        {"name": "$id", "dtype": "native"},
        {"name": "$name", "dtype": "string"},
        {"name": "$path", "dtype": "string"},
        {"name": "$name", "dtype": "upper_string"},
        {"name": "$path", "dtype": "upper_string"},
    ],
}
