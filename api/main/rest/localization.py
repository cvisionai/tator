import logging
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
from ..schema import LocalizationListSchema
from ..schema import LocalizationDetailSchema, LocalizationByElementalIdSchema
from ..schema.components import localization as localization_schema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._annotation_query import get_annotation_queryset
from ._attributes import patch_attributes
from ._attributes import validate_attributes
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
)
from ._permissions import ProjectEditPermission

import uuid

logger = logging.getLogger(__name__)

LOCALIZATION_PROPERTIES = list(localization_schema["properties"].keys())


class LocalizationListAPI(BaseListView):
    """Interact with list of localizations.

    Localizations are shape annotations drawn on a video or image. They are currently of type
    box, line, or dot. Each shape has slightly different data members. Localizations are
    a type of entity in Tator, meaning they can be described by user defined attributes.

    This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
    Both are accomplished using the same query parameters used for a GET request.
    """

    schema = LocalizationListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ["get", "post", "patch", "delete", "put"]
    entity_type = LocalizationType  # Needed by attribute filter mixin

    def _get(self, params):
        logger.info("PARAMS=%s", params)
        qs = get_annotation_queryset(self.kwargs["project"], params, "localization")
        response_data = list(qs.values(*LOCALIZATION_PROPERTIES))

        # Adjust fields for csv output.
        if self.request.accepted_renderer.format == "csv":
            # CSV creation requires a bit more
            user_ids = set([d["user"] for d in response_data])
            users = list(User.objects.filter(id__in=user_ids).values("id", "email"))
            email_dict = {}
            for user in users:
                email_dict[user["id"]] = user["email"]

            media_ids = set([d["media"] for d in response_data])
            medias = list(Media.objects.filter(id__in=media_ids).values("id", "name"))
            filename_dict = {}
            for media in medias:
                filename_dict[media["id"]] = media["name"]

            for element in response_data:
                del element["type"]

                oldAttributes = element["attributes"]
                del element["attributes"]
                element.update(oldAttributes)

                user_id = element["user"]
                media_id = element["media"]

                element["user"] = email_dict[user_id]
                element["media"] = filename_dict[media_id]
        return response_data

    def _post(self, params):
        # Check that we are getting a localization list.
        try:
            loc_specs = params["body"]
        except KeyError as exc:
            raise RuntimeError("Localization creation requires list of localizations!") from exc
        if not isinstance(loc_specs, list):
            loc_specs = [loc_specs]

        project = params["project"]

        # Get a default version.
        membership = Membership.objects.get(user=self.request.user, project=params["project"])
        if membership.default_version:
            default_version = membership.default_version
        else:
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
        qs = get_annotation_queryset(params["project"], params, "localization")
        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(
                f"Safety check failed - expected {expected_count} but would delete {count}"
            )
        if count > 0:
            if params["prune"] == 1:
                # Delete the localizations.
                bulk_delete_and_log_changes(qs, params["project"], self.request.user)
            else:
                if params.get("in_place", 0):
                    bulk_update_and_log_changes(
                        qs,
                        params["project"],
                        self.request.user,
                        update_kwargs={"variant_deleted": True},
                        new_attributes=None,
                    )
                else:
                    objs = []
                    for original in qs.iterator():
                        original.pk = None
                        original.id = None
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
        qs = get_annotation_queryset(params["project"], params, "localization")
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
                    new_obj.created_datetime = origin_datetime
                    new_obj.save()

        return {"message": f"Successfully updated {count} localizations!"}

    def _put(self, params):
        """Retrieve list of localizations by ID."""
        return self._get(params)


class LocalizationDetailBaseAPI(BaseDetailView):
    """Interact with single localization.

    Localizations are shape annotations drawn on a video or image. They are currently of type
    box, line, or dot. Each shape has slightly different data members. Localizations are
    a type of entity in Tator, meaning they can be described by user defined attributes.
    """

    schema = LocalizationDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

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
            thumbnail_image = params.get("thumbnail_image", None)
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

            if thumbnail_image:
                try:
                    thumbnail_obj = Media.objects.get(pk=thumbnail_image)
                except Media.DoesNotExist:
                    logger.error("Bad thumbnail reference given")
                else:
                    obj.thumbnail_image = thumbnail_obj
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
            "object": type(obj).objects.filter(pk=obj.pk).values(*LOCALIZATION_PROPERTIES)[0],
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
        if params["prune"] == 1:
            delete_and_log_changes(obj, obj.project, self.request.user)
        else:
            if params["pedantic"] and (obj.mark != obj.latest_mark):
                raise ValueError(
                    f"Pedantic mode is enabled. Can not edit prior object {obj.pk}, must only edit latest mark on version."
                    f"Object is mark {obj.mark} of {obj.latest_mark} for {obj.version.name}/{obj.elemental_id}"
                )
            b = qs[0]
            b.pk = None
            b.variant_deleted = True
            b.save()
            obj_id = b.id
            log_changes(b, b.model_dict, b.project, self.request.user)
        return {
            "message": f"Localization {version_id}/{elemental_id}@@{mark} successfully deleted!",
            "id": obj_id,
        }

    def get_queryset(self):
        return Localization.objects.all()


class LocalizationDetailAPI(LocalizationDetailBaseAPI):
    """Interact with single localization.

    Localizations are shape annotations drawn on a video or image. They are currently of type
    box, line, or dot. Each shape has slightly different data members. Localizations are
    a type of entity in Tator, meaning they can be described by user defined attributes.
    """

    schema = LocalizationDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def _get(self, params):
        qs = Localization.objects.filter(pk=params["id"], deleted=False)
        return self.get_qs(params, qs)

    @transaction.atomic
    def _patch(self, params):
        qs = Localization.objects.filter(pk=params["id"], deleted=False)
        return self.patch_qs(params, qs)

    def _delete(self, params):
        qs = Localization.objects.filter(pk=params["id"], deleted=False)
        return self.delete_qs(params, qs)


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

    def calculate_queryset(self, params):
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
        if mark_version:
            qs = qs.filter(mark=mark_version)
        else:
            latest_mark = qs.aggregate(value=Max("mark"))
            qs = qs.filter(mark=latest_mark["value"])
        return qs

    def _get(self, params):
        qs = self.calculate_queryset(params)
        return self.get_qs(params, qs)

    @transaction.atomic
    def _patch(self, params):
        qs = self.calculate_queryset(params)
        return self.patch_qs(params, qs)

    def _delete(self, params):
        qs = self.calculate_queryset(params)
        return self.delete_qs(params, qs)
