from rest_framework.views import APIView
from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi

from ..models import Algorithm
from ..kube import TatorTranscode
from ..kube import TatorAlgorithm

from ._permissions import ProjectTransferPermission

class JobGroupDetailAPI(APIView):
    """
    Interact with a group of background jobs.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='group_id',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A uid identifying a queued or running job')),
    ])
    permission_classes = [ProjectTransferPermission]

    def delete(self, request, format=None, **kwargs):
        response=Response({})

        try:
            # Find the job and delete it.
            group_id = kwargs['group_id']
            transcode_cancelled = TatorTranscode().cancel_jobs(f'gid={group_id}')
            if not transcode_cancelled:
                for alg in Algorithm.objects.all():
                    algorithm_cancelled = TatorAlgorithm(alg).cancel_jobs(f'gid={group_id}')
                    if algorithm_cancelled:
                        break
            if not (transcode_cancelled or algorithm_cancelled):
                raise Http404

            response = Response({'message': f"Jobs with group ID {group_id} deleted!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

