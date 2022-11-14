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
              'enum': ['eq', 'gt', 'gte', 'lt', 'lte', 'icontains', 'distance_lte', 'isnull']
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
                        'enum': ['and', 'or']},
          'operations':  {'type': 'array',
                      'items': {'$ref': '#/components/schemas/AttributeOperationSpec'}},
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
    'oneOf': [
        {'$ref': '#/components/schemas/AttributeCombinatorSpec'},
        {'$ref': '#/components/schemas/AttributeFilterSpec'},
    ],
}
