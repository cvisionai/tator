import yaml

def remove_oneof(data):
    """ Removes oneOf key from a dict and recursively calls this
        function on other dict values.
    """
    if 'oneOf' in data:
        del data['oneOf']
    for key in data:
        if isinstance(data[key], dict):
            remove_oneof(data[key])
    return data

if __name__ == '__main__':
    with open('schema.yaml', 'r') as f:
        schema = yaml.load(f)
    schema = remove_oneof(schema)
    with open('schema.yaml', 'w') as f:
        yaml.dump(schema, f)
    
