def error_responses():
    return {
        "404": {
            "description": "Not found.",
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/NotFoundResponse",
                    }
                }
            },
        },
        "400": {
            "description": "Bad request.",
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/BadRequestResponse",
                    }
                }
            },
        },
    }
