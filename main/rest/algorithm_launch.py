import logging
from uuid import uuid1

from rest_framework.authtoken.models import Token
from django.db.models import Case
from django.db.models import When
from django.http import Http404

from ..models import Algorithm
from ..models import Media
from ..kube import TatorAlgorithm
from ..schema import AlgorithmLaunchSchema
from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._media_query import query_string_to_media_ids
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)

def media_batches(media_list, files_per_job):
    for i in range(0, len(media_list), files_per_job):
        yield media_list[i:i + files_per_job]

class AlgorithmLaunchAPI(BaseListView):
    """ Start an algorithm.

        This will create one or more Argo workflows that execute the named algorithm
        registration. To get a list of available algorithms, use the `Algorithms` endpoint.
        A media list will be submitted for processing using either a query string or
        a list of media IDs. If neither are included, the algorithm will be launched on
        all media in the project.

        Media is divided into batches for based on the `files_per_job` field of the
        `Algorithm` object. One batch is submitted to each Argo workflow.

        Submitted algorithm jobs may be cancelled via the `Job` or `JobGroup` endpoints.
    """
    schema = AlgorithmLaunchSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['post']

    def _post(self, params):
        entityType=None

        # Find the algorithm
        project_id = params['project']
        alg_name = params['algorithm_name']
        try:
            alg_obj = Algorithm.objects.get(project__id=project_id, name=alg_name)
        except:
            logger.error(
                "Could not find algorithm '{alg_name}' in project '{project_id}'", exc_info=True
            )
            raise Http404
        files_per_job = alg_obj.files_per_job

        media_ids = params['media_ids']
        media_ids = [str(a) for a in media_ids]

        # Harvest extra parameters to pass into the algorithm if requested
        extra_params = []
        if 'extra_params' in params:
            extra_params = params['extra_params']

        # Create algorithm jobs
        gid = str(uuid1())
        uids = []
        submitter = TatorAlgorithm(alg_obj)
        token, _ = Token.objects.get_or_create(user=self.request.user)
        for batch in media_batches(media_ids, files_per_job):
            uid = str(uuid1())
            uids.append(uid)
            batch_str = ','.join(batch)
            batch_int = [int(pk) for pk in batch]
            batch_order = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(batch_int)])
            qs = Media.objects.filter(pk__in=batch_int).order_by(batch_order)
            sections = qs.values_list('attributes__tator_user_sections', flat=True)
            sections = ','.join(list(sections))
            alg_response = submitter.start_algorithm(
                media_ids=batch_str,
                sections=sections,
                gid=gid,
                uid=uid,
                token=token,
                project=project_id,
                user=self.request.user.pk,
                extra_params=extra_params
            )
        return {'message': f"Algorithm {alg_name} started successfully!",
                'uid': uids,
                'gid': gid}

