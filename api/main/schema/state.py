from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_with_id_list_schema
from ._message import message_schema
from ._attributes import attribute_filter_parameter_schema, related_attribute_filter_parameter_schema
from ._annotation_query import annotation_filter_parameter_schema

boilerplate = dedent("""\
A state is a description of a collection of other objects. The objects a state describes
could be media (image or video), video frames, or localizations. A state referring
to a collection of localizations is often referred to as a track. States are
a type of entity in Tator, meaning they can be described by user defined attributes.
""")

class StateListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateStateList'
        elif method == 'GET':
            operation['operationId'] = 'GetStateList'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateStateList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteStateList'
        elif method == 'PUT':
            operation['operationId'] = 'GetStateListById'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        long_desc = ''
        if method == 'GET':
            short_desc = 'Get state list.'
        elif method == 'POST':
            short_desc = 'Create state list.'
            long_desc = dedent("""\
            This method does a bulk create on a list of `StateSpec` objects. A 
            maximum of 500 states may be created in one request.
            """)
        elif method == 'PATCH':
            short_desc = 'Update state list.'
            long_desc = dedent("""\
            This method does a bulk update on all states matching a query. Only 
            user-defined attributes may be bulk updated.
            """)
        elif method == 'DELETE':
            short_desc = 'Delete state list.'
            long_desc = dedent("""\
            This method performs a bulk delete on all states matching a query. It is 
            recommended to use a GET request first to check what is being deleted.
            """)
        elif method == 'PUT':
            short_desc = 'Get state list by ID.'
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        params = []
        if method in ['GET', 'PUT', 'PATCH', 'DELETE']:
            params = annotation_filter_parameter_schema + attribute_filter_parameter_schema + related_attribute_filter_parameter_schema
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {
                            'oneOf': [
                                {
                                    'type': 'array',
                                    'items': {'$ref': '#/components/schemas/StateSpec'},
                                    'maxItems': 500
                                },
                                {
                                    '$ref': '#/components/schemas/StateSpec',
                                },
                            ],
                        },
                        'examples': {
                            'frame': {
                                'summary': 'Frame associated state',
                                'value': {
                                    'type': 1,
                                    'media_ids': [1],
                                    'frame': 1000,
                                    'My First Attribute': 'value1',
                                    'My Second Attribute': 'value2',
                                },
                            },
                            'localization': {
                                'summary': 'Localization associated state',
                                'value': {
                                    'type': 1,
                                    'media_ids': [1],
                                    'localization_ids': [1, 5, 10],
                                    'My First Attribute': 'value1',
                                    'My Second Attribute': 'value2',
                                },
                            },
                            'media': {
                                'summary': 'Media associated state',
                                'value': {
                                    'type': 1,
                                    'media_ids': [1, 5, 10],
                                    'My First Attribute': 'value1',
                                    'My Second Attribute': 'value2',
                                },
                            },
                        },
                    }
                }
            }
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/StateBulkUpdate'},
                'examples': {
                    'single': {
                        'summary': 'Update Species attribute of many states',
                        'value': {
                            'attributes': {
                                'Species': 'Tuna',
                            }
                        },
                    },
                }
            }}}
        if method == 'PUT':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/StateIdQuery',
                },
            }}}
        if method == 'DELETE':
            body = {
                'required': False,
                'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/StateBulkDelete',
                },
            }}}
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method in ['GET', 'PUT']:
            responses['200'] = {
                'description': 'Successful retrieval of state list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/State'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_list_schema('state(s)')
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'state list')
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'state list')
        return responses

class StateDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetState'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateState'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteState'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        if method == 'GET':
            short_desc = 'Get state.'
        elif method == 'PATCH':
            short_desc = 'Update state.'
        elif method == 'DELETE':
            short_desc = 'Delete state.'
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a state.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/StateUpdate'},
                'example': {
                    'frame': 1001,
                }
            }}}
        elif method == 'DELETE':
            body = {
                'required': False,
                'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/StateDelete',
                }}}
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of state.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/State',
                }}},
            }
        if method == 'PATCH':
            responses['200'] = message_schema('update', 'state')
        if method == 'DELETE':
            responses['200'] = message_schema('deletion', 'state')
        return responses

class StateGraphicSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetStateGraphic'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
         Get frame(s) of a given localization-associated state.

        Use the mode argument to control whether it is an animated gif or a tiled jpg. A maximum
        of 100 detections may be retrieved at once. Use the length and offset parameters to 
        control which section of a state is retrieved.
        """)

    def get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a state.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        return [
            {
                'name': 'mode',
                'in': 'query',
                'required': False,
                'description': 'Whether to animate or tile.',
                'schema': {
                    'type': 'string',
                    'enum': ['animate', 'tile'],
                    'default': 'animate',
                },
            },
            {
                'name': 'fps',
                'in': 'query',
                'required': False,
                'description': 'Frame rate if `mode` is `animate`.',
                'schema': {
                    'type': 'number',
                    'default': 2,
                },
            },
            {
                'name': 'force_scale',
                'in': 'query',
                'required': False,
                'description': 'wxh to force each tile prior to stich',
                'schema': {
                    'type': 'string',
                    'example': '512x512',
                    'default': '224x224',
                    'nullable': True,
                },
            },
            {
                'name': 'length',
                'in': 'query',
                'required': False,
                'description': 'Number of detections to extract.',
                'schema': {
                    'type': 'integer',
                    'example': 100,
                    'default': 100,
                    'maximum': 100,
                },
            },
            {
                'name': 'offset',
                'in': 'query',
                'required': False,
                'description': 'Index offset of detections to extract.',
                'schema': {
                    'type': 'integer',
                    'example': 0,
                    'default': 0,
                },
            },
        ]

    def get_request_body(self, path, method):
        return {}

    def get_responses(self, path, method):
        responses = {}
        if method == 'GET':
            responses['404'] = {
                'description': 'Not found.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
            responses['400'] = {
                'description': 'Bad request.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
            responses['200'] = {
                'description': 'Successful retrieval of state graphic.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
        return responses


class MergeStatesSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'PATCH':
            operation['operationId'] = 'MergeStates'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Merges the source state into the target state. 
        The target state will inherit the the source's localizations and will be deleted.
        """)

    def get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying the target state to accept the merge.',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/StateMergeUpdate'},
            }}}
        return body

    def get_responses(self, path, method):
        responses = {}
        if method == 'PATCH':
            responses['200'] = message_schema('update', 'state')
        return responses

class TrimStateEndSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'PATCH':
            operation['operationId'] = 'TrimStateEnd'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        return dedent("""\
        Trims the state's start or end point by deleting the localizations 
        before the new start point or after the new end point.
        """)

    def get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying the state to trim',
            'schema': {'type': 'integer'},
        }]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/StateTrimUpdate'},
            }}}
        return body

    def get_responses(self, path, method):
        responses = {}
        if method == 'PATCH':
            responses['200'] = message_schema('update', 'state')
        return responses

class StateByElementalIdSchema(StateDetailSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetStateByElementalId'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateStateByElementalId'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteStateByElementalId'
        operation['tags'] = ['Tator']
        return operation
    def get_path_parameters(self, path, method):
        return [{
            'name': 'version',
            'in': 'path',
            'required': True,
            'description': 'Version ID to select object from',
            'schema': {'type': 'integer'},
        },
        {
            'name': 'elemental_id',
            'in': 'path',
            'required': True,
            'description': 'Elemental ID to fetch',
            'schema': {'type': 'string'},
        },
        ]

    def get_filter_parameters(self, path, method):
        params = super().get_filter_parameters(path, method)
        if method == 'GET':
            params += [{
                'name': 'mark',
                'in': 'query',
                'required': False,
                'description': 'If given, select this mark of the element on this version. Defaults to LATEST.',
                'schema': {'type': 'integer',
                           'minimum': 0},
            }]
        return params