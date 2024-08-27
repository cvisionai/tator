import os
import logging
import datetime
from uuid import uuid1

from django.http import Http404
from rest_framework.authtoken.models import Token
from django.http import Http404
import requests

from ..store import get_tator_store
from ..cache import TatorCache
from ..models import Project
from ..models import MediaType
from ..models import Media
from ..schema import TranscodeListSchema
from ..schema import TranscodeDetailSchema
from ..models import Version
from main.models import Section, Version
from django.core.exceptions import PermissionDenied

from .media import _create_media
from ._util import url_to_key
from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission
from ._media_query import get_media_queryset
from ._job import workflow_to_job

logger = logging.getLogger(__name__)

from .._permission_util import PermissionMask, shift_permission, augment_permission

HOST = "http://gunicorn-svc:8000"
GUNICORN_HOST = os.getenv("GUNICORN_HOST")
COMPOSE_DEPLOY = os.getenv("COMPOSE_DEPLOY")
if GUNICORN_HOST is not None and COMPOSE_DEPLOY is not None:
    if COMPOSE_DEPLOY.lower() == "true":
        HOST = GUNICORN_HOST
ENDPOINT = f"{os.getenv('TRANSCODE_HOST')}/jobs"


def _filter_jobs_by_media(project, params, job_list):
    """Checks if a params dict has media filters."""
    keys = list(params.keys())
    if "project" in keys:
        keys.remove("project")
    if "gid" in keys:
        keys.remove("gid")
    if len(keys) > 0:
        filtered = []
        qs = get_media_queryset(project, params)
        media_ids = list(qs.values_list("id", flat=True))
        filtered = [job for job in job_list if job["media_id"] in media_ids]
    else:
        filtered = job_list
    return filtered


def _job_to_transcode(job):
    # Update the spec for future reference
    spec = {
        "type": job["type"],
        "gid": job["gid"],
        "uid": job["uid"],
        "url": job["url"],
        "size": job["size"],
        "section_id": job["section_id"],
        "name": job["name"],
        "attributes": job["attributes"],
        "email_spec": job["email_spec"],
        "media_id": job["media_id"],
    }

    if not spec["email_spec"]:
        spec.pop("email_spec", None)

    return {
        "spec": spec,
        "job": {
            "id": job["id"],
            "uid": job["uid"],
            "gid": job["gid"],
            "user": Token.objects.get(key=job["token"]).user.pk,
            "project": job["project"],
            "nodes": [],
            "status": job["status"],
            "start_time": job["start_time"],
            "stop_time": job["stop_time"],
        },
    }


class TranscodeListAPI(BaseListView):
    """Start a transcode."""

    schema = TranscodeListSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ["post", "get", "put", "delete"]

    def _post(self, params):
        entity_type = params["type"]
        gid = str(params["gid"])
        uid = params["uid"]
        url = params["url"]
        upload_size = params.get("size", -1)
        section = params.get("section")
        section_id = params.get("section_id")
        name = params["name"]
        project = params["project"]
        attributes = params.get("attributes", None)
        email_spec = params.get("email_spec", None)
        media_id = params.get("media_id", None)
        token, _ = Token.objects.get_or_create(user=self.request.user)

        project_obj = Project.objects.get(pk=project)
        type_objects = MediaType.objects.filter(project=project)
        if entity_type != -1:
            # If we are transcoding and not unpacking we know its a video type we need
            type_objects = type_objects.filter(pk=entity_type, dtype="video")

        # For tar/zip uploads, we can still get an error after this
        # because the tar may contain images or video.
        logger.info(f"Count of type {type_objects.count()}")
        if type_objects.count() == 0:
            raise Exception(
                f"For project {project} given type {entity_type}, can not find a "
                "destination media type"
            )

        # Attempt to determine upload size. Only use size parameter if size cannot be determined.
        path, bucket, upload = url_to_key(url, project_obj)
        if path is not None:
            logger.info(f"Attempting to retrieve size for object key {path}...")
            use_upload_bucket = upload and not bucket
            tator_store = get_tator_store(bucket, upload=use_upload_bucket)
            upload_size = tator_store.get_size(path)
            # If we have the media ID, tag the object with the media ID.
            if media_id:
                tator_store.put_media_id_tag(path, media_id)
            logger.info(f"Got object size {upload_size} for object key {path}")
        if upload_size == -1:
            logger.info(f"Failed to get object size from object, trying HEAD at {url}...")
            # This is a normal url. Use HEAD request to obtain content length.
            response = requests.head(url, headers={"Accept-Encoding": None})
            head_succeeded = False
            if "Content-Length" in response.headers:
                head_size = int(response.headers["Content-Length"])
                if head_size > 0:
                    head_succeeded = True
                    upload_size = head_size
            if (upload_size is None) and (head_succeeded == False):
                raise Exception(
                    "HEAD request failed. Supply `size` parameter to Transcode " "endpoint!"
                )
            logger.info(f"Got size {upload_size} for {url}")

        # Verify the given media ID exists and is part of the project,
        # then update its fields with the given info.
        if media_id:
            media_obj = Media.objects.get(pk=media_id)
            if media_obj.project.pk != project:
                raise Exception(f"Media not part of specified project!")
            section_id = -1
        elif entity_type != -1:
            media_obj, _, section_obj = _create_media(project, params, self.request.user)
            media_id = media_obj.id
            section_id = section_obj.id
        logger.info(f"HOST: {HOST}")
        response = requests.post(
            ENDPOINT,
            json=[
                {
                    "url": url,
                    "size": upload_size,
                    "host": HOST,
                    "token": str(token),
                    "project": project,
                    "type": entity_type,
                    "name": name,
                    "section_id": section_id,
                    "media_id": media_id,
                    "gid": gid,
                    "uid": uid,
                    "attributes": attributes,
                    "email_spec": email_spec,
                }
            ],
        )
        job_list = response.json()
        msg = (
            f"Transcode job {uid} started for file "
            f"{name} on project {type_objects[0].project.name}"
        )
        response_data = {"message": msg, "id": str(uid), "object": _job_to_transcode(job_list[0])}

        # Cache the job for cancellation/authentication.
        TatorCache().set_job(
            {
                "uid": uid,
                "gid": gid,
                "user": self.request.user.pk,
                "project": project,
                "algorithm": -1,
                "datetime": datetime.datetime.utcnow().isoformat() + "Z",
            },
            "transcode",
        )

        # Update Media object with workflow name
        media = Media.objects.get(pk=media_id)
        workflow_names = media.attributes.get("_tator_import_workflow", [])
        workflow_names.append(job_list[0]["id"])
        media.attributes["_tator_import_workflow"] = workflow_names
        media.save()

        # Send notification that transcode started.
        logger.info(msg)
        return response_data

    def _get(self, params):
        gid = params.get("gid", None)
        project = params["project"]

        if gid is not None:
            params1 = {"gid": gid}
        else:
            params1 = {"project": project}
        response = requests.put(ENDPOINT, params=params1)
        job_list = response.json()
        logger.info(f"JOB LIST: {job_list}")
        for job in job_list:
            assert job["project"] == project
        section_name = params.pop("section", None)
        if section_name:
            section = Section.objects.filter(project=project, name=section_name)
            if section.exists():
                section = augment_permission(self.request.user, section)
                if not (
                    section[0].effective_permission & PermissionMask.EXIST == PermissionMask.EXIST
                ):
                    logger.info(
                        f"Section Perm={section[0].effective_permission}, must have {PermissionMask.EXIST}"
                    )
                    raise PermissionDenied
                params["section_id"] = section.pk
        job_list = _filter_jobs_by_media(project, params, job_list)
        return [_job_to_transcode(job) for job in job_list]

    def _delete(self, params):
        # Parse parameters
        gid = params.get("gid", None)
        project = params["project"]

        if gid is not None:
            params1 = {"gid": gid}
        else:
            params1 = {"project": project}
        response = requests.put(ENDPOINT, params=params1)
        job_list = response.json()
        for job in job_list:
            assert job["project"] == project
        job_list = _filter_jobs_by_media(project, params, job_list)
        uid_list = [job["uid"] for job in job_list]
        response = requests.delete(ENDPOINT, json=uid_list)
        return {"message": response.json()["message"]}

    def _put(self, params):
        return self._get(params)

    def get_queryset(self, **kwargs):
        # HACK: work around Redis cache issue + REST grammar issues
        if self.request.method == "POST":
            section_name = self.params.get("section", None)
            section_id = self.params.get("section_id", None)
            section = Section.objects.filter(pk=-1)
            if section_name:
                section = Section.objects.filter(project=self.params["project"], name=section_name)
            if section_id:
                section = Section.objects.filter(pk=section_id)

            # Check if the section exists and if it does, whether we have permission
            # if it doesn't check if we can create it
            if section.exists():
                section = augment_permission(self.request.user, section)
                if section[0].effective_permission & PermissionMask.CREATE == PermissionMask.CREATE:
                    return Media.objects.filter(pk=-1)
                else:
                    raise PermissionDenied
            else:
                proj = Project.objects.filter(pk=self.params["project"])
                proj = augment_permission(self.request.user, proj)
                can_create = (
                    (proj[0].effective_permission >> shift_permission(Section, Project))
                    & PermissionMask.CREATE
                ) == PermissionMask.CREATE
                if not can_create:
                    raise PermissionDenied

        jobs = self._get({**self.params})
        if jobs:
            media_ids = [job["spec"]["media_id"] for job in jobs]
            return Media.objects.filter(pk__in=media_ids)
        else:
            return Media.objects.filter(pk=-1)

    def get_parent_objects(self):
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS", "PATCH", "DELETE"]:
            return super().get_parent_objects()
        elif self.request.method in ["POST"]:
            # For POST Media we need to see what versions/sections are being impacted
            section_id = self.params.get("section_id", None)
            section_name = self.params.get("section", None)
            logger.info(f"Computing impacted sections for POST {self.params}")
            sections = Section.objects.filter(pk=-1)
            if section_id:
                sections = Section.objects.filter(pk=section_id)
            elif section_name:
                sections = Section.objects.filter(project=self.params["project"], name=section_name)
            return {
                "project": Project.objects.filter(pk=self.params["project"]),
                "version": Version.objects.filter(pk=-1),  # Media don't have versions
                "section": sections,
            }
        else:
            raise ValueError(f"Unsupported method {self.request.method}")


class TranscodeDetailAPI(BaseDetailView):
    schema = TranscodeDetailSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ["get", "delete"]

    def _get(self, params):
        uid = params["uid"]
        cache = TatorCache().get_jobs_by_uid(uid)
        if cache is None:
            raise Http404
        response = requests.put(ENDPOINT, json=[uid])
        job_list = response.json()
        if len(job_list) != 1:
            raise Http404
        return _job_to_transcode(job_list[0])

    def _delete(self, params):
        uid = params["uid"]
        cache = TatorCache().get_jobs_by_uid(uid)
        if cache is None:
            raise Http404
        response = requests.delete(ENDPOINT, json=[uid])
        return {"message": response.json()["message"]}

    def get_queryset(self, **kwargs):
        ## This is awful because we store jobs in redis and not in the database
        ## HACK: fetch jobs from redis then find media objects to get their permissions
        job = self._get(self.params)
        media_id = job["spec"]["media_id"]
        return Media.objects.filter(pk=media_id)
