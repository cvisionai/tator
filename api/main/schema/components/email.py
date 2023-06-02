email_attachment_spec = {
    "type": "object",
    "description": "Email attachment spec.",
    "required": ["key", "name"],
    "properties": {
        "key": {
            "description": "S3 key of file",
            "type": "string",
        },
        "name": {
            "description": "Name of file to use in attachment",
            "type": "string",
        },
    },
}

email_spec = {
    "type": "object",
    "description": "Send an email message to members of the project using the Tator configured AWS email service",
    "required": ["recipients", "subject", "text"],
    "properties": {
        "recipients": {
            "description": 'Recipients of the email message. They must be members of this project. Entries are either in "Name <email@email.com>" or "email@email.com" format',
            "type": "array",
            "items": {"type": "string"},
        },
        "subject": {
            "description": "Subject of the email message",
            "type": "string",
        },
        "text": {
            "description": "Text body of the email message. HTML is currently not supported.",
            "type": "string",
        },
        "attachments": {
            "description": "S3 object(s) to send as attachment(s). Ensure the attachment size does not exceed the corresponding email service limits",
            "type": "array",
            "items": {"$ref": "#/components/schemas/EmailAttachmentSpec"},
        },
    },
}
