credentials = {
    "type": "object",
    "required": ["username", "password"],
    "properties": {
        "username": {
            "description": "Account username.",
            "type": "string",
        },
        "password": {
            "description": "Account password.",
            "type": "string",
        },
        "refresh": {
            "description": "If true, forces generation of new token.",
            "type": "boolean",
        },
    },
}

token = {
    "type": "object",
    "properties": {
        "token": {
            "description": "API token.",
            "type": "string",
        },
    },
}
