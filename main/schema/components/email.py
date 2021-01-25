email_spec = {
    'type': 'object',
    'description': 'Send an email message to members of the project using the Tator configured AWS email service',
    'required': ['recipients', 'subject', 'text'],
    'properties': {
        'recipients': {
            'description': 'Recipients of the email message. They must be members of this project. Entries are either in "Name <email@email.com>" or "email@email.com',
            'type': 'array',
            'items': {'type': 'string'},
        },
        'subject': {
            'description': 'Subject of the email message',
            'type': 'string',
        },
        'text': {
            'description': 'Text body of the email message. HTML is currently not supported.',
            'type': 'string',
        },
        'attachments': {
            'description': 'S3 object keys of the attachments to send',
            'type': 'array',
            'items': {'type': 'string'},
        },
    },
}
