from types import SimpleNamespace

html_file_fields = SimpleNamespace(
    project="project",
    name="name",
    upload_url="upload_url",
    url="url")

html_file = {
    'type': 'object',
    'properties': {
        html_file_fields.url: {
            'description': 'Name of HTML file',
            'type': 'string',
        }
    },
}

html_file_spec = {
    'type': 'object',
    'description': 'HTML file save spec.',
    'properties': {
        html_file_fields.name: {
            'description': 'Name of HTML file',
            'type': 'string',
        },
        html_file_fields.upload_url: {
            'description': 'URL of the uploaded file',
            'type': 'string',
        },
    },
}