from rest_framework.views import APIView
from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi

from ..kube import TatorAlgorithm

from ._permissions import ProjectExecutePermission

def media_batches(media_list, files_per_job):
    for i in range(0, len(media_list), files_per_job):
        yield media_list[i:i + files_per_job]

class AlgorithmLaunchAPI(APIView):
    """
    Start an algorithm.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
        coreapi.Field(name='algorithm_name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the algorithm to execute.')),
        coreapi.Field(name='media_query',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Query string used to filter media IDs. (Must supply media_query or media_ids)')),
        coreapi.Field(name='media_ids',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='List of media IDs. (Must supply media_query or media_ids)')),
    ])
    permission_classes = [ProjectExecutePermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entityType=None
            reqObject=request.data;

            ## Check for required fields first
            if 'algorithm_name' not in reqObject:
                raise Exception('Missing required field in request object "algorithm_name"')

            # Find the algorithm
            project_id = self.kwargs['project']
            alg_name = reqObject['algorithm_name']
            alg_obj = Algorithm.objects.filter(project__id=project_id)
            alg_obj = alg_obj.filter(name=alg_name)
            if len(alg_obj) != 1:
                raise Http404
            alg_obj = alg_obj[0]
            files_per_job = alg_obj.files_per_job

            media_ids = []
            # Get media IDs
            if 'media_query' in reqObject:
                media_ids = query_string_to_media_ids(project_id, reqObject['media_query'])
            elif 'media_ids' in reqObject:
                media_ids = reqObject['media_ids']
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
                response = submitter.start_algorithm(
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

