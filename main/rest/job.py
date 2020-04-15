import traceback

from rest_framework.views import APIView
from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404

from ..models import Algorithm
from ..kube import TatorTranscode
from ..kube import TatorAlgorithm

from ._permissions import ProjectTransferPermission

class JobDetailAPI(APIView):
    """
    Interact with a background job.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='run_uid',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A uid identifying a queued or running job')),
    ])
    permission_classes = [ProjectTransferPermission]

    def delete(self, request, format=None, **kwargs):
        response=Response({})

        try:
            # Try finding the job via the kube api.
            # Find the job and delete it.
            run_uid = kwargs['run_uid']
            transcode_cancelled = TatorTranscode().cancel_jobs(f'uid={run_uid}')
            if not transcode_cancelled:
                for alg in Algorithm.objects.all():
                    algorithm_cancelled = TatorAlgorithm(alg).cancel_jobs(f'uid={run_uid}')
                    if algorithm_cancelled:
                        break
            if not (transcode_cancelled or algorithm_cancelled):
                raise Http404

            response = Response({'message': f"Job with run UID {run_uid} deleted!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

