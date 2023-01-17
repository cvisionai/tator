from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class AlgorithmLaunchSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'AlgorithmLaunch'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Launch a registered algorithm.

        This will create one or more Argo workflows that execute the named algorithm
        registration. To get a list of available algorithms, use the `Algorithms` endpoint.
        A media list will be submitted for processing using either a query string or 
        a list of media IDs. If neither are included, the algorithm will be launched on
        all media in the project. 

        Media is divided into batches for based on the `files_per_job` field of the 
        `Algorithm` object. One batch is submitted to each Argo workflow.

        Submitted algorithm jobs may be cancelled via the `Job` or `JobGroup` endpoints.
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
                'schema': {'$ref': '#/components/schemas/AlgorithmLaunchSpec'},
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

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = {
                'description': 'Successful launch of algorithm.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/AlgorithmLaunch',
                }}}
            }
        return responses

