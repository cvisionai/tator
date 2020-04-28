from rest_framework.schemas.openapi import AutoSchema

class TemporaryFileDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['TemporaryFile']
        return operation
