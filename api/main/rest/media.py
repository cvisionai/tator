import logging
import datetime
from itertools import chain
import os
import shutil
import mimetypes
import datetime
import tempfile
from uuid import uuid1, uuid4
from urllib.parse import urlparse

from django.contrib.contenttypes.models import ContentType
from django.db import transaction, connection
from django.db.models import Case, When, TextField, F, DateTimeField, JSONField

from django.db.models.functions import Cast
from django.http import Http404
from django.core.exceptions import PermissionDenied, FieldDoesNotExist
from PIL import Image
import ujson
import time

from ..models import (
    Media,
    MediaType,
    Section,
    Localization,
    State,
    Project,
    Resource,
    Bucket,
    database_qs,
    database_query_ids,
    Version,
)
from .._permission_util import PermissionMask

from ..schema import MediaListSchema, MediaDetailSchema, parse
from ..schema.components import media as media_schema
from ..download import download_file
from ..store import get_tator_store, get_storage_lookup
from ..cache import TatorCache
from ..worker import push_job

# This import is formatted like this to avoid a circular import
import main._import_image

from ._util import (
    bulk_update_and_log_changes,
    bulk_delete_and_log_changes,
    compute_user,
    delete_and_log_changes,
    log_changes,
    log_creation,
    computeRequiredFields,
    check_required_fields,
    url_to_key,
)

from ._base_views import BaseListView, BaseDetailView
from ._media_query import get_media_queryset
from ._attributes import bulk_patch_attributes, patch_attributes, validate_attributes
from ._permissions import (
    ProjectEditPermission,
    ProjectTransferPermission,
    ProjectViewOnlyPermission,
)

logger = logging.getLogger(__name__)

MEDIA_PROPERTIES = list(media_schema["properties"].keys())

from .._permission_util import augment_permission, shift_permission

def optimize_qs(qs, fields):
    new_fields=[*fields]
    annotations = {}
    for field in fields:
        try:
            field_type = type(Media._meta.get_field(field))
            if field_type in [DateTimeField, JSONField]:
                new_fields.remove(field)
                annotations[field] = Cast(field, TextField())
                logger.info(f"Optimizing field {field} to {annotations[field]}")
        except FieldDoesNotExist:
            pass

    return qs.values(*new_fields).annotate(**annotations)

def _sync_section_inputs(params, project):
    if "primary_section" in params:
        section = Section.objects.filter(project=project, pk=params["primary_section"])
        if "attributes" not in params:
            params["attributes"] = {}
        if section.exists():
            params["attributes"]["tator_user_sections"] = section[0].tator_user_sections
        else:
            params["attributes"]["tator_user_sections"] = ""
    elif "attributes" in params:
        if "tator_user_sections" in params["attributes"]:
            section = Section.objects.filter(
                project=project, tator_user_sections=params["attributes"]["tator_user_sections"]
            )
            if section.exists():
                params["primary_section"] = section[0].id
            else:
                params["primary_section"] = -1
    return params


def _get_next_archive_state(desired_archive_state, last_archive_state):
    if desired_archive_state == "to_live":
        if last_archive_state == "archived":
            return "to_live"
        if last_archive_state == "to_archive":
            return "live"
        return None

    if desired_archive_state == "to_archive":
        if last_archive_state == "live":
            return "to_archive"
        if last_archive_state == "to_live":
            return None
        return None

    raise ValueError(f"Received invalid value '{desired_archive_state}' for archive_state")


def _single_ids_from_multi_qs(multi_qs):
    return set(
        ele for id_lst in multi_qs.values_list("media_files__ids", flat=True) for ele in id_lst
    )


def _presign(user_id, expiration, medias, fields=None, no_cache=False):
    """Replaces specified media fields with presigned urls."""
    # First get resources referenced by the given media.
    fields = fields or [
        "archival",
        "streaming",
        "audio",
        "image",
        "thumbnail",
        "thumbnail_gif",
        "attachment",
    ]
    media_ids = set([media["id"] for media in medias])
    resources = Resource.objects.filter(media__in=media_ids)
    store_lookup = get_storage_lookup(resources)
    cache = TatorCache()
    ttl = expiration - 3600

    # Get replace all keys with presigned urls.
    for media in medias:
        if media.get("media_files") is None:
            continue

        for field in fields:
            if field not in media["media_files"]:
                continue

            for media_def in media["media_files"][field]:
                # Get path url
                # If the path is a bona fide URL, don't attempt to presign it
                if urlparse(media_def["path"]).scheme != "":
                    continue
                url = cache.get_presigned(user_id, media_def["path"])
                if no_cache or (url is None):
                    tator_store = store_lookup[media_def["path"]]
                    url = tator_store.get_download_url(media_def["path"], expiration)
                    if ttl > 0 and not no_cache:
                        cache.set_presigned(user_id, media_def["path"], url, ttl)
                media_def["path"] = url
                # Get segment url
                if field == "streaming":
                    if "segment_info" in media_def:
                        url = cache.get_presigned(user_id, media_def["segment_info"])
                        if no_cache or (url is None):
                            tator_store = store_lookup[media_def["segment_info"]]
                            url = tator_store.get_download_url(
                                media_def["segment_info"], expiration
                            )
                            if ttl > 0 and not no_cache:
                                cache.set_presigned(user_id, media_def["segment_info"], url, ttl)
                        media_def["segment_info"] = url
                    else:
                        logger.warning(
                            f"No segment file in media {media['id']} for file {media_def['path']}!"
                        )


def _save_image(url, media_obj, project_obj, role):
    """
    Downloads an image, uploads it to the appropriate S3 location and returns an updated media
    object.
    """
    # Download the image file and load it.
    temp_image = tempfile.NamedTemporaryFile(delete=False)
    download_file(url, temp_image.name)
    image = Image.open(temp_image.name)
    image_format = image.format

    # Get filename from url.
    parsed = os.path.basename(urlparse(url).path)

    # Set up S3 client.
    tator_store = get_tator_store(project_obj.bucket)

    # Upload image.
    if media_obj.media_files is None:
        media_obj.media_files = {}
    image_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{parsed}"
    tator_store.put_object(image_key, temp_image)
    media_obj.media_files[role] = [
        {
            "path": image_key,
            "size": os.stat(temp_image.name).st_size,
            "resolution": [image.height, image.width],
            "mime": f"image/{image_format.lower()}",
        }
    ]

    # Cleanup and return.
    image.close()
    os.remove(temp_image.name)
    Resource.add_resource(image_key, media_obj)
    return media_obj


def get_media_type(project, entity_type, name):
    if int(entity_type) == -1:
        media_types = MediaType.objects.filter(project=project)
        if media_types.count():
            mime, _ = mimetypes.guess_type(name)
            if mime is None:
                ext = os.path.splitext(name)[1].lower()
                if ext in [".mts", ".m2ts"]:
                    mime = "video/MP2T"
                elif ext in [".dng"]:
                    mime = "image/dng"
            if mime.startswith("image"):
                for media_type in media_types:
                    if media_type.dtype == "image":
                        break
            else:
                for media_type in media_types:
                    if media_type.dtype == "video":
                        break
            entity_type = media_type.pk
        else:
            raise RuntimeError("No media types for project")
    else:
        media_type = MediaType.objects.get(pk=int(entity_type))
        if media_type.project.pk != project:
            raise ValueError("Media type is not part of project")

    return media_type, entity_type


def assert_list_of_image_specs(project, param_list):
    """Checks that all media creation specs are of dtype "image" """
    for params in param_list:
        entity_type = params["type"]
        name = params["name"]
        media_type, entity_type = get_media_type(project, entity_type, name)
        if media_type.dtype != "image":
            raise ValueError(
                f"Multiple media creation only supports images, found at least one spec with dtype "
                f"{media_type.dtype}"
            )


def _create_media(project, params, user, use_rq=False):
    """Media POST method in its own function for reuse by Transcode endpoint."""
    # Get common parameters (between video/image).
    entity_type = params["type"]
    section = params.get("section", None)
    section_id = params.get("section_id", None)
    name = params["name"]
    md5 = params["md5"]
    gid = params.get("gid", None)
    uid = params.get("uid", None)
    new_attributes = params.get("attributes", None)
    url = params.get("url", None)
    elemental_id = params.get("elemental_id", uuid4())
    if gid is not None:
        gid = str(gid)
    project_obj = Project.objects.get(pk=project)

    computed_author = compute_user(project, user, params.get("user_elemental_id", None))

    if use_rq and connection.settings_dict["NAME"].find("test") >= 0:
        logger.warning("Refusing to use ASYNC for tests")
        use_rq = False

    # If section does not exist and is not an empty string, create a section.
    tator_user_sections = ""
    section_obj = None
    if section_id:
        section_obj = Section.objects.filter(project=project, pk=section_id, dtype="folder")
        if not section_obj.exists():
            raise ValueError(f"Folder with ID {section_id} does not exist")
        section_obj = section_obj[0]
        tator_user_sections = section_obj.tator_user_sections
    elif section:
        section_obj = Section.objects.filter(project=project, name__iexact=section, dtype="folder")
        if section_obj.exists():
            tator_user_sections = section_obj[0].tator_user_sections
            section_obj = section_obj[0]
        else:
            tator_user_sections = str(uuid1())
            section_obj = Section.objects.create(
                project=project_obj,
                name=section,
                tator_user_sections=tator_user_sections,
                dtype="folder",
            )

    # Get the media type.
    media_type, entity_type = get_media_type(project, entity_type, name)

    # Compute the required fields for posting a media object
    # of this type
    required_fields = computeRequiredFields(media_type)

    # Apply user-supplied attributes and finally fill in
    # defaults and validate
    attributes = check_required_fields(
        [],  # Ignore top-level object
        required_fields[2],
        {"attributes": new_attributes} if new_attributes else {"attributes": {}},
    )

    # Set the tator_user_section special attribute, will get
    # dropped if done prior to check_required_fields.
    attributes.update({"tator_user_sections": tator_user_sections})

    if media_type.dtype == "image":
        # Get image only parameters.
        thumbnail_url = params.get("thumbnail_url")

        # Create the media object.
        media_obj = Media.objects.create(
            project=project_obj,
            type=MediaType.objects.get(pk=entity_type),
            name=name,
            md5=md5,
            attributes=attributes,
            created_by=computed_author,
            modified_by=computed_author,
            gid=gid,
            uid=uid,
            source_url=url,
            elemental_id=elemental_id,
        )
        media_obj.media_files = {}
        media_obj.primary_section = section_obj
        media_obj.save()

        # Set up S3 client.
        tator_store = get_tator_store(project_obj.bucket)

        if url:
            reference_only = params.get("reference_only", 0) == 1
            if use_rq:
                push_job(
                    "image_jobs",
                    main._import_image._import_image,
                    args=(name, url, thumbnail_url, media_obj.id, reference_only),
                )
            else:
                main._import_image._import_image(
                    name, url, thumbnail_url, media_obj.id, reference_only
                )

    else:
        # Create the media object.
        media_obj = Media.objects.create(
            project=project_obj,
            type=MediaType.objects.get(pk=entity_type),
            name=name,
            md5=md5,
            attributes=attributes,
            created_by=computed_author,
            modified_by=computed_author,
            gid=gid,
            uid=uid,
            source_url=url,
            elemental_id=elemental_id,
        )
        media_obj.primary_section = section_obj
        media_obj.save()

        # Add optional parameters.
        for opt_key in ["fps", "num_frames", "codec", "width", "height", "summary_level"]:
            if opt_key in params:
                setattr(media_obj, opt_key, params[opt_key])

        # Use thumbnails if they are given.
        thumbnail_url = params.get("thumbnail_url", None)
        thumbnail_gif_url = params.get("thumbnail_gif_url", None)

        if thumbnail_url is not None:
            media_obj = _save_image(thumbnail_url, media_obj, project_obj, "thumbnail")

        if thumbnail_gif_url is not None:
            media_obj = _save_image(thumbnail_gif_url, media_obj, project_obj, "thumbnail_gif")
        media_obj.save()

        # If this is an upload to Tator, put media ID as object tag.
        if url:
            path, bucket, upload = url_to_key(url, project_obj)
            if path is not None:
                use_upload_bucket = upload and not bucket
                tator_store = get_tator_store(bucket, upload=use_upload_bucket)
                tator_store.put_media_id_tag(path, media_obj.id)

    msg = (
        f"Media object {media_obj.id} created for {media_type.dtype} {name} "
        f"on project {media_type.project.name}"
    )
    logger.info(msg)
    log_creation(media_obj, media_obj.project, user)

    return media_obj, msg, section_obj


class MediaListAPI(BaseListView):
    """Interact with list of media.

    A media may be an image or a video. Media are a type of entity in Tator,
    meaning they can be described by user defined attributes.

    This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
    Both are accomplished using the same query parameters used for a GET request.
    """

    schema = MediaListSchema()
    http_method_names = ["get", "post", "patch", "delete", "put"]
    entity_type = MediaType  # Needed by attribute filter mixin
    _viewables = None

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE"]:
            self.permission_classes = [ProjectEditPermission]
        elif self.request.method == "POST":
            self.permission_classes = [ProjectTransferPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def get_queryset(self, **kwargs):
        if type(self._viewables) != type(None):
            return self._viewables
        params = {**self.params}
        # POST takes section as a name not an ID
        # Return the media queryset only if we have permissions to make a section if it doesn't exist
        if self.request.method == "POST":
            section_name = params.pop("section", None)
            if section_name:
                section = Section.objects.filter(project=params["project"], name=section_name)
                if section.exists():
                    params["section"] = section[0].id
                else:
                    proj = Project.objects.filter(pk=params["project"])
                    proj = augment_permission(self.request.user, proj)
                    can_create = (
                        (proj[0].effective_permission >> shift_permission(Section, Project))
                        & PermissionMask.CREATE
                    ) == PermissionMask.CREATE
                    if not can_create:
                        raise PermissionDenied

        media_qs = get_media_queryset(self.params["project"], params)
        viewables = self.filter_only_viewables(media_qs)
        self._viewables = viewables
        return self._viewables

    def _get(self, params):
        """Retrieve list of media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.
        """
        qs = self.get_queryset()
        fields = [*MEDIA_PROPERTIES]
        if params.get("encoded_related_search") == None:
            fields.remove("incident")
        presigned = params.get("presigned")

        # Handle JSON fields specially
        qs = optimize_qs(qs, fields)
        s=time.time()
        response_data = list(qs)

        # Add media_files and attributes back in parsed with ujson
        e=time.time()
        logger.info(f"Time to generate record: {e-s}")
        if presigned is not None:
            for record in response_data:
                if record["media_files"] is not None:
                    record["media_files"] = ujson.loads(record["media_files"])
            no_cache = params.get("no_cache", False)
            _presign(self.request.user.pk, presigned, response_data, no_cache=no_cache)
        return response_data

    def get_model(self):
        return Media

    def _post(self, params):
        project = params["project"]
        media_spec_list = params["body"]
        fields = [*MEDIA_PROPERTIES]
        if params.get("encoded_related_search") == None:
            fields.remove("incident")

        if isinstance(media_spec_list, list):
            received_spec_list = True
        else:
            received_spec_list = False
            media_spec_list = [media_spec_list]
        if len(media_spec_list) == 1:
            # Creates a single media object asynchronously, which only does something for images anyway
            obj, msg, section_obj = _create_media(
                project, media_spec_list[0], self.request.user, use_rq=True
            )
            qs = Media.objects.filter(id=obj.id)
            response_data = list(augment_permission(self.request.user, qs).values(*fields))
            response_data = response_data if received_spec_list else response_data[0]
            id_resp = [obj.id] if received_spec_list else obj.id
            response = {"message": msg, "id": id_resp, "object": response_data}
        elif media_spec_list:
            # Creates multiple media objects asynchronously, does not apply to videos but won't not work
            assert_list_of_image_specs(project, media_spec_list)
            ids = []
            for media_spec in media_spec_list:
                try:
                    obj, _, section_obj = _create_media(
                        project, media_spec, self.request.user, use_rq=True
                    )
                except Exception:
                    logger.warning(f"Failed to import {media_spec['name']}", exc_info=True)
                else:
                    ids.append(obj.id)

            qs = Media.objects.filter(id__in=set(ids))
            response_data = list(augment_permission(self.request.user, qs).values(*fields))
            response = {
                "message": f"Started import of {len(ids)} images!",
                "id": ids,
                "object": response_data,
            }
        else:
            raise ValueError(f"Expected one or more media specs, received zero!")
        return response

    def _delete(self, params):
        """Delete list of media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.

        This method performs a bulk delete on all media matching a query. It is
        recommended to use a GET request first to check what is being deleted.
        """
        project = params["project"]
        qs = self.get_queryset()
        media_ids = list(qs.values_list("pk", flat=True).distinct())
        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(
                f"Safety check failed - expected {expected_count} but would delete {count}"
            )

        if count > 0:
            bulk_delete_and_log_changes(qs, project, self.request.user)

            # Any states that are only associated to deleted media should also be marked
            # for deletion.
            not_deleted = State.objects.filter(project=project, media__deleted=False).values_list(
                "id", flat=True
            )
            deleted = State.objects.filter(project=project, media__deleted=True).values_list(
                "id", flat=True
            )
            all_deleted = set(deleted) - set(not_deleted)
            state_qs = State.objects.filter(pk__in=all_deleted)
            bulk_delete_and_log_changes(state_qs, project, self.request.user)

            # Delete any localizations associated to this media
            loc_qs = Localization.objects.filter(project=project, media__in=media_ids)
            bulk_delete_and_log_changes(loc_qs, project, self.request.user)

        return {"message": f"Successfully deleted {count} medias!"}

    def _patch(self, params):
        """Update list of media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.

        This method performs a bulk update on all media matching a query. It is
        recommended to use a GET request first to check what is being updated.
        Only attributes are eligible for bulk patch operations.
        """
        params = _sync_section_inputs(params, params["project"])
        desired_archive_state = params.pop("archive_state", None)
        if (
            desired_archive_state is None
            and params.get("attributes") is None
            and params.get("user_elemental_id") == None
            and params.get("reset_attributes") is None
            and params.get("null_attributes") is None
            and params.get("primary_section") is None
        ):
            raise ValueError(
                "Must specify 'attributes', 'reset_attributes', 'null_attributes', 'user_elemental_id', 'primary_section'"
                " and/or property to patch, but none found"
            )
        qs = self.get_queryset()

        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(
                f"Safety check failed - expected {expected_count} but would update {count}"
            )
        if qs.exists():
            ids_to_update = list(qs.values_list("pk", flat=True).distinct())
            if qs.values("type").distinct().count() != 1:
                raise ValueError(
                    "When doing a bulk patch the type id of all objects must be the same."
                )
            # Get the current representation of the object for comparison
            obj = qs.first()
            new_attrs = validate_attributes(params, obj)
            update_kwargs = {}
            if params.get("user_elemental_id", None):
                computed_author = compute_user(
                    params["project"], self.request.user, params.get("user_elemental_id", None)
                )
                update_kwargs["created_by"] = computed_author
            if params.get("primary_section", None):
                if params["primary_section"] < 0:
                    update_kwargs["primary_section"] = None
                else:
                    section = Section.objects.filter(
                        project=params["project"], pk=params["primary_section"]
                    )
                    if not section.exists():
                        raise ValueError(
                            f"Folder with ID {params['primary_section']} does not exist"
                        )
                    update_kwargs["primary_section"] = section[0]
            if new_attrs is not None or update_kwargs != {}:
                attr_count = len(ids_to_update)
                bulk_update_and_log_changes(
                    qs,
                    params["project"],
                    self.request.user,
                    new_attributes=new_attrs,
                    update_kwargs=update_kwargs,
                )
                count = max(count, attr_count)

            if desired_archive_state is not None:
                archive_count = 0
                qs = Media.objects.filter(pk__in=ids_to_update)

                # Track previously updated IDs to avoid multiple updates to a single entity
                previously_updated = []

                # Further filter on current archive state to correctly update based on previous
                # state
                for state in ["live", "to_live", "archived", "to_archive"]:
                    next_archive_state = _get_next_archive_state(desired_archive_state, state)

                    # If the next archive state is a noop, skip the update
                    if next_archive_state is None:
                        continue

                    archive_qs = qs.filter(archive_state=state).exclude(pk__in=previously_updated)
                    ids_to_update = list(archive_qs.values_list("pk", flat=True))

                    # Add all single media ids that are part of a multiview that has requested a
                    # state change
                    multi_constituent_ids = _single_ids_from_multi_qs(
                        archive_qs.filter(type__dtype="multi")
                    )
                    multi_constituent_ids.update(ids_to_update)
                    archive_qs = Media.objects.filter(pk__in=multi_constituent_ids).exclude(
                        pk__in=previously_updated
                    )

                    # If no media match the archive state, skip the update
                    if not archive_qs.exists():
                        continue

                    # Get the original dict for creating the change log
                    archive_objs = list(archive_qs)
                    obj = archive_objs[0]

                    # Store the list of ids updated for this state and update them
                    archive_ids_to_update = [o.id for o in archive_objs]
                    archive_count += len(archive_ids_to_update)
                    previously_updated += archive_ids_to_update
                    dt_now = datetime.datetime.now(datetime.timezone.utc)
                    update_kwargs = {
                        "archive_status_date": dt_now,
                        "archive_state": next_archive_state,
                        "modified_datetime": dt_now,
                    }
                    bulk_update_and_log_changes(
                        archive_qs,
                        params["project"],
                        self.request.user,
                        update_kwargs=update_kwargs,
                    )
                    archive_qs = Media.objects.filter(pk__in=archive_ids_to_update)

                count = max(count, archive_count)

        return {"message": f"Successfully patched {count} medias!"}

    def _put(self, params):
        """Retrieve list of media by ID."""
        return self._get(params)

    def get_parent_objects(self):
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS", "PATCH", "DELETE"]:
            return super().get_parent_objects()
        elif self.request.method in ["POST"]:
            # For POST Media we need to see what versions/sections are being impacted
            specs = self.params["body"]
            if not isinstance(specs, list):
                specs = [specs]

            sections = []
            section_names = [s["section"] for s in specs if s.get("section", None)]
            section_ids = [s["section_id"] for s in specs if s.get("section_id", None)]
            sections_by_name = Section.objects.filter(
                project=self.params["project"], name__in=section_names
            )
            sections_by_id = Section.objects.filter(pk__in=section_ids)
            for section in sections_by_name:
                sections.append(section)
            for section in sections_by_id:
                sections.append(section)

            return {
                "project": Project.objects.filter(pk=self.params["project"]),
                "version": Version.objects.filter(pk=-1),  # Media don't have versions
                "section": sections,
            }
        else:
            raise ValueError(f"Unsupported method {self.request.method}")


class MediaDetailAPI(BaseDetailView):
    """Interact with individual media.

    A media may be an image or a video. Media are a type of entity in Tator,
    meaning they can be described by user defined attributes.
    """

    schema = MediaDetailSchema()
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE"]:
            self.permission_classes = [ProjectEditPermission]
        elif self.request.method == "POST":
            self.permission_classes = [ProjectTransferPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        """Retrieve individual media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.
        """
        qs = self.get_queryset()
        if not qs.exists():
            raise Http404
        fields = [*MEDIA_PROPERTIES]
        fields.remove("incident")
        response_data = list(qs.values(*fields))
        presigned = params.get("presigned")
        if presigned is not None:
            no_cache = params.get("no_cache", False)
            _presign(self.request.user.pk, presigned, response_data, no_cache=no_cache)
        return response_data[0]

    def _patch(self, params):
        """Update individual media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.
        """
        with transaction.atomic():
            qs = self.get_queryset()
            media = qs[0]
            params = _sync_section_inputs(params, media.project.pk)
            model_dict = media.model_dict
            computed_author = compute_user(
                media.project.pk, self.request.user, params.get("user_elemental_id", None)
            )
            if params.get("user_elemental_id", None):
                qs.update(created_by=computed_author)
            if (
                "attributes" in params
                or "null_attributes" in params
                or "reset_attributes" in params
            ):
                new_attrs = validate_attributes(params, media)
                logger.info(f"new_attrs={new_attrs}")
                bulk_patch_attributes(new_attrs, qs)

            if "name" in params:
                qs.update(name=params["name"])

            if "last_edit_start" in params:
                qs.update(last_edit_start=params["last_edit_start"])

            if "last_edit_end" in params:
                qs.update(last_edit_end=params["last_edit_end"])

            if "fps" in params:
                qs.update(fps=params["fps"])

            if "num_frames" in params:
                qs.update(num_frames=params["num_frames"])

            if "codec" in params:
                qs.update(codec=params["codec"])

            if "width" in params:
                qs.update(width=params["width"])

            if "height" in params:
                qs.update(height=params["height"])

            if "summary_level" in params:
                qs.update(summary_level=params["summary_level"])

            if "elemental_id" in params:
                qs.update(elemental_id=params["elemental_id"])

            if "primary_section" in params:
                if params["primary_section"] < 0:
                    qs.update(primary_section=None)
                else:
                    section = Section.objects.filter(
                        project=media.project, pk=params["primary_section"]
                    )
                    if not section.exists():
                        raise ValueError(
                            f"Folder with ID {params['primary_section']} does not exist"
                        )
                    qs.update(primary_section=section[0])

            if "multi" in params:
                media_files = media.media_files
                # If this object already contains non-multi media definitions, raise an exception.
                if media_files:
                    for role in ["streaming", "archival", "image", "live", "concat"]:
                        items = media_files.get(role, [])
                        if len(items) > 0:
                            raise ValueError(
                                f"Cannot set a multi definition on a Media that contains "
                                "individual or concatenated media!"
                            )
                # Check values of IDs (that they exist and are part of the same project).
                if "ids" in params["multi"]:
                    sub_media = Media.objects.filter(
                        project=media.project, pk__in=params["multi"]["ids"]
                    )
                    if len(params["multi"]["ids"]) != sub_media.count():
                        raise ValueError(
                            f"One or more media IDs in multi definition is not part of "
                            "project {media.project.pk} or does not exist!"
                        )
                if media_files is None:
                    media_files = {}
                for key in ["ids", "layout", "quality", "frameOffset"]:
                    if params["multi"].get(key):
                        media_files[key] = params["multi"][key]
                qs.update(media_files=media_files)

            if "concat" in params:
                media_files = qs[0].media_files
                # If this object already contains non-multi media definitions, raise an exception.
                if media_files:
                    for role in ["streaming", "archival", "image", "live", "multi"]:
                        items = media_files.get(role, [])
                        if len(items) > 0:
                            raise ValueError(
                                f"Cannot set a concat definition on a Media that contains "
                                "individual or multi media!"
                            )
                # Check values of IDs (that they exist and are part of the same project).
                concat_ids = [x["id"] for x in params["concat"]]
                sub_media = Media.objects.filter(project=qs[0].project, pk__in=concat_ids)
                valid_ids = [x.id for x in sub_media]
                valid_objs = [x for x in params["concat"] if x["id"] in valid_ids]
                if len(valid_objs) != len(concat_ids):
                    raise ValueError(
                        f"One or more media IDs in concat definition is not part of "
                        f"project {qs[0].project.pk} or does not exist! "
                        f"req={concat_ids}, found={valid_ids}"
                    )

                if media_files is None:
                    media_files = {}

                # Only add valid media to the concat structure
                media_files["concat"] = []
                for concat_obj in valid_objs:
                    media_files["concat"].append(concat_obj)

                qs.update(media_files=media_files)

            if "live" in params:
                media_files = media.media_files
                # If this object already contains non-live media definitions, raise an exception.
                if media_files:
                    for role in ["streaming", "archival", "image", "ids"]:
                        items = media_files.get(role, [])
                        if len(items) > 0:
                            raise ValueError(
                                f"Cannot set a multi definition on a Media that contains "
                                "individual media!"
                            )
                if media_files is None:
                    media_files = {}
                media_files["layout"] = params["live"]["layout"]
                media_files["live"] = params["live"]["streams"]
                qs.update(media_files=media_files)

            if "archive_state" in params:
                next_archive_state = _get_next_archive_state(
                    params["archive_state"], media.archive_state
                )

                if next_archive_state is not None:
                    project = media.project
                    user = self.request.user

                    # Update the archive state of all videos if this is a multiview
                    multi_constituent_ids = _single_ids_from_multi_qs(
                        qs.filter(type__dtype="multi")
                    )
                    multi_constituent_ids.add(params["id"])
                    archive_state_qs = Media.objects.select_for_update().filter(
                        pk__in=multi_constituent_ids
                    )
                    dt_now = datetime.datetime.now(datetime.timezone.utc)
                    update_kwargs = {
                        "archive_status_date": dt_now,
                        "archive_state": next_archive_state,
                        "modified_datetime": dt_now,
                        "modified_by": user,
                    }
                    bulk_update_and_log_changes(
                        archive_state_qs, project, user, update_kwargs=update_kwargs
                    )

        obj = Media.objects.get(pk=params["id"], deleted=False)

        log_changes(obj, model_dict, obj.project, self.request.user)
        return {"message": f'Media {params["id"]} successfully updated!'}

    def _delete(self, params):
        """Delete individual media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.
        """
        media = self.get_queryset()[0]
        project = media.project
        delete_and_log_changes(media, project, self.request.user)

        # Any states that are only associated to deleted media should also be marked
        # for deletion.
        not_deleted = State.objects.filter(project=project, media__deleted=False).values_list(
            "id", flat=True
        )
        deleted = State.objects.filter(project=project, media__deleted=True).values_list(
            "id", flat=True
        )
        all_deleted = set(deleted) - set(not_deleted)
        state_qs = State.objects.filter(pk__in=all_deleted)
        bulk_delete_and_log_changes(state_qs, project, self.request.user)

        # Delete any localizations associated to this media
        loc_qs = Localization.objects.filter(project=project, media__in=[media.id])
        bulk_delete_and_log_changes(loc_qs, project, self.request.user)

        return {"message": f'Media {params["id"]} successfully deleted!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Media.objects.filter(pk=self.params["id"], deleted=False))
