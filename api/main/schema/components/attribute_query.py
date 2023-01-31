attribute_filter_schema = {
        'type': 'object',
        'description': 'Object to query on attribute',
        'properties': {
          'attribute': {
              'type': 'string',
              'description': 'Name of the attribute',
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
