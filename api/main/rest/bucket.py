import logging
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404

from ..models import Organization
from ..models import Affiliation
from ..models import Bucket
from ..schema import BucketListSchema
from ..schema import BucketDetailSchema
from ..store import ObjectStore

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import OrganizationAdminPermission

logger = logging.getLogger(__name__)


def _get_endpoint_url(bucket):
    if bucket.config:
        if bucket.store_type == ObjectStore.GCP:
            return None
        if bucket.store_type in [ObjectStore.AWS, ObjectStore.MINIO]:
            return bucket.config.get("endpoint_url", None)
        if bucket.store_type == ObjectStore.OCI:
            return bucket.config.get("boto3_config", {}).get("endpoint_url", None)
        raise ValueError(f"Received unhandled store type '{bucket.get('store_type')}'")
    return bucket.endpoint_url


def serialize_bucket(bucket):
    return {
        "id": bucket.id,
        "name": bucket.name,
        "organization": bucket.organization.id,
        "endpoint_url": _get_endpoint_url(bucket),
        "archive_sc": bucket.archive_sc,
        "live_sc": bucket.live_sc,
        "store_type": bucket.store_type.value,
    }


class BucketListAPI(BaseListView):
    """ List endpoint for Buckets.
    """
    schema = BucketListSchema()
    permission_classes = [OrganizationAdminPermission]
    http_method_names = ['get', 'post']

    def _get(self, params):
        # Make sure user has access to this organization.
        affiliation = Affiliation.objects.filter(organization=params['organization'],
                                                 user=self.request.user)
        if affiliation.count() == 0:
            raise PermissionDenied
        if affiliation[0].permission != 'Admin':
            raise PermissionDenied
        buckets = Bucket.objects.filter(organization=params['organization'])
        return [serialize_bucket(bucket) for bucket in buckets]

    def _post(self, params):
        params['organization'] = get_object_or_404(Organization, pk=params['organization'])
        del params['body']
        store_type = params["store_type"]

        # Validate live and archive storage classes
        params = Bucket.validate_storage_classes(ObjectStore(store_type), params)
        bucket = Bucket.objects.create(**params)
        return {'message': f"Bucket {bucket.name} created!", 'id': bucket.id}

class BucketDetailAPI(BaseDetailView):
    """ Detail endpoint for Buckets.
    """
    schema = BucketDetailSchema()
    permission_classes = [OrganizationAdminPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        # Make sure bucket exists.
        buckets = Bucket.objects.filter(pk=params['id'])
        if buckets.count() == 0:
            raise Http404

        # Make sure user has access to this organization.
        affiliation = Affiliation.objects.filter(organization=buckets[0].organization,
                                                 user=self.request.user)
        if affiliation.count() == 0:
            raise PermissionDenied
        if affiliation[0].permission != 'Admin':
            raise PermissionDenied

        return serialize_bucket(buckets[0])

    @transaction.atomic
    def _patch(self, params):
        mutated = False
        bucket = Bucket.objects.select_for_update().get(pk=params['id'])
        store_type = params.get("store_type") or bucket.store_type
        Bucket.validate_storage_classes(ObjectStore(store_type), params)
        if "name" in params:
            mutated = True
            bucket.name = params["name"]
        if "archive_sc" in params:
            mutated = True
            bucket.archive_sc = params["archive_sc"]
        if "live_sc" in params:
            mutated = True
            bucket.live_sc = params["live_sc"]
        if "store_type" in params:
            mutated = True
            bucket.store_type = params["store_type"]
        if "config" in params:
            mutated = True
            bucket.config = params["config"]
        if mutated:
            bucket.save()
        return {"message": f"Bucket {params['id']} updated successfully!"}

    def _delete(self, params):
        bucket = Bucket.objects.get(pk=params['id'])
        bucket.delete()
        return {'message': f'Bucket {params["id"]} deleted successfully!'}

    def get_queryset(self):
        return Bucket.objects.all()
