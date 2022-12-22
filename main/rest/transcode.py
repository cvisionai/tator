import os
import logging
from uuid import uuid1

from rest_framework.authtoken.models import Token
import requests

from ..kube import TatorTranscode
from ..kube import get_jobs
from ..kube import cancel_jobs
from ..store import get_tator_store
from ..cache import TatorCache
from ..models import Project
from ..models import MediaType
from ..models import Media
from ..schema import TranscodeSchema
from ..notify import Notify

from .media import _create_media
from ._util import url_to_key
from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission
from ._job import workflow_to_job

logger = logging.getLogger(__name__)

class TranscodeAPI(BaseListView):
    """ Start a transcode.
    """
    schema = TranscodeSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['post', 'get', 'put', 'delete']

    def _post(self, params):
        entity_type = params['type']
        gid = str(params['gid'])
        uid = params['uid']
        url = params['url']
        upload_size = params.get('size', -1)
        section = params['section']
        name = params['name']
        md5 = params['md5']
        project = params['project']
        attributes = params.get('attributes',None)
        media_id = params.get('media_id', None)
        token, _ = Token.objects.get_or_create(user=self.request.user)

        project_obj = Project.objects.get(pk=project)
        type_objects = MediaType.objects.filter(project=project)
        if entity_type != -1:
            #If we are transcoding and not unpacking we know its a video type we need
            type_objects = type_objects.filter(pk=entity_type,dtype="video")

        # For tar/zip uploads, we can still get an error after this
        # because the tar may contain images or video.
        logger.info(f"Count of type {type_objects.count()}")
        if type_objects.count() == 0:
            raise Exception(f"For project {project} given type {entity_type}, can not find a "
                             "destination media type")

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
            response = requests.head(url, headers={'Accept-Encoding': None})
            head_succeeded = False
            if 'Content-Length' in response.headers:
                head_size = int(response.headers['Content-Length'])
                if head_size > 0:
                    head_succeeded = True
                    upload_size = head_size
            if (upload_size is None) and (head_succeeded == False):
                raise Exception("HEAD request failed. Supply `size` parameter to Transcode "
                                "endpoint!")
            logger.info(f"Got size {upload_size} for {url}")

        # Verify the given media ID exists and is part of the project,
        # then update its fields with the given info.
        if media_id:
            media_obj = Media.objects.get(pk=media_id)
            if media_obj.project.pk != project:
                raise Exception(f"Media not part of specified project!")
        elif entity_type != -1:
            media_obj, _ = _create_media(params, self.request.user)
            media_id = media_obj.id
        if entity_type == -1:
            transcode = TatorTranscode().start_tar_import(
                project,
                entity_type,
                token,
                url,
                name,
                section,
                md5,
                gid,
                uid,
                self.request.user.pk,
                upload_size,
                attributes)
        else:
            transcode = TatorTranscode().start_transcode(
                project,
                entity_type,
                token,
                url,
                name,
                section,
                md5,
                gid,
                uid,
                self.request.user.pk,
                upload_size,
                attributes,
                media_id)

        msg = (f"Transcode job {uid} started for file "
               f"{name} on project {type_objects[0].project.name}")
        response_data = {'message': msg,
                         'id': str(uid),
                         'object': transcode}

        # Update Media object with workflow name
        if media_id:
            media = Media.objects.get(pk=media_id)
            cache = TatorCache().get_jobs_by_uid(uid, 'transcode')
            jobs = get_jobs(f'uid={uid}', cache)
            workflow_names = media.attributes.get('_tator_import_workflow',[])
            workflow_names.append(jobs[0]['metadata']['name'])
            media.attributes['_tator_import_workflow'] = workflow_names
            media.save()

        # Send notification that transcode started.
        logger.info(msg)
        return response_data

    def _get(self, params):
        gid = params.get('gid', None)
        project = params['project']

        selector = f'project={project},job_type=upload'
        if gid is not None:
            selector += f',gid={gid}'
            cache = TatorCache().get_jobs_by_gid(gid, 'transcode', first_only=True)
            assert(cache[0]['project'] == project)
        else:
            cache = TatorCache().get_jobs_by_project(project, 'transcode')
        jobs = get_jobs(selector, cache)
        jobs = [workflow_to_job(job) for job in jobs]
        jobs = {job['uid']:job for job in jobs}
        specs = {spec['uid']:spec['spec'] for spec in cache}
        return [{'spec':specs[uid], 'job': jobs[uid]} for uid in jobs.keys()]

    def _delete(self, params):
        # Parse parameters
        gid = params.get('gid', None)
        project = params['project']

        selector = f'project={project},job_type=upload'
        if gid is not None:
            selector += f',gid={gid}'
            try:
                cache = TatorCache().get_jobs_by_gid(gid, 'transcode', first_only=True)
                assert(cache[0]['project'] == project)
            except:
                raise Http404
        else:
            cache = TatorCache().get_jobs_by_project(project, 'transcode')
        cancelled = cancel_jobs(selector, cache)
        return {'message': f"Deleted {cancelled} jobs for project {project}!"}

    def _put(self, params):
        return self._get(params)

