table_of_builtins = """
<table border="1">
    <tr>
        <th>Name</th>
        <th>Description</th>
        <th>Localizations</th>
        <th>States</th>
        <th>Medias</th>
        <th>Leaves</th>
        <th>Files</th>
    </tr>
    <tr>
        <td>section</td>
        <td>Media section</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>created_datetime</td>
        <td>The time of creation for this datum</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
    </tr>
    <tr>
        <td>created_by</td>
        <td>The user id who created this datum</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
    </tr>
    <tr>
        <td>modified_datetime</td>
        <td>The last modification time</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
    </tr>
    <tr>
        <td>modified_by</td>
        <td>The last modification user</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
    </tr>
    <tr>
        <td>name</td>
        <td>The name of the element</td>
        <td></td>
        <td></td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
    </tr>
    <tr>
        <td>fps</td>
        <td>The frames per second</td>
        <td></td>
        <td></td>
        <td>X</td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>deleted</td>
        <td>Whether the media is marked deleted</td>
        <td></td>
        <td></td>
        <td>X</td>
        <td>X</td>
        <td>X</td>
    </tr>
    <tr>
        <td>variant_deleted</td>
        <td>Whether the metadata is marked deleted</td>
        <td>X</td>
        <td>X</td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>archive_state</td>
        <td>The current archive state of the media</td>
        <td></td>
        <td></td>
        <td>X</td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>x, y, u, or v</td>
        <td>Geometric coordinates</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>width or height</td>
        <td>Geometric sizes</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>incident</td>
        <td>Available when doing a related search</td>
        <td></td>
        <td></td>
        <td>X</td>
        <td></td>
        <td></td>
    </tr>
</table>
"""

table_of_specials = """
<table border="1">
    <tr>
        <th>Name</th>
        <th>Description</th>
        <th>Localizations</th>
        <th>States</th>
        <th>Medias</th>
        <th>Leaves</th>
        <th>Files</th>
    </tr>
    <tr>
        <td>related_localizations</td>
        <td>Returns media that contain localizations that match this subquery</td>
        <td></td>
        <td></td>
        <td>X</td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>related_states</td>
        <td>Returns media that contain states that match this subquery</td>
        <td></td>
        <td></td>
        <td>X</td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>related_media</td>
        <td>Returns metadata that is associated with media matching this subquery</td>
        <td>X</td>
        <td>X</td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>coincident_states</td>
        <td>Returns metadata that is coincident with state(s) (same frame/media)</td>
        <td>X</td>
        <td>X</td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>coincident_localizations</td>
        <td>Returns metadata that is coincident with a localization(s) (same frame/media)</td>
        <td>X</td>
        <td>X</td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
</table>
"""
attribute_filter_schema = {
    "type": "object",
    "description": "Object to query on attribute",
    "properties": {
        "attribute": {
            "type": "string",
            "description": """Name of the attribute or field to search on. 
              
              Given a user defined type (Localization, State, or Media) with defined attributes 
              any attribute is searchable by its name. If a Localization has an attribute named 'Species' 
              the name to use to search on that column is 'Species'. 

              Additional built-in columns are available to search on dependent on the underlying metadata
              type being searched. To search a built in field, a '$' character must be used in front of the column
              name from main.models.
              
              The following table shows common columns and to which types they apply. Any internal column 
              of the model may be searched in this manner.
              
              '$' must precede these names in search attempts. E.g. `created_by` is supplied as `$created_by`.
              """
            + table_of_builtins
            + "<br /><br />The following special columns are available for searching on related data. Also must be preceded with a '$'."
            + table_of_specials
            + "<b>IMPORTANT:</b> Only the 'search' operation is valid for these special columns",
        },
        "operation": {
            "type": "string",
            "description": "Name of the operation to apply. Not all operations apply to all attributes.",
            "enum": [
                "eq",
                "gt",
                "gte",
                "lt",
                "lte",
                "icontains",
                "iendswidth",
                "istartswith",
                "isnull",
                "in",
                # Date specific operations
                "date_eq",
                "date_gte",
                "date_gt",
                "date_lt",
                "date_lte",
                "date_range",
                "distance_lte",
                # special operation
                "search",  # only valid operation for $coincident searches
            ],
        },
        "inverse": {
            "type": "boolean",
            "description": "Whether to apply NOT to result",
            "default": False,
        },
        "value": {"$ref": "#/components/schemas/AttributeValue"},
    },
}

attribute_combinator_schema = {
    "type": "object",
    "description": "Used to combine multiple operations with a method",
    "properties": {
        "method": {
            "type": "string",
            "description": "Method to combine ",
            "enum": ["and", "or", "not"],
        },
        "operations": {
            "type": "array",
            "description": "Must be a AttributeOperationSpec!",
            "items": {"type": "object"},
        },
    },
}

attribute_operation_schema = {
    "description": """Operation(s) to apply to attribute(s) for a complex filter
  
  Basic:
  ``` 
  # Matches Freddie Mercury or Fred Thompson
  {'attribute': 'name', 'operation': 'icontains', 'value': 'Fred'}
  ```

  Combination
  ```
  # Matches "Freddie Mercury or "Fred Thompson" or "Robert Redford". SQL Looks like "name LIKE Fred% OR name LIKE Robert%"
  {'method':'OR', 'operations': [{'attribute': 'name', 'operation': 'icontains', 'value': 'Fred' },{'attribute': 'name', 'operation': 'icontains', 'value': 'Robert' }]}
  ```
   
  Nested Combination
  ```
  # Matches "Freddie Mercury or "Fred Thompson" or "Robert Redford". SQL Looks like "age >= 30 AND (name LIKE Fred% OR name LIKE Robert%)"
  {'method': 'AND', 'operations': [{'method':'OR', 'operations': [{'attribute': 'name', 'operation': 'icontains', 'value': 'Fred' },{'attribute': 'name', 'operation': 'icontains', 'value': 'Robert' }]}, {'attribute': 'age', 'operation': 'gte', 'value': 30 }]}
  ```
   """,
    "anyOf": [
        {"$ref": "#/components/schemas/AttributeCombinatorSpec"},
        {"$ref": "#/components/schemas/AttributeFilterSpec"},
    ],
}
