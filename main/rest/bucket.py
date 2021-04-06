from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404

from ..models import Organization
from ..models import Affiliation
from ..models import Bucket
from ..models import database_qs
from ..store import TatorStorage
from ..schema import BucketListSchema
from ..schema import BucketDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import OrganizationAdminPermission

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
        return database_qs(buckets)

    def _post(self, params):
        params['organization'] = get_object_or_404(Organization, pk=params['organization'])
        del params['body']

        # Create a temporary Bucket object for storage class validation
        temp_bucket = Bucket(**params)
        params = temp_bucket.validate_storage_classes(params)
        del temp_bucket

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

        return database_qs(buckets)[0]

    @transaction.atomic
    def _patch(self, params):
        bucket = Bucket.objects.select_for_update().get(pk=params['id'])
        bucket.validate_storage_classes(params)

        if 'name' in params:
            bucket.name = params['name']
        if 'access_key' in params:
            bucket.access_key = params['access_key']
        if 'secret_key' in params:
            bucket.secret_key = params['secret_key']
        if 'endpoint_url' in params:
            bucket.endpoint_url = params['endpoint_url']
        if 'region' in params:
            bucket.region = params['region']
        if "archive_sc" in params:
            bucket.archive_sc = params["archive_sc"]
        if "live_sc" in params:
            bucket.live_sc = params["live_sc"]
        bucket.save()
        return {'message': f"Bucket {params['id']} updated successfully!"}

    def _delete(self, params):
        bucket = Bucket.objects.get(pk=params['id'])
        bucket.delete()
        return {'message': f'Bucket {params["id"]} deleted successfully!'}

    def get_queryset(self):
        return Bucket.objects.all()
