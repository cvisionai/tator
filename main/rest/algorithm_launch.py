import traceback
import logging
from uuid import uuid1

from rest_framework.views import APIView
from rest_framework.schemas.openapi import AutoSchema
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Case
from django.db.models import When
from django.http import Http404

from ..models import Algorithm
from ..models import EntityMediaBase
from ..kube import TatorAlgorithm
from ..consumers import ProgressProducer

from ._schema import parse
from ._media_query import query_string_to_media_ids
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)

class AlgorithmLaunchSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Algorithm']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['algorithm_name'],
                    'properties': {
                        'algorithm_name': {
                            'description': 'Name of the algorithm to execute.',
                            'type': 'string',
                        },
                        'media_query': {
                            'description': 'Query string used to filter media IDs. Must '
                                           'supply media_query or media_ids.',
                            'type': 'string',
                        },
                        'media_ids': {
                            'description': 'List of media IDs. Must supply media_query '
                                           'or media_ids.',
                            'type': 'array',
                            'items': {'type': 'integer'},
                        },
                    },
                },
                'examples': {
                    'by_query': {
                        'summary': 'Launch by query',
                        'value': {
                            'algorithm_name': 'My Algorithm',
                            'media_query': '?project=1&type=2',
                        },
                    },
                    'by_ids': {
                        'summary': 'Launch by media ids',
                        'value': {
                            'algorithm_name': 'My Algorithm',
                            'media_ids': [1, 5, 10],
                        },
                    },
                },
            }}}
        return body

def media_batches(media_list, files_per_job):
    for i in range(0, len(media_list), files_per_job):
        yield media_list[i:i + files_per_job]

class AlgorithmLaunchAPI(APIView):
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

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entityType=None
            params = parse(request)

            # Find the algorithm
            project_id = params['project']
            alg_name = params['algorithm_name']
            alg_obj = Algorithm.objects.filter(project__id=project_id)
            alg_obj = alg_obj.filter(name=alg_name)
            if len(alg_obj) != 1:
                raise Http404
            alg_obj = alg_obj[0]
            files_per_job = alg_obj.files_per_job

            media_ids = []
            # Get media IDs
            if 'media_query' in params:
                media_ids = query_string_to_media_ids(project_id, params['media_query'])
            elif 'media_ids' in params:
                media_ids = params['media_ids']
            else:
                media = EntityMediaBase.objects.filter(project=project_id)
                media_ids = list(media.values_list("id", flat=True))
            media_ids = [str(a) for a in media_ids]

            # Create algorithm jobs
            gid = str(uuid1())
            submitter = TatorAlgorithm(alg_obj)
            token, _ = Token.objects.get_or_create(user=request.user)
            for batch in media_batches(media_ids, files_per_job):
                run_uid = str(uuid1())
                batch_str = ','.join(batch)
                batch_int = [int(pk) for pk in batch]
                batch_order = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(batch_int)])
                qs = EntityMediaBase.objects.filter(pk__in=batch_int).order_by(batch_order)
                sections = qs.values_list('attributes__tator_user_sections', flat=True)
                sections = ','.join(list(sections))
                alg_response = submitter.start_algorithm(
                    media_ids=batch_str,
                    sections=sections,
                    gid=gid,
                    uid=run_uid,
                    token=token,
                    project=project_id,
                    user=request.user.pk,
                )

                # Send out a progress message saying this launch is queued.
                prog = ProgressProducer(
                    'algorithm',
                    project_id,
                    gid,
                    run_uid,
                    alg_name,
                    self.request.user,
                    {'media_ids': batch_str, 'sections': sections},
                )
                prog.queued("Queued...")

            response = Response({'message': f"Algorithm {alg_name} started successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            logger.info(traceback.format_exc())
        finally:
            return response;

