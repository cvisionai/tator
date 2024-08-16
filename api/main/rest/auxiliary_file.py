from django.db import transaction
from django.http import Http404

from ..models import Media
from ..models import Resource
from ..models import safe_delete
from ..models import drop_media_from_resource
from ..schema import AuxiliaryFileListSchema
from ..schema import AuxiliaryFileDetailSchema
from ..search import TatorSearch

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission, ProjectViewOnlyPermission
from ._util import check_resource_prefix

import logging

logger = logging.getLogger(__name__)

class AuxiliaryFileListAPI(BaseListView):
    schema = AuxiliaryFileListSchema()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectTransferPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    def _get(self, params):
        media = Media.objects.get(pk=params["id"])
        response_data = []
        if media.media_files:
            if "attachment" in media.media_files:
                response_data = media.media_files["attachment"]
        return response_data

    def _post(self, params):
        with transaction.atomic():
            qs = Media.objects.select_for_update().filter(pk=params["id"])
            if qs.count() != 1:
                raise Http404
            media_files = qs[0].media_files
            body = params["body"]
            index = params.get("index")
            check_resource_prefix(body["path"], qs[0])
            if not media_files:
                media_files = {}
            if "attachment" not in media_files:
                media_files["attachment"] = []
            if index is None:
                media_files["attachment"].append(body)
            else:
                if index >= len(media_files["attachment"]):
                    raise ValueError(
                        f"Supplied index {index} is larger than current array size "
                        f"{len(media_files['attachment'])}"
                    )
                media_files["attachment"].insert(index, body)
            qs.update(media_files=media_files)
        media = Media.objects.get(pk=params["id"])
        Resource.add_resource(body["path"], media)
        return {"message": f"Media file in media object {media.id} created!"}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Media.objects.filter(pk=self.params["id"]))


class AuxiliaryFileDetailAPI(BaseDetailView):
    schema = AuxiliaryFileDetailSchema()
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
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    def _get(self, params):
        media = Media.objects.get(pk=params["id"])
        index = params["index"]
        response_data = []
        if media.media_files:
            if "attachment" in media.media_files:
                response_data = media.media_files["attachment"]
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
            body = params["body"]
            index = params["index"]
            if not media_files:
                raise Http404
            if "attachment" not in media_files:
                raise Http404
            if index >= len(media_files["attachment"]):
                raise ValueError(
                    f"Supplied index {index} is larger than current array size "
                    f"{len(media_files['attachment'])}"
                )
            old_path = media_files["attachment"][index]["path"]
            new_path = body["path"]
            check_resource_prefix(new_path, qs[0])
            media_files["attachment"][index] = body
            qs.update(media_files=media_files)
        media = Media.objects.get(pk=params["id"])
        if old_path != new_path:
            drop_media_from_resource(old_path, media)
            safe_delete(old_path, media.project.id)
            Resource.add_resource(new_path, media)
        return {"message": f"Media file in media object {media.id} successfully updated!"}

    def _delete(self, params):
        with transaction.atomic():
            qs = Media.objects.select_for_update().filter(pk=params["id"])
            if qs.count() != 1:
                raise Http404
            media_files = qs[0].media_files
            index = params["index"]
            if not media_files:
                raise Http404
            if "attachment" not in media_files:
                raise Http404
            if index >= len(media_files["attachment"]):
                raise ValueError(
                    f"Supplied index {index} is larger than current array size "
                    f"{len(media_files['attachment'])}"
                )
            deleted = media_files["attachment"].pop(index)
            qs.update(media_files=media_files)
        media = Media.objects.get(pk=params["id"])
        drop_media_from_resource(deleted["path"], media)
        safe_delete(deleted["path"], media.project.id)
        return {"message": f'Media file in media object {params["id"]} successfully deleted!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Media.objects.filter(pk=self.params["id"]))
