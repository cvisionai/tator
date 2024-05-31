def message_schema(action, name):
    return {
        "description": f"Successful {action} of {name}.",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/MessageResponse",
                }
            }
        },
    }


def message_schema_with_obj(action, name, obj):
    return {
        "description": f"Successful {action} of {name}.",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Message explaining response.",
                        },
                        "object": {
                            "$ref": obj,
                        },
                    },
                }
            }
        },
    }


def message_schema_with_id(action, name):
    return {
        "description": f"Successful {action} of {name}.",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Message explaining response.",
                        },
                        "id": {
                            "type": "integer",
                            "description": "ID of the new object.",
                        },
                    },
                }
            }
        },
    }


def message_with_id_schema(name):
    return {
        "description": f"Successful creation of {name}.",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/CreateResponse",
                }
            }
        },
    }


def message_with_id_list_schema(name):
    return {
        "description": f"Successful creation of {name}.",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/CreateListResponse",
                }
            }
        },
    }
