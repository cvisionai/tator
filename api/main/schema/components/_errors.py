not_found_response = {
    "type": "object",
    "properties": {
        "message": {
            "type": "string",
            "description": "Message explaining not found error.",
        },
    },
}

bad_request_response = {
    "type": "object",
    "properties": {
        "message": {
            "type": "string",
            "description": "Error message for bad request.",
        },
        "details": {
            "type": "string",
            "description": "Detailed error message for bad request.",
        },
    },
}
