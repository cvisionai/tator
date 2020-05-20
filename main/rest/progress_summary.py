import traceback
import logging
import os
import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from redis import Redis

from ..schema import ProgressSummarySchema
from ..schema import parse

logger = logging.getLogger(__name__)

class ProgressSummaryAPI(APIView):
    """ Create or update a progress summary.

        This endpoint sets a key in redis that indicates how many jobs are in
        a job group as well as how many are completed. This is used to display
        summary progress in the progress bar. If not used for a given job group,
        the job completion is computed from the status of individual jobs in
        the group.
    """
    schema = ProgressSummarySchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            rds = Redis(host=os.getenv('REDIS_HOST'))
            rds.hset('num_jobs', str(params['gid']), params['num_jobs'])
            rds.hset('num_complete', str(params['gid']), params['num_complete'])
            response = Response({'message': f"Progress summary sent for group ID {params['gid']}!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        return response;

