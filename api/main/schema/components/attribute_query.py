attribute_filter_schema = {
        'type': 'object',
        'description': 'Object to query on attribute',
        'properties': {
          'attribute': {
              'type': 'string',
              'description': """Name of the attribute or field to search on. 
              
              Given a user defined type (Localization, State, or Media) with defined attributes 
              any attribute is searchable by its name. If a Localization has an attribute named 'Species' 
              the name to use to search on that column is 'Species'. 

              Additional built-in columns are available to search on dependent on the underlying metadata
              type being searched. To search a built in field, a '$' character must be used in front of the column
              name from main.models.
              
              The following table shows common columns and to which types they apply. Any internal column 
              of the model may be searched in this manner.
              
              '$' must precede these names in search attempts. E.g. `created_by` is supplied as `$created_by`.
    
              | Name              | Description                            | Localizations | States | Medias | Leaves | Files | 
              |-------------------|----------------------------------------|---------------|--------|--------|--------|-------|
              | section           | Media section                          |       X       |   X    |   X    |        |       |
              | created_datetime  | The time of creation for this datum    |       X       |   X    |   X    |    X   |   X   |
              | created_by        | The user id who created this datum     |       X       |   X    |   X    |    X   |   X   |
              | modified_datetime | The last modification time             |       X       |   X    |   X    |    X   |   X   |
              | modified_by       | The last modification user             |       X       |   X    |   X    |    X   |   X   |
              | name              | The name of the element                |               |        |   X    |    X   |   X   |
              | fps               | The frames per second                  |               |        |   X    |        |       |
              | deleted           | Whether the media is marked deleted    |               |        |   X    |    X   |   X   |
              | variant_deleted   | Whether the metadata is marked deleted |       X       |   X    |        |        |       |
              | archive_state     | The current archive state of the media |               |        |   X    |        |       |
              | x, y, u, or v     | Geometric coordinates                  |               |        |        |        |       |
              | width or height   | Geometric sizes                        |               |        |        |        |       |

              
              """,
          },
          'operation': {
              'type': 'string',
              'description': 'Name of the operation to apply. Not all operations apply to all attributes.',
              'enum': ['eq', 
                       'gt', 
                       'gte', 
                       'lt', 
                       'lte', 
                       'icontains',
                       'iendswidth',
                       'istartswith',
                       'isnull', 
                       # Date specific operations
                       'date_eq',
                       'date_gte',
                       'date_gt',
                       'date_lt',
                       'date_lte',
                       'date_range',
                       'distance_lte',]
          },
          'inverse': {
              'type': 'boolean',
              'description': 'Whether to apply NOT to result',
              'default': False
          },
         'value': {'$ref': '#/components/schemas/AttributeValue'},
    }
}

attribute_combinator_schema = {
        'type': 'object',
        'description': 'Used to combine multiple operations with a method',
        'properties': {
          'method': {'type': 'string',
                        'description': 'Method to combine ',
                        'enum': ['and', 'or', 'not']},
          'operations':  {'type': 'array',
                          'description': 'Must be a AttributeOperationSpec!',
                          'items': {'type': 'object'}},
        }
}

attribute_operation_schema = {
   'description': """Operation(s) to apply to attribute(s) for a complex filter
  
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
    'anyOf': [
        {'$ref': '#/components/schemas/AttributeCombinatorSpec'},
        {'$ref': '#/components/schemas/AttributeFilterSpec'},
    ],
}
