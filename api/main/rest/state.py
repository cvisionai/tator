import logging
import datetime
import itertools

from django.db import transaction
from django.db.models import Max
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.aggregates import ArrayAgg
from django.http import Http404
import numpy as np
import uuid

from ..models import State
from ..models import StateType
from ..models import Media
from ..models import Localization
from ..models import Project
from ..models import Membership
from ..models import Version
from ..models import User
from ..models import InterpolationMethods
from ..schema import StateListSchema
from ..schema import StateDetailSchema, StateByElementalIdSchema
from ..schema import MergeStatesSchema
from ..schema import TrimStateEndSchema
from ..schema.components import state as state_schema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._annotation_query import get_annotation_queryset
from ._attributes import patch_attributes
from ._attributes import bulk_patch_attributes
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

logger = logging.getLogger(__name__)

STATE_PROPERTIES = list(state_schema["properties"].keys())
STATE_PROPERTIES.pop(STATE_PROPERTIES.index("media"))
STATE_PROPERTIES.pop(STATE_PROPERTIES.index("localizations"))


def _fill_m2m(response_data):
    # Get many to many fields.
    state_ids = set([state["id"] for state in response_data])
    localizations = {
        obj["state_id"]: obj["localizations"]
        for obj in State.localizations.through.objects.filter(state__in=state_ids)
        .values("state_id")
        .order_by("state_id")
        .annotate(localizations=ArrayAgg("localization_id"))
        .iterator()
    }
    media = {
        obj["state_id"]: obj["media"]
        for obj in State.media.through.objects.filter(state__in=state_ids)
        .values("state_id")
        .order_by("state_id")
        .annotate(media=ArrayAgg("media_id"))
        .iterator()
    }
    # Copy many to many fields into response data.
    for state in response_data:
        state["localizations"] = localizations.get(state["id"], [])
        state["media"] = media.get(state["id"], [])
    return response_data


class StateListAPI(BaseListView):
    """Interact with list of states.

    A state is a description of a collection of other objects. The objects a state describes
    could be media (image or video), video frames, or localizations. A state referring
    to a collection of localizations is often referred to as a track. States are
    a type of entity in Tator, meaning they can be described by user defined attributes.

    This endpoint supports bulk patch of user-defined state attributes and bulk delete.
    Both are accomplished using the same query parameters used for a GET request.

    It is importarant to know the fields required for a given entity_type_id as they are
    expected in the request data for this function. As an example, if the entity_type_id has
    attribute types associated with it named time and position, the JSON object must have
    them specified as keys.
    """

    schema = StateListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ["get", "post", "patch", "delete", "put"]
    entity_type = StateType  # Needed by attribute filter mixin

    def _get(self, params):
        t0 = datetime.datetime.now()
        qs = get_annotation_queryset(self.kwargs["project"], params, "state")
        response_data = list(qs.values(*STATE_PROPERTIES))

        t1 = datetime.datetime.now()
        response_data = _fill_m2m(response_data)
        if self.request.accepted_renderer.format == "csv":
            # CSV creation requires a bit more
            user_ids = set([d["modified_by"] for d in response_data])
            users = list(User.objects.filter(id__in=user_ids).values("id", "email"))
            email_dict = {}
            for user in users:
                email_dict[user["id"]] = user["email"]

            media_ids = set(media for d in response_data for media in d["media"])
            medias = list(Media.objects.filter(id__in=media_ids).values("id", "name"))
            filename_dict = {media["id"]: media["name"] for media in medias}

            for element in response_data:
                del element["type"]

                oldAttributes = element["attributes"]
                del element["attributes"]
                element.update(oldAttributes)

                user_id = element["modified_by"]
                media_ids = element["media"]

                element["user"] = email_dict[user_id]
                element["media"] = [filename_dict[media_id] for media_id in media_ids]

            if "type" in params:
                type_object = StateType.objects.get(pk=params["type"])
                if (
                    type_object.association == "Frame"
                    and type_object.interpolation == InterpolationMethods.LATEST
                ):
                    for idx, el in enumerate(response_data):
                        mediaEl = Media.objects.get(pk=el["media"])
                        endFrame = 0
                        if idx + 1 < len(response_data):
                            next_element = response_data[idx + 1]
                            endFrame = next_element["frame"]
                        else:
                            endFrame = mediaEl.num_frames
                        el["media"] = mediaEl.name

                        el["endFrame"] = endFrame
                        el["startSeconds"] = int(el["frame"]) * mediaEl.fps
                        el["endSeconds"] = int(el["endFrame"]) * mediaEl.fps
        t2 = datetime.datetime.now()
        logger.info(f"Number of states: {len(response_data)}")
        logger.info(f"Time to get states: {t1-t0}")
        logger.info(f"Time to get states many to many fields: {t2-t1}")
        return response_data

    def _post(self, params):
        # Check that we are getting a state list.
        if "body" in params:
            state_specs = params["body"]
            if not isinstance(state_specs, list):
                state_specs = [state_specs]
        else:
            raise Exception("State creation requires list of states!")

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
                    project=params["project"],
                    number=0,
                )

        # Find unique foreign keys.
        meta_ids = set([state["type"] for state in state_specs])
        version_ids = set([state.get("version", None) for state in state_specs])
        version_ids.add(default_version.id)
        localization_ids = set()
        media_ids = set()
        for state_spec in state_specs:
            localization_ids.update(state_spec.get("localization_ids", []))
            media_ids.update(state_spec["media_ids"])

        # Make foreign key querysets.
        meta_qs = StateType.objects.filter(pk__in=meta_ids)
        version_qs = Version.objects.filter(pk__in=version_ids)
        localization_qs = Localization.objects.filter(pk__in=localization_ids)
        media_qs = Media.objects.filter(pk__in=media_ids)

        # Construct foreign key dictionaries.
        project = Project.objects.get(pk=params["project"])
        metas = {obj.id: obj for obj in meta_qs.iterator()}
        versions = {obj.id: obj for obj in version_qs.iterator()}
        versions[None] = default_version

        # Make sure project of all foreign keys is correct.
        meta_projects = list(meta_qs.values_list("project", flat=True).distinct())
        version_projects = list(version_qs.values_list("project", flat=True).distinct())
        localization_projects = list(localization_qs.values_list("project", flat=True).distinct())
        media_projects = list(media_qs.values_list("project", flat=True).distinct())
        if len(meta_projects) != 1:
            raise Exception(
                f"Localization types must be part of project {project.id}, got "
                f"projects {meta_projects}!"
            )
        elif meta_projects[0] != project.id:
            raise Exception(
                f"Localization types must be part of project {project.id}, got "
                f"project {meta_projects[0]}!"
            )
        if len(version_projects) != 1:
            raise Exception(
                f"Versions must be part of project {project.id}, got projects "
                f"{version_projects}!"
            )
        elif version_projects[0] != project.id:
            raise Exception(
                f"Versions must be part of project {project.id}, got project "
                f"{version_projects[0]}!"
            )
        if len(localization_ids) > 0:
            if len(localization_projects) != 1:
                raise Exception(
                    f"Localizations must be part of project {project.id}, got projects "
                    f"{localization_projects}!"
                )
            elif localization_projects[0] != project.id:
                raise Exception(
                    f"Localizations must be part of project {project.id}, got project "
                    f"{localization_projects[0]}!"
                )
        if len(media_projects) != 1:
            raise Exception(
                f"Media must be part of project {project.id}, got projects " f"{media_projects}!"
            )
        elif media_projects[0] != project.id:
            raise Exception(
                f"Media must be part of project {project.id}, got project " f"{media_projects[0]}!"
            )

        # Get required fields for attributes.
        required_fields = {id_: computeRequiredFields(metas[id_]) for id_ in meta_ids}
        attr_specs = [
            check_required_fields(
                required_fields[state["type"]][0], required_fields[state["type"]][2], state
            )
            for state in state_specs
        ]

        # Create the state objects.
        objs = (
            State(
                project=project,
                type=metas[state_spec["type"]],
                attributes=attrs,
                created_by=compute_user(
                    project, self.request.user, state_spec.get("user_elemental_id", None)
                ),
                modified_by=compute_user(
                    project, self.request.user, state_spec.get("user_elemental_id", None)
                ),
                version=versions[state_spec.get("version", None)],
                frame=state_spec.get("frame", None),
                parent=construct_parent_from_spec(state_spec, State),
                elemental_id=construct_elemental_id_from_spec(state_spec, State),
            )
            for state_spec, attrs in zip(state_specs, attr_specs)
        )
        states = bulk_create_from_generator(objs, State)

        # Create media relations.
        media_relations = []
        for state, state_spec in zip(states, state_specs):
            for media_id in state_spec["media_ids"]:
                media_states = State.media.through(
                    state_id=state.id,
                    media_id=media_id,
                )
                media_relations.append(media_states)
                if len(media_relations) > 1000:
                    State.media.through.objects.bulk_create(media_relations, ignore_conflicts=True)
                    media_relations = []
        State.media.through.objects.bulk_create(media_relations, ignore_conflicts=True)

        # Create localization relations.
        loc_relations = []
        for state, state_spec in zip(states, state_specs):
            if "localization_ids" in state_spec:
                for localization_id in state_spec["localization_ids"]:
                    loc_states = State.localizations.through(
                        state_id=state.id,
                        localization_id=localization_id,
                    )
                    loc_relations.append(loc_states)
                    if len(loc_relations) > 1000:
                        State.localizations.through.objects.bulk_create(
                            loc_relations, ignore_conflicts=True
                        )
                        loc_relations = []
        State.localizations.through.objects.bulk_create(loc_relations, ignore_conflicts=True)

        # Calculate segments (this is not triggered for bulk created m2m).
        localization_ids = set(
            itertools.chain(*[state_spec.get("localization_ids", []) for state_spec in state_specs])
        )
        loc_id_to_frame = {
            loc["id"]: loc["frame"]
            for loc in Localization.objects.filter(pk__in=localization_ids)
            .values("id", "frame")
            .iterator()
        }
        for state, state_spec in zip(states, state_specs):
            frames = [loc_id_to_frame[loc_id] for loc_id in state_spec.get("localization_ids", [])]
            if len(frames) > 0:
                frames = np.sort(frames)
                segments = np.split(frames, np.where(np.diff(frames) != 1)[0] + 1)
                state.segments = [[int(segment[0]), int(segment[-1])] for segment in segments]
        State.objects.bulk_update(states, ["segments"])

        ids = bulk_log_creation(states, project, self.request.user)

        return {"message": f"Successfully created {len(ids)} states!", "id": ids}

    def _delete(self, params):
        qs = get_annotation_queryset(params["project"], params, "state")
        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(
                f"Safety check failed - expected {expected_count} but would delete {count}"
            )
        if count > 0:
            if params["prune"] == 1:
                # Delete states.
                bulk_delete_and_log_changes(qs, params["project"], self.request.user)
            else:
                if params.get("in_place", 0):
                    bulk_update_and_log_changes(
                        qs,
                        params["project"],
                        self.request.user,
                        update_kwargs={"variant_deleted": True, "modifed_by": self.request.user},
                        new_attributes=None,
                    )
                else:
                    objs = []
                    for original in qs.iterator():
                        original.pk = None
                        original.id = None
                        original.variant_deleted = True
                        original.modified_by = self.request.user
                        objs.append(original)
                    State.objects.bulk_create(objs)

        return {"message": f"Successfully deleted {count} states!"}

    def _patch(self, params):
        if params.get("ids", []) != [] or params.get("user_elemental_id", None):
            params["show_all_marks"] = 1
            params["in_place"] = 1
        qs = get_annotation_queryset(params["project"], params, "state")
        patched_version = params.pop("new_version", None)
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
            new_attrs = validate_attributes(params, qs[0])
            update_kwargs = {"modified_by": self.request.user}
            if params.get("new_elemental_id", None) is not None:
                update_kwargs["elemental_id"] = params["new_elemental_id"]
            if params.get("user_elemental_id", None):
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
                many_to_many = []
                origin_datetimes = []

                for original in qs.iterator():
                    many_to_many.append((original.media.all(), original.localizations.all()))
                    original.pk = None
                    original.id = None
                    for key, value in update_kwargs.items():
                        setattr(original, key, value)
                    original.attributes.update(new_attrs)
                    objs.append(original)
                    origin_datetimes.append(original.created_datetime)
                new_objs = State.objects.bulk_create(objs)
                for p_obj, m2m, origin_datetime in zip(new_objs, many_to_many, origin_datetimes):
                    p_obj.media.set(m2m[0])
                    p_obj.localizations.set(m2m[1])

                    # Django doesn't let you fix created_datetime unless you fetch the object again
                    found_it = State.objects.get(pk=p_obj.pk)
                    found_it.created_datetime = origin_datetime
                    found_it.save()

        return {"message": f"Successfully updated {count} states!"}

    def _put(self, params):
        """Retrieve list of states by ID."""
        return self._get(params)


class StateDetailBaseAPI(BaseDetailView):
    """Interact with an individual state.

    A state is a description of a collection of other objects. The objects a state describes
    could be media (image or video), video frames, or localizations. A state referring
    to a collection of localizations is often referred to as a track. States are
    a types of entity in Tator, meaning they can be described by user defined attributes.
    """

    def get_qs(self, params, qs):
        if not qs.exists():
            raise Http404
        state = qs.values(*STATE_PROPERTIES)[0]
        # Get many to many fields.
        state["localizations"] = list(
            State.localizations.through.objects.filter(state_id=state["id"]).aggregate(
                localizations=ArrayAgg("localization_id")
            )["localizations"]
        )
        state["media"] = list(
            State.media.through.objects.filter(state_id=state["id"]).aggregate(
                media=ArrayAgg("media_id")
            )["media"]
        )
        return state

    def patch_qs(self, params, qs):
        if not qs.exists():
            raise Http404
        obj = qs[0]
        model_dict = obj.model_dict
        association_type = obj.type.association

        # If this is a really old object, it may not have an elemental_id
        # but we need to add it for trigger support
        if obj.elemental_id == None:
            obj.elemental_id = uuid.uuid4()
            obj.save()

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

        if "frame" in params:
            obj.frame = params["frame"]

        if "media_ids" in params:
            media_elements = Media.objects.filter(pk__in=params["media_ids"])
            obj.media.set(media_elements)
            if association_type != "Media":
                logger.warning(
                    f"Media set on state {obj.id} of type {association_type}."
                    "This is not a Media type state."
                )

        if "localization_ids" in params:
            localizations = Localization.objects.filter(pk__in=params["localization_ids"])
            obj.localizations.set(localizations)
            if association_type != "Localization":
                logger.warning(
                    f"Media set on state {obj.id} of type {association_type}."
                    "This is not a Media type state."
                )

        if "localization_ids_add" in params:
            localizations = Localization.objects.filter(pk__in=params["localization_ids_add"])
            obj.localizations.add(*list(localizations))
            if association_type != "Localization":
                logger.warning(
                    f"Media set on state {obj.id} of type {association_type}."
                    "This is not a Media type state."
                )

        if "localization_ids_remove" in params:
            localizations = Localization.objects.filter(pk__in=params["localization_ids_remove"])
            obj.localizations.remove(*list(localizations))
            if association_type != "Localization":
                logger.warning(
                    f"Media set on state {obj.id} of type {association_type}."
                    "This is not a Media type state."
                )

        if params.get("user_elemental_id", None):
            params["in_place"] = 1
            computed_author = compute_user(
                obj.project.pk, self.request.user, params.get("user_elemental_id", None)
            )
            obj.created_by = computed_author

        # Make sure media and localizations are part of this project.
        media_qs = Media.objects.filter(pk__in=obj.media.all())
        localization_qs = Localization.objects.filter(pk__in=obj.localizations.all())
        media_projects = list(media_qs.values_list("project", flat=True).distinct())
        localization_projects = list(localization_qs.values_list("project", flat=True).distinct())
        if obj.localizations.count() > 0:
            if len(localization_projects) != 1:
                raise Exception(
                    f"Localizations must be part of project {obj.project.id}, got projects "
                    f"{localization_projects}!"
                )
            elif localization_projects[0] != obj.project.id:
                raise Exception(
                    f"Localizations must be part of project {obj.project.id}, got project "
                    f"{localization_projects[0]}!"
                )
        if obj.media.count() > 0:
            if len(media_projects) != 1:
                raise Exception(
                    f"Media must be part of project {obj.project.id}, got projects "
                    f"{media_projects}!"
                )
            elif media_projects[0] != obj.project.id:
                raise Exception(
                    f"Media must be part of project {obj.project.id}, got project "
                    f"{media_projects[0]}!"
                )

        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)
        # Update modified_by to be the last user
        obj.modified_by = self.request.user

        if params.get("elemental_id", None) is not None:
            obj.elemental_id = params["elemental_id"]

        if params.get("in_place", 0):
            obj.save()
            log_changes(obj, model_dict, obj.project, self.request.user)
        else:
            old_media = obj.media.all()
            old_localizations = obj.localizations.all()
            # Save edits as new object, mark is calculated in trigger
            obj.id = None
            obj.pk = None
            origin_datetime = obj.created_datetime
            obj.modified_by = self.request.user
            obj.save()
            found_it = State.objects.get(pk=obj.pk)
            # Keep original creation time
            found_it.created_datetime = origin_datetime
            found_it.save()
            found_it.media.set(old_media)
            found_it.localizations.set(old_localizations)

        return {
            "message": f"State {obj.elemental_id}@{obj.version.id}/{obj.mark} successfully updated!",
            "object": type(obj).objects.filter(pk=obj.pk).values(*STATE_PROPERTIES)[0],
        }

    def delete_qs(self, params, qs):
        if not qs.exists():
            raise Http404
        state = qs[0]
        if state.elemental_id == None:
            state.elemental_id = uuid.uuid4()
            state.save()
        elemental_id = state.elemental_id
        version_id = state.version.id
        mark = state.mark
        project = state.project
        obj_id = state.id
        delete_localizations = []
        if state.type.delete_child_localizations:
            # Only delete localizations that are not not a part of other states
            for loc in state.localizations.all():
                loc_qs = Localization.state_set.through.objects.filter(
                    localization_id=loc.id
                ).exclude(state_id=state.id)

                if not loc_qs.exists():
                    delete_localizations.append(loc.id)

        if params["prune"] == 1:
            delete_and_log_changes(state, project, self.request.user)
            qs = Localization.objects.filter(pk__in=delete_localizations)
            bulk_delete_and_log_changes(qs, project, self.request.user)
        else:
            if params["pedantic"] and (state.mark != state.latest_mark):
                raise ValueError(
                    f"Pedantic mode is enabled. Can not edit prior object {state.pk}, must only edit latest mark on version."
                    f"Object is mark {state.mark} of {state.latest_mark} for {state.version.name}/{state.elemental_id}"
                )
            state.pk = None
            state.variant_deleted = True
            state.save()
            obj_id = state.pk
            log_changes(state, state.model_dict, state.project, self.request.user)
            qs = Localization.objects.filter(pk__in=delete_localizations)
            bulk_update_and_log_changes(
                qs,
                project,
                self.request.user,
                update_kwargs={"variant_deleted": True},
                new_attributes=None,
            )

        return {
            "message": f"State {version_id}/{elemental_id}@@{mark} successfully deleted!",
            "id": obj_id,
        }

    def get_queryset(self):
        return State.objects.all()


class MergeStatesAPI(BaseDetailView):
    """#TODO"""

    schema = MergeStatesSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "id"
    http_method_names = ["patch"]

    @transaction.atomic
    def _patch(self, params: dict) -> dict:
        obj = State.objects.get(pk=params["id"])
        otherObj = State.objects.get(pk=params["merge_state_id"])
        localizations = otherObj.localizations.all()
        localization_ids = list(localizations.values_list("id", flat=True))
        obj.localizations.add(*localization_ids)
        obj.save()

        otherObj.delete()

        return {
            "message": f'Localizations from state {params["merge_state_id"]} has been merged into {params["id"]}. State {params["merge_state_id"]} has been deleted.'
        }

    def get_queryset(self):
        return State.objects.all()


class TrimStateEndAPI(BaseDetailView):
    """#TODO"""

    schema = TrimStateEndSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "id"
    http_method_names = ["patch"]

    @transaction.atomic
    def _patch(self, params: dict) -> dict:
        obj = State.objects.get(pk=params["id"], deleted=False)
        localizations = obj.localizations.order_by("frame")

        if params["endpoint"] == "start":
            keep_localization = lambda frame: frame >= params["frame"]

        elif params["endpoint"] == "end":
            keep_localization = lambda frame: frame <= params["frame"]

        else:
            raise ValueError("ERROR: Invalid endpoint parameter provided.")

        localizations_to_remove = []
        for loc in localizations:
            if not keep_localization(frame=loc.frame):
                localizations_to_remove.append(loc.id)

        localizations = Localization.objects.filter(pk__in=localizations_to_remove)
        obj.localizations.remove(*list(localizations))
        obj.save()

        deleted_localizations = []
        for loc_id in localizations_to_remove:
            qs = State.objects.filter(localizations__pk=loc_id)
            if not qs.exists():
                deleted_localizations.append(loc_id)

        qs = Localization.objects.filter(pk__in=deleted_localizations)
        qs._raw_delete(qs.db)

        return {
            "message": f'State {params["id"]} has been updated. Deleted {len(deleted_localizations)} localizations.'
        }

    def get_queryset(self):
        return State.objects.all()


class StateDetailAPI(StateDetailBaseAPI):
    """Interact with an individual state.

    A state is a description of a collection of other objects. The objects a state describes
    could be media (image or video), video frames, or localizations. A state referring
    to a collection of localizations is often referred to as a track. States are
    a types of entity in Tator, meaning they can be described by user defined attributes.
    """

    schema = StateDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "elemental_id"
    http_method_names = ["get", "patch", "delete"]

    def _get(self, params):
        qs = State.objects.filter(pk=params["id"], deleted=False)
        return self.get_qs(params, qs)

    @transaction.atomic
    def _patch(self, params):
        qs = State.objects.filter(pk=params["id"], deleted=False)
        return self.patch_qs(params, qs)

    def _delete(self, params):
        qs = State.objects.filter(pk=params["id"], deleted=False)
        return self.delete_qs(params, qs)


class StateDetailByElementalIdAPI(StateDetailBaseAPI):
    """Interact with an individual state.

    A state is a description of a collection of other objects. The objects a state describes
    could be media (image or video), video frames, or localizations. A state referring
    to a collection of localizations is often referred to as a track. States are
    a types of entity in Tator, meaning they can be described by user defined attributes.
    """

    schema = StateByElementalIdSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "elemental_id"
    http_method_names = ["get", "patch", "delete"]

    def calculate_queryset(self, params):
        include_deleted = False
        if params.get("prune", None) == 1:
            include_deleted = True
        qs = State.objects.filter(elemental_id=params["elemental_id"], version=params["version"])
        if include_deleted is False:
            qs = qs.filter(deleted=False)

        # Get the latest mark or the one that is supplied by the user
        mark_version = params.get("mark", None)
        if mark_version is not None:
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
