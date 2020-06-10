from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_with_id_schema

from .components import video_spec
from .components import video_update

class SaveVideoSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'SaveVideo'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateVideo'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Saves a transcoded video.

        Videos in Tator must be transcoded to a multi-resolution streaming format before they
        can be viewed or annotated. To launch a transcode on raw uploaded video, use the
        `Transcode` endpoint, which will create an Argo workflow to perform the transcode
        and save the video using this endpoint; no further REST calls are required. However,
        if you would like to perform transcodes locally, this endpoint enables that.
        """)

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
                'schema': {'$ref': '#/components/schemas/VideoSpec'},
            }}}
        elif method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/VideoUpdate'},
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = message_with_id_schema('video')
        return responses

