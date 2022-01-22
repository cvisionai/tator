from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class TranscodeSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'Transcode'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Start a transcode.

        Videos in Tator must be transcoded to a multi-resolution streaming format before they
        can be viewed or annotated. This endpoint launches a transcode on raw uploaded video by
        creating an Argo workflow. The workflow will download the uploaded raw video, transcode
        it to the proper format, upload the transcoded video, and save the video using the 
        `SaveVideo` endpoint.

        Note that the raw video must be uploaded first via tus, which is a separate mechanism 
        from the REST API. This endpoint requires a group and run UUID associated with this 
        upload. If no progress messages were generated during upload, then the group and run 
        UUIDs can be newly generated.

        Transcodes may be cancelled via the `Job` or `JobGroup` endpoints.
        """)

    def get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/TranscodeSpec'},
            }}}
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = {
                'description': 'Successful save of the video in the database.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Transcode',
                }}},
            }
        return responses

