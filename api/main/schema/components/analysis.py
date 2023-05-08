from types import SimpleNamespace

fields = SimpleNamespace(id="id", name="name", data_query="data_query")

analysis_properties = {
    fields.name: {
        "description": "Name of analysis.",
        "type": "string",
    },
    fields.data_query: {
        "description": "Lucene query string used to retrieve entities " "to analyze.",
        "type": "string",
        "default": "*",
    },
}

analysis_spec = {
    "type": "object",
    "required": [fields.name, fields.data_query],
    "properties": analysis_properties,
}

analysis = {
    "type": "object",
    "properties": {
        fields.id: {
            "type": "integer",
            "description": "Unique integer identifying the analysis.",
        },
        **analysis_properties,
    },
}
