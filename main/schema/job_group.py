from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._errors import error_responses

class JobGroupDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'DELETE':
            operation['operationId'] = 'DeleteJobGroup'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Cancel a group of background jobs.

        Algorithms and transcodes create argo workflows that are annotated with two
        uuid1 strings, one identifying the run and the other identifying the group.
        Jobs that are submitted together have the same group id, but each workflow
        has a unique run id.

        This endpoint allows the user to cancel a group of jobs using the `group_id` 
        returned by either the `AlgorithmLaunch` or `Transcode` endpoints.
        """)

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'group_id',
            'in': 'path',
            'required': True,
            'description': 'A uuid1 string identifying a group of jobs.',
            'schema': {'type': 'string'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'DELETE':
            responses['200'] = message_schema('cancellation', 'job group')
        return responses

