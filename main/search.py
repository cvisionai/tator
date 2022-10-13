import logging
import os
import datetime
from copy import deepcopy
from uuid import uuid1

logger = logging.getLogger(__name__)

# Indicates what types can mutate into. Maps from type -> to type.
ALLOWED_MUTATIONS = {
    'bool': ['bool', 'enum', 'string'],
    'int': ['int', 'float'],
    'float': ['int', 'float'],
    'enum': ['enum', 'string'],
    'string': ['enum', 'string'],
    'datetime': [ 'string', 'datetime'],
    'geopos': ['geopos'],
    'float_array': ['float_array'],
}


class TatorSearch:
    """ Interface for managing psql indices
        There is one index per attribute type.
    """
  
    def create_index(self, project):
       pass

    def delete_index(self, project):
      pass
    def check_addition(self, entity_type, new_attribute_type):
        """
        Checks that the new attribute type does not collide with existing attributes on the target
        entity type or other entity types.
        """
        pass

    def create_mapping(self, entity_type):
        pass

    def check_rename(self, entity_type, old_name, new_name):
        """
        Checks rename operation and raises if it is invalid. See `rename_alias` for argument
        description.
        """
        pass

    def rename_alias(self, entity_type, old_name, new_name):
        """
        Adds an alias corresponding to an attribute type rename. Note that the old alias will still
        exist but can be excluded by specifying fields parameter in query_string queries. Entity
        type should contain an attribute type definition for old_name.

        :param entity_type: *Type object. Should be passed in before updating attribute_type json.
                            Fields attribute_types and attribute_type_uuids will be updated with new
                            name. Entity type will NOT be saved.
        :param old_name: Name of attribute type being mutated.
        :param new_name: New name for the attribute type.
        """
        pass

    def check_mutation(self, entity_type, name, new_attribute_type):
        """
        Checks mutation operation and raises if it is invalid. See `mutate_alias` for argument
        description.
        """
        # Retrieve UUID, raise error if it doesn't exist.
        uuid = entity_type.project.attribute_type_uuids.get(name)
        if uuid is None:
            raise ValueError(f"Could not find attribute name {name} in entity type "
                             f"{type(entity_type).__name__} ID {entity_type.id}")

        # Find old attribute type and create new attribute type.
        for idx, attribute_type in enumerate(entity_type.attribute_types):
            if attribute_type['name'] == name:
                replace_idx = idx
                old_mapping_type = _get_alias_type(attribute_type)
                old_mapping_name = f'{uuid}_{old_mapping_type}'
                old_dtype = attribute_type['dtype']
                break
        else:
            raise ValueError(f"Could not find attribute name {name} in entity type "
                             f"{type(entity_type).__name__} ID {entity_type.id}")

        new_dtype = new_attribute_type["dtype"]
        if new_dtype not in ALLOWED_MUTATIONS[old_dtype]:
            raise RuntimeError(f"Attempted mutation of {name} from {old_dtype} to {new_dtype} is "
                                "not allowed!")

        return uuid, replace_idx, old_mapping_name

    def mutate_alias(self, entity_type, name, new_attribute_type, mod_type, new_style=None):
        """
        Sets alias to new mapping type.

        :param entity_type: *Type object. Should be passed in before updating attribute_type json.
                            Field attribute_types will be updated with new dtype and style. Entity
                            type will not be saved.
        :param name: Name of attribute type being mutated.
        :param new_attribute_type: New attribute type for the attribute being mutated.
        :param mod_type: The type of modification to perform on the attribute: `update` will add
                         missing keys and update values of existing keys; `replace` will replace the
                         definition with `new_attribute_type`, which will result in deletion of
                         existing keys if they are not present in the new definition.
        :param new_style: [Optional] New display style of attribute type. Used to determine if
                          string attributes should be indexed as keyword or text.
        :returns: Entity type with updated attribute_types.
        """
        pass

    def check_deletion(self, entity_type, name):
        """
        Checks deletion operation and raises if it is invalid. See `delete_alias` for argument
        description.
        """
        pass

    def delete_alias(self, entity_type, name):
        """
        Deletes existing alias.

        :param entity_type: *Type object.
        :param name: Name of attribute type being deleted.
        :returns: Entity type with updated attribute_types.
        """
        pass
