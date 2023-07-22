notify_spec = {
    "type": "object",
    "required": ["message"],
    "properties": {
        "message": {
            "description": "Message to send to administrators.",
            "type": "string",
        },
        "send_as_file": {
            "description": "Whether to send message as a file. (0 or 1)",
            "type": "integer",
        },
    },
}
