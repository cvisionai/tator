from django.db import transaction
from django.shortcuts import get_object_or_404

from ..models import Affiliation
from ..models import Bucket
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
        return database_qs(self.get_queryset())

    def _post(self, params):
        params['organization'] = get_object_or_404(Organization, pk=params['organization'])
        del params['body']
        bucket = Bucket.objects.create(**params)
        return {'message': f"Bucket {bucket.name} created!", 'id': bucket.id}

    def get_queryset(self):
        affiliations = Affiliation.objects.filter(user=self.request.user, permission='Admin')
        organization_ids = affiliations.values_list('organization', flat=True)
        buckets = Bucket.objects.filter(organization__in=organization_ids).order_by('id')
        return buckets

class BucketDetailAPI(BaseDetailView):
    """ Detail endpoint for Buckets.
    """
    schema = ProjectDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        bucket = Bucket.objects.filter(pk=params['id'])
        return database_qs(bucket)[0]

    @transaction.atomic
    def _patch(self, params):
        bucket = Bucket.objects.select_for_update().get(pk=params['id']) 
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
        bucket.save()
        return {'message': f"Bucket {params['id']} updated successfully!"}

    def _delete(self, params):
        bucket = Bucket.objects.get(pk=params['id'])
        bucket.delete()
        return {'message': f'Bucket {params["id"]} deleted successfully!'}

    def get_queryset(self):
        return Bucket.objects.all()
