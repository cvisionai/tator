from django.db import transaction
from django.http import Http404

from ..models import Media
from ..models import Bucket
from ..models import Resource
from ..models import safe_delete
from ..models import drop_media_from_resource
from ..schema import VideoFileListSchema
from ..schema import VideoFileDetailSchema
from ..search import TatorSearch

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission, ProjectViewOnlyPermission
from ._util import check_resource_prefix
from .._permission_util import check_bucket_permissions

import logging

logger = logging.getLogger(__name__)


class VideoFileListAPI(BaseListView):
    schema = VideoFileListSchema()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectTransferPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        media = Media.objects.get(pk=params["id"])
        role = params["role"]
        response_data = []
        if media.media_files:
            if role in media.media_files:
                response_data = media.media_files[role]
        return response_data

    def _post(self, params):
        with transaction.atomic():
            qs = Media.objects.select_for_update().filter(pk=params["id"])
            if qs.count() != 1:
                raise Http404
            media_files = qs[0].media_files
            role = params["role"]
            body = params["body"]
            index = params.get("index")
            check_resource_prefix(body["path"], qs[0])
            bucket_id = params.get("bucket_id")
            if bucket_id:
                bucket = Bucket.objects.filter(pk=bucket_id)
                check_bucket_permissions(self.request.user, bucket)

            if not media_files:
                media_files = {}
            if role not in media_files:
                media_files[role] = []
            if index is None:
                media_files[role].append(body)
            else:
                if index >= len(media_files[role]):
                    raise ValueError(
                        f"Supplied index {index} is larger than current array size "
                        f"{len(media_files[role])}"
                    )
                media_files[role].insert(index, body)
            qs.update(media_files=media_files)
        media = Media.objects.get(pk=params["id"])
        if params["reference_only"] == 0:
            Resource.add_resource(body["path"], media, bucket_id=bucket_id)
            if role == "streaming":
                Resource.add_resource(body["segment_info"], media, bucket_id=bucket_id)
        return {"message": f"Media file in media object {media.id} created!"}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Media.objects.filter(pk=self.params["id"]))


class VideoFileDetailAPI(BaseDetailView):
    schema = VideoFileDetailSchema()
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectTransferPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        media = Media.objects.get(pk=params["id"])
        role = params["role"]
        index = params["index"]
        response_data = []
        if media.media_files:
            if role in media.media_files:
                response_data = media.media_files[role]
        if index >= len(response_data):
            raise ValueError(
                f"Supplied index {index} is larger than current array size " f"{len(response_data)}"
            )
        return response_data[index]

    def _patch(self, params):
        with transaction.atomic():
            qs = Media.objects.select_for_update().filter(pk=params["id"])
            if qs.count() != 1:
                raise Http404
            media_files = qs[0].media_files
            role = params["role"]
            body = params["body"]
            index = params["index"]
            if not media_files:
                raise Http404
            if role not in media_files:
                raise Http404
            if (role == "streaming") and ("segment_info" not in body):
                raise ValueError(f"Streaming files are required to include a segment_info!")
            if (role == "streaming") and (not body["segment_info"]):
                raise ValueError(f"Streaming files are required to include a segment_info!")
            if index >= len(media_files[role]):
                raise ValueError(
                    f"Supplied index {index} is larger than current array size "
                    f"{len(media_files[role])}"
                )
            old_path = media_files[role][index]["path"]
            new_path = body["path"]
            check_resource_prefix(new_path, qs[0])
            if role == "streaming":
                old_segments = media_files[role][index]["segment_info"]
                new_segments = body["segment_info"]
            media_files[role][index] = body
            qs.update(media_files=media_files)
        media = Media.objects.get(pk=params["id"])
        if old_path != new_path:
            drop_media_from_resource(old_path, media)
            safe_delete(old_path, media.project.id)
            Resource.add_resource(new_path, media)
        if role == "streaming":
            if old_segments != new_segments:
                drop_media_from_resource(old_segments, media)
                safe_delete(old_segments, media.project.id)
                Resource.add_resource(new_segments, media)
        return {"message": f"Media file in media object {media.id} successfully updated!"}

    def _delete(self, params):
        with transaction.atomic():
            qs = Media.objects.select_for_update().filter(pk=params["id"])
            if qs.count() != 1:
                raise Http404
            media_files = qs[0].media_files
            role = params["role"]
            index = params["index"]
            if not media_files:
                raise Http404
            if role not in media_files:
                raise Http404
            if index >= len(media_files[role]):
                raise ValueError(
                    f"Supplied index {index} is larger than current array size "
                    f"{len(media_files[role])}"
                )
            deleted = media_files[role].pop(index)
            qs.update(media_files=media_files)
        media = Media.objects.get(pk=params["id"])
        drop_media_from_resource(deleted["path"], media)
        safe_delete(deleted["path"], media.project.id)
        if role == "streaming":
            drop_media_from_resource(deleted["segment_info"], media)
            safe_delete(deleted["segment_info"], media.project.id)
        return {"message": f'Media file in media object {params["id"]} successfully deleted!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Media.objects.filter(pk=self.params["id"]))
