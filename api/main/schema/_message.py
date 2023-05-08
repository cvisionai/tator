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
