from rest_framework.schemas.openapi import AutoSchema

class JobDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'DELETE':
            operation['operationId'] = 'DeleteJob'
        operation['tags'] = ['Job']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'run_uid',
            'in': 'path',
            'required': True,
            'description': 'A uuid1 string identifying to single Job.',
            'schema': {'type': 'string'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = {}
        responses['404'] = {'description': 'Failure to find the job with given uuid.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful cancellation of the job.'}
        return responses
