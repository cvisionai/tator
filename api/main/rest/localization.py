import logging
from collections import defaultdict
from django.db.models import Max
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from ..models import Localization
from ..models import LocalizationType
from ..models import Media
from ..models import Membership
from ..models import User
from ..models import Project
from ..models import Version
from ..models import Section
from ..schema import LocalizationListSchema
from ..schema import LocalizationDetailSchema, LocalizationByElementalIdSchema
from ..schema.components import localization as localization_schema

from .._permission_util import augment_permission

from ._base_views import StreamingListView
from ._base_views import BaseDetailView
from ._annotation_query import get_annotation_queryset
from ._attributes import patch_attributes
from ._attributes import validate_attributes
from django.db.models import F
from ._util import (
    bulk_create_from_generator,
    bulk_delete_and_log_changes,
    bulk_log_creation,
    bulk_update_and_log_changes,
    computeRequiredFields,
    check_required_fields,
    delete_and_log_changes,
    log_changes,
    construct_elemental_id_from_spec,
    construct_parent_from_spec,
    compute_user,
    optimize_qs,
)
from ._permissions import ProjectEditPermission, ProjectViewOnlyPermission

import uuid
import ujson

logger = logging.getLogger(__name__)

LOCALIZATION_PROPERTIES = list(localization_schema["properties"].keys())

import os


class LocalizationListAPI(StreamingListView):
    """Interact with list of localizations.

    Localizations are shape annotations drawn on a video or image. They are currently of type
    box, line, or dot. Each shape has slightly different data members. Localizations are
    a type of entity in Tator, meaning they can be described by user defined attributes.

    This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
    Both are accomplished using the same query parameters used for a GET request.
    """

    schema = LocalizationListSchema()
    http_method_names = ["get", "post", "patch", "delete", "put"]
    entity_type = LocalizationType  # Needed by attribute filter mixin

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def get_queryset(self, override_params={}):
        params = {**self.params}
        params.update(override_params)
        return self.filter_only_viewables(
            get_annotation_queryset(self.params["project"], params, "localization")
        )

    def get_model(self):
        return Localization

    def _get(self, params):
        qs = self.get_queryset()
        partial_fields_selected = None
        fields = LOCALIZATION_PROPERTIES
        if params.get("fields") is not None:
            fields = []
            fields_param = params.get('fields', '').split(',')
            
            for field in fields_param:
                if len(field.split('.')) > 1:
                    if partial_fields_selected is None:
                        partial_fields_selected = defaultdict(set)
                    partial_fields_selected[field.split('.')[0]].add(field.split('.')[1])
                else:
                    fields.append(field)
        qs,new_fields,new_annotations = optimize_qs(Localization, qs, fields, partial_fields = partial_fields_selected)

        if self.request.accepted_renderer.format == "json":
            yield '['
            first_one=True
            for element in qs.iterator():
                if first_one == False:
                    yield ',' + ujson.dumps(element)
                else:
                    first_one = False
                    yield ujson.dumps(element)
            yield ']'

        elif self.request.accepted_renderer.format == "jsonl":
            for element in qs.values().iterator():
                yield ujson.dumps(element) + '\n'
        # Adjust fields for csv output.
        elif self.request.accepted_renderer.format == "csv":
            # CSV creation requires a bit more
            # work to get the right fields
            new_fields.remove("user")
            new_fields.remove("media")
            qs = qs.values([*new_fields,*new_annotations])
            qs = qs.annotate(user=F('user__email'), media=F('media__name'))
            attr_types = qs.values("type__attribute_types")
            attr_name_set = set()
            for x in attr_types:
                type_defs = x['type__attribute_types']
                if type_defs:
                    attr_name_set.update([attr['name'] for attr in type_defs])
            first_one = True
            for element in qs.iterator():
                for k in attr_name_set:
                    element[k] = str(element['attributes'].get(k,""))
                del element["attributes"]
                if first_one:
                    first_one = False
                    yield ",".join(element.keys()) + "\n"

                yield ",".join([str(v) for v in element.values()]) + "\n"

    def _post(self, params):
        # Check that we are getting a localization list.
        try:
            loc_specs = params["body"]
        except KeyError as exc:
            raise RuntimeError("Localization creation requires list of localizations!") from exc
        if not isinstance(loc_specs, list):
            loc_specs = [loc_specs]

        project = params["project"]

        default_version = None

        if os.getenv("TATOR_FINE_GRAIN_PERMISSION", None) != "true":
            # Get a default version.
            membership = Membership.objects.get(user=self.request.user, project=params["project"])
            if membership.default_version:
                default_version = membership.default_version

        if not default_version:
            default_version = Version.objects.filter(
                project=params["project"], number__gte=0
            ).order_by("number")
            if default_version.exists():
                default_version = default_version[0]
            else:
                # If no versions exist, create one.
                default_version = Version.objects.create(
                    name="Baseline",
                    description="Initial version",
                    project=project,
                    number=0,
                )

        # Find unique foreign keys.
        meta_ids = set([loc["type"] for loc in loc_specs])
        media_ids = set([loc["media_id"] for loc in loc_specs])
        version_ids = set([loc.get("version", None) for loc in loc_specs])
        version_ids.add(default_version.id)

        # Make foreign key querysets.
        meta_qs = LocalizationType.objects.filter(pk__in=meta_ids)
        media_qs = Media.objects.filter(pk__in=media_ids)
        version_qs = Version.objects.filter(pk__in=version_ids)

        # Construct foreign key dictionaries.
        project = Project.objects.get(pk=params["project"])
        metas = {obj.id: obj for obj in meta_qs.iterator()}
        medias = {obj.id: obj for obj in media_qs.iterator()}
        versions = {obj.id: obj for obj in version_qs.iterator()}
        versions[None] = default_version

        # Make sure project of all foreign keys is correct.
        meta_projects = list(meta_qs.values_list("project", flat=True).distinct())
        media_projects = list(media_qs.values_list("project", flat=True).distinct())
        version_projects = list(version_qs.values_list("project", flat=True).distinct())
        if len(meta_projects) != 1:
            raise RuntimeError(
                f"Localization types must be part of project {project.id}, got "
                f"projects {meta_projects}!"
            )
        if meta_projects[0] != project.id:
            raise RuntimeError(
                f"Localization types must be part of project {project.id}, got "
                f"project {meta_projects[0]}!"
            )
        if len(media_projects) != 1:
            raise RuntimeError(
                f"Media must be part of project {project.id}, got projects " f"{media_projects}!"
            )
        if media_projects[0] != project.id:
            raise RuntimeError(
                f"Media must be part of project {project.id}, got project " f"{media_projects[0]}!"
            )
        if len(version_projects) != 1:
            raise RuntimeError(
                f"Versions must be part of project {project.id}, got projects {version_projects}!"
            )
        if version_projects[0] != project.id:
            raise RuntimeError(
                f"Versions must be part of project {project.id}, got project {version_projects[0]}!"
            )

        # Get required fields for attributes.
        required_fields = {id_: computeRequiredFields(metas[id_]) for id_ in meta_ids}
        attr_specs = [
            check_required_fields(
                required_fields[loc["type"]][0], required_fields[loc["type"]][2], loc
            )
            for loc in loc_specs
        ]

        # Create the localization objects.
        objs = (
            Localization(
                project=project,
                type=metas[loc_spec["type"]],
                media=medias[loc_spec["media_id"]],
                user=compute_user(
                    project, self.request.user, loc_spec.get("user_elemental_id", None)
                ),
                attributes=attrs,
                created_by=compute_user(
                    project, self.request.user, loc_spec.get("user_elemental_id", None)
                ),
                modified_by=compute_user(
                    project, self.request.user, loc_spec.get("user_elemental_id", None)
                ),
                version=versions[loc_spec.get("version", None)],
                parent=construct_parent_from_spec(loc_spec, Localization),
                x=loc_spec.get("x", None),
                y=loc_spec.get("y", None),
                u=loc_spec.get("u", None),
                v=loc_spec.get("v", None),
                width=loc_spec.get("width", None),
                height=loc_spec.get("height", None),
                points=loc_spec.get("points", None),
                frame=loc_spec.get("frame", None),
                elemental_id=construct_elemental_id_from_spec(loc_spec, Localization),
            )
            for loc_spec, attrs in zip(loc_specs, attr_specs)
        )
        localizations = bulk_create_from_generator(objs, Localization)

        ids = bulk_log_creation(localizations, project, self.request.user)

        # Return created IDs.
        return {"message": f"Successfully created {len(ids)} localizations!", "id": ids}

    def _delete(self, params):
        qs = self.get_queryset()
        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(
                f"Safety check failed - expected {expected_count} but would delete {count}"
            )
        if count > 0:
            if params.get("prune") == 1:
                # Delete the localizations.
                bulk_delete_and_log_changes(qs, params["project"], self.request.user)
            else:
                if params.get("in_place", 0):
                    bulk_update_and_log_changes(
                        qs,
                        params["project"],
                        self.request.user,
                        update_kwargs={"modified_by": self.request.user, "variant_deleted": True},
                        new_attributes=None,
                    )
                else:
                    objs = []
                    for original in qs.iterator():
                        original.pk = None
                        original.id = None
                        original.modified_by = self.request.user
                        original.variant_deleted = True
                        objs.append(original)
                    Localization.objects.bulk_create(objs)

        return {"message": f"Successfully deleted {count} localizations!"}

    def _patch(self, params):
        patched_version = params.pop("new_version", None)
        # Adding an id query a
        if params.get("ids", []) != [] or params.get("user_elemental_id", None):
            params["show_all_marks"] = 1
            params["in_place"] = 1
        qs = self.get_queryset()
        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(
                f"Safety check failed - expected {expected_count} but would update {count}"
            )
        if count > 0:
            if qs.values("type").distinct().count() != 1:
                raise ValueError(
                    "When doing a bulk patch the type id of all objects must be the same."
                )
            # Get the current representation of the object for comparison
            new_attrs = validate_attributes(params, qs[0])
            update_kwargs = {"modified_by": self.request.user}
            if params.get("new_elemental_id", None) is not None:
                update_kwargs["elemental_id"] = params["new_elemental_id"]
            if params.get("user_elemental_id", None) is not None:
                computed_author = compute_user(
                    params["project"], self.request.user, params["user_elemental_id"]
                )
                update_kwargs["created_by"] = computed_author
            if patched_version is not None:
                update_kwargs["version"] = patched_version

            if params.get("in_place", 0):
                bulk_update_and_log_changes(
                    qs,
                    params["project"],
                    self.request.user,
                    update_kwargs=update_kwargs,
                    new_attributes=new_attrs,
                )
            else:
                objs = []
                origin_datetimes = []
                for original in qs.iterator():
                    original.pk = None
                    original.id = None
                    for key, value in update_kwargs.items():
                        if key == "version":
                            setattr(original, key, Version.objects.get(pk=value))
                        else:
                            setattr(original, key, value)
                    original.attributes.update(new_attrs)
                    objs.append(original)
                    origin_datetimes.append(original.created_datetime)

                new_objs = Localization.objects.bulk_create(objs)

                for new_obj, origin_datetime in zip(new_objs, origin_datetimes):
                    found_it = Localization.objects.get(pk=new_obj.pk)
                    found_it.created_datetime = origin_datetime
                    found_it.save()

        return {"message": f"Successfully updated {count} localizations!"}

    def _put(self, params):
        """Retrieve list of localizations by ID."""
        return self._get(params)

    def get_parent_objects(self):
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS", "PATCH", "DELETE"]:
            return super().get_parent_objects()
        elif self.request.method in ["POST"]:
            # For POST Localizations/States we need to see what versions/sections are being impacted
            specs = self.params["body"]
            if not isinstance(specs, list):
                specs = [specs]
            version_ids = set([spec.get("version", None) for spec in specs])
            media_ids = set([spec.get("media_id", None) for spec in specs])
            versions = Version.objects.filter(pk__in=version_ids)
            primary_sections = Media.objects.filter(pk__in=media_ids).values("primary_section")
            sections = Section.objects.filter(pk__in=primary_sections)
            return {
                "project": Project.objects.filter(pk=self.params["project"]),
                "version": versions,
                "section": sections,
            }
        else:
            raise ValueError(f"Unsupported method {self.request.method}")


class LocalizationDetailBaseAPI(BaseDetailView):
    """Interact with single localization.

    Localizations are shape annotations drawn on a video or image. They are currently of type
    box, line, or dot. Each shape has slightly different data members. Localizations are
    a type of entity in Tator, meaning they can be described by user defined attributes.
    """

    schema = LocalizationDetailSchema()
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def get_qs(self, params, qs):
        if not qs.exists():
            raise Http404
        return qs.values(*LOCALIZATION_PROPERTIES)[0]

    def patch_qs(self, params, qs):
        if not qs.exists():
            raise Http404
        obj = qs[0]
        model_dict = obj.model_dict

        # If this is a really old object, it may not have an elemental_id
        # but we need to add it for trigger support
        if obj.elemental_id == None:
            obj.elemental_id = uuid.uuid4()
            obj.save()

        # Only allow iterative changes, this has to be changing off the last mark in the version
        if params.get("in_place", 0) == 0 and params["pedantic"] and (obj.mark != obj.latest_mark):
            raise ValueError(
                f"Pedantic mode is enabled. Can not edit prior object {obj.pk}, must only edit latest mark on version."
                f"Object is mark {obj.mark} of {obj.latest_mark} for {obj.version.name}/{obj.elemental_id}"
            )
        elif obj.mark != obj.latest_mark:
            obj = type(obj).objects.get(
                project=obj.project,
                version=obj.version,
                mark=obj.latest_mark,
                elemental_id=obj.elemental_id,
            )

        # Patch common attributes.
        frame = params.get("frame", None)
        version = params.get("version", None)

        if frame is not None:
            obj.frame = frame
        if version is not None:
            obj.version = Version.objects.get(pk=version)

        if params.get("user_elemental_id", None):
            params["in_place"] = 1
            computed_author = compute_user(
                obj.project.pk, self.request.user, params.get("user_elemental_id", None)
            )
            obj.created_by = computed_author
            obj.user = computed_author

        if obj.type.dtype == "box":
            x = params.get("x", None)
            y = params.get("y", None)
            height = params.get("height", None)
            width = params.get("width", None)

            if x is not None:
                obj.x = x
            if y is not None:
                obj.y = y
            if height:
                obj.height = height
            if width:
                obj.width = width

            # If the localization moved; the thumbnail is expired
            if (x or y or height or width) and obj.thumbnail_image:
                obj.thumbnail_image.delete()

        elif obj.type.dtype == "line":
            x = params.get("x", None)
            y = params.get("y", None)
            u = params.get("u", None)
            v = params.get("v", None)
            if x is not None:
                obj.x = x
            if y is not None:
                obj.y = y
            if u:
                obj.u = u
            if v:
                obj.v = v
        elif obj.type.dtype == "dot":
            x = params.get("x", None)
            y = params.get("y", None)
            if x is not None:
                obj.x = x
            if y is not None:
                obj.y = y
        elif obj.type.dtype == "poly":
            points = params.get("points", None)
            if points:
                obj.points = points
        else:
            # TODO: Handle circles.
            pass

        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)

        if params.get("elemental_id", None) is not None:
            obj.elemental_id = params["elemental_id"]

        # Update modified_by to be the last user
        obj.modified_by = self.request.user

        # Patch the thumbnail attributes
        if obj.thumbnail_image:
            obj.thumbnail_image = patch_attributes(new_attrs, obj.thumbnail_image)
            obj.thumbnail_image.save()

        if params.get("in_place", 0):
            obj.save()
            log_changes(obj, model_dict, obj.project, self.request.user)
        else:
            # Only allow iterative changes, this has to be changing off the last mark in the version
            if params.get("pedantic") and (obj.mark != obj.latest_mark):
                raise ValueError(
                    f"Pedantic mode is enabled. Can not edit prior object {obj.pk}, must only edit latest mark on version."
                    f"Object is mark {obj.mark} of {obj.latest_mark} for {obj.version.name}/{obj.elemental_id}"
                )

            # Save edits as new object, mark is calculated in trigger
            obj.id = None
            obj.pk = None
            origin_datetime = obj.created_datetime
            obj.save()
            found_it = Localization.objects.get(pk=obj.pk)
            # Do a double save to keep original creation time
            found_it.created_datetime = origin_datetime
            found_it.save()

        return {
            "message": f"Localization {obj.elemental_id}@{obj.version.id}/{obj.mark} successfully updated!",
            "object": augment_permission(
                self.request.user, type(obj).objects.filter(pk=obj.pk)
            ).values(*LOCALIZATION_PROPERTIES)[0],
        }

    def delete_qs(self, params, qs):
        if not qs.exists():
            raise Http404
        obj = qs[0]
        if obj.elemental_id == None:
            obj.elemental_id = uuid.uuid4()
            obj.save()
        elemental_id = obj.elemental_id
        version_id = obj.version.id
        mark = obj.mark
        obj_id = obj.id
        if params.get("prune") == 1:
            delete_and_log_changes(obj, obj.project, self.request.user)
        else:
            if params.get("pedantic") and (obj.mark != obj.latest_mark):
                raise ValueError(
                    f"Pedantic mode is enabled. Can not edit prior object {obj.pk}, must only edit latest mark on version."
                    f"Object is mark {obj.mark} of {obj.latest_mark} for {obj.version.name}/{obj.elemental_id}"
                )
            b = qs[0]
            b.pk = None
            b.variant_deleted = True
            b.modified_by = self.request.user
            b.save()
            obj_id = b.id
            log_changes(b, b.model_dict, b.project, self.request.user)
        return {
            "message": f"Localization {version_id}/{elemental_id}@@{mark} successfully deleted!",
            "id": obj_id,
        }


class LocalizationDetailAPI(LocalizationDetailBaseAPI):
    """Interact with single localization.

    Localizations are shape annotations drawn on a video or image. They are currently of type
    box, line, or dot. Each shape has slightly different data members. Localizations are
    a type of entity in Tator, meaning they can be described by user defined attributes.
    """

    schema = LocalizationDetailSchema()
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(
            Localization.objects.filter(pk=self.params["id"], deleted=False)
        )

    def _get(self, params):
        return self.get_qs(params, self.get_queryset())

    @transaction.atomic
    def _patch(self, params):
        return self.patch_qs(params, self.get_queryset())

    def _delete(self, params):
        return self.delete_qs(params, self.get_queryset())


class LocalizationDetailByElementalIdAPI(LocalizationDetailBaseAPI):
    """Interact with single localization.

    Localizations are shape annotations drawn on a video or image. They are currently of type
    box, line, or dot. Each shape has slightly different data members. Localizations are
    a type of entity in Tator, meaning they can be described by user defined attributes.
    """

    schema = LocalizationByElementalIdSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "elemental_id"
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self, **kwargs):
        params = self.params
        include_deleted = False
        if params.get("prune", None) == 1:
            include_deleted = True
        qs = Localization.objects.filter(
            elemental_id=params["elemental_id"], version=params["version"]
        )
        if include_deleted is False:
            qs = qs.filter(deleted=False)

        # Get the latest mark or the one that is supplied by the user
        mark_version = params.get("mark", None)
        if mark_version is not None:
            qs = qs.filter(mark=mark_version)
        else:
            latest_mark = qs.aggregate(value=Max("mark"))
            qs = qs.filter(mark=latest_mark["value"])
        return self.filter_only_viewables(qs)

    def _get(self, params):
        return self.get_qs(params, self.get_queryset())

    @transaction.atomic
    def _patch(self, params):
        return self.patch_qs(params, self.get_queryset())

    def _delete(self, params):
        return self.delete_qs(params, self.get_queryset())
