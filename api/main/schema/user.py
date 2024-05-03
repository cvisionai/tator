from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema


class UserExistsSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "UserExists"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            return "Returns whether a user exists."

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        params = []
        if method == "GET":
            params = [
                {
                    "name": "username",
                    "in": "query",
                    "required": False,
                    "description": "Username associated with user. Either this or email must be supplied.",
                    "schema": {"type": "string"},
                },
                {
                    "name": "email",
                    "in": "query",
                    "required": False,
                    "description": "Email address associated with user. Either this or email must be "
                    "supplied.",
                    "schema": {"type": "string"},
                },
                {
                    "name": "elemental_id",
                    "in": "query",
                    "required": False,
                    "description": "Elemental_id of user",
                    "schema": {"type": "string"},
                },
            ]
        return params

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of user list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "boolean",
                        }
                    }
                },
            }
        return responses


class UserListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetUserList"
        elif method == "POST":
            operation["operationId"] = "CreateUser"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            return "Get list of users."
        elif method == "POST":
            return dedent(
                """\
            Create user.

            This method accepts a registration token that is provided by creating a
            Invitation object. It is optional if anonymous registration is enabled, but
            otherwise required. If anonymous registration is enabled and email confirmation
            is also enabled, the method will create an inactive user with a confirmation
            token. The user can be activated by visiting a link that is automatically sent
            to the user. If anonymous registration without confirmation is enabled, any
            user can be created with this method.
            """
            )

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        params = []
        if method == "GET":
            params = [
                {
                    "name": "username",
                    "in": "query",
                    "required": False,
                    "description": "Username associated with user. Either this or email must be supplied.",
                    "schema": {"type": "string"},
                },
                {
                    "name": "email",
                    "in": "query",
                    "required": False,
                    "description": "Email address associated with user. Either this or email must be "
                    "supplied.",
                    "schema": {"type": "string"},
                },
                {
                    "name": "elemental_id",
                    "in": "query",
                    "required": False,
                    "description": "Elemental_id of user",
                    "schema": {"type": "string"},
                },
                {
                    "name": "presigned",
                    "in": "query",
                    "required": False,
                    "description": "If given, all object key fields in `profile` will be "
                    "replaced with presigned URLs that can be downloaded without "
                    "authentication. The value is the expiration time of the URLs "
                    "in seconds.",
                    "schema": {"type": "integer", "minimum": 1, "maximum": 604800},
                },
            ]
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/UserSpec",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of user list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/User"},
                        }
                    }
                },
            }
        return responses


class UserDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetUser"
        elif method == "PATCH":
            operation["operationId"] = "UpdateUser"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get user."
        elif method == "PATCH":
            short_desc = "Update user."
        return f"{short_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a user.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return [
            {
                "name": "presigned",
                "in": "query",
                "required": False,
                "description": "If given, all object key fields in `profile` will be "
                "replaced with presigned URLs that can be downloaded without "
                "authentication. The value is the expiration time of the URLs "
                "in seconds.",
                "schema": {"type": "integer", "minimum": 1, "maximum": 604800},
            }
        ]

    def get_request_body(self, path, method):
        body = {}
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/UserUpdate"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of user.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/User",
                        }
                    }
                },
            }
        return responses


class CurrentUserSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "Whoami"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        return dedent(
            """\
        Get current user.

        Retrieves user making the request.
        """
        )

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        return [
            {
                "name": "presigned",
                "in": "query",
                "required": False,
                "description": "If given, all object key fields in `profile` will be "
                "replaced with presigned URLs that can be downloaded without "
                "authentication. The value is the expiration time of the URLs "
                "in seconds.",
                "schema": {"type": "integer", "minimum": 1, "maximum": 604800},
            }
        ]

    def get_responses(self, path, method):
        responses = {
            "200": {
                "description": "Successful retrieval of user who sent request.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/User",
                        }
                    }
                },
            },
        }
        return responses
