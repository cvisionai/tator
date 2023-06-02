from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema

boilerplate = dedent(
    """\
Buckets allow users to specify a project-specific S3 bucket to store media. Buckets are defined
at the Organization level. Creating and setting a bucket on a project requires administrative
access within the organization. Once a bucket is defined for a project, all media subsequently
uploaded to that project will be stored in the bucket. Projects may have media in multiple
buckets. For example, if a project is initially created without setting a separate bucket
and media is uploaded, then the bucket field is updated and more media is uploaded, that 
project would then contain some media in the default bucket and some in the newly defined bucket.
"""
)


class BucketListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateBucket"
        elif method == "GET":
            operation["operationId"] = "GetBucketList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get bucket list."
        elif method == "POST":
            short_desc = "Create bucket."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "organization",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying an organization.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return {}

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BucketSpec"},
                        "example": {
                            "name": "my-bucket",
                            "store_type": "AWS",
                            "config": {
                                "aws_access_key_id": "ALSDKFOIWEFMLKASDFKJK",
                                "aws_secret_access_key": "LSKDJjksldjfwieoJOASDlkalkdk48+JKF7SDLFIh",
                                "endpoint_url": "https://s3.us-east-2.amazonaws.com",
                                "region_name": "us-east-2",
                            },
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of bucket list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Bucket"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_schema("bucket")
        return responses


class BucketDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetBucket"
        elif method == "PATCH":
            operation["operationId"] = "UpdateBucket"
        elif method == "DELETE":
            operation["operationId"] = "DeleteBucket"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get bucket."
        elif method == "PATCH":
            short_desc = "Update bucket."
        elif method == "DELETE":
            short_desc = "Delete bucket."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a bucket.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BucketUpdate"},
                        "example": {
                            "name": "my-other-bucket",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of bucket.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Bucket",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema("update", "bucket")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "bucket")
        return responses
