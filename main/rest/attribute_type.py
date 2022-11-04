from pprint import pformat
from typing import Dict
from django.db import transaction
import logging

from ..models import (
    FileType,
    File,
    MediaType,
    Media,
    LocalizationType,
    Localization,
    StateType,
    State,
    LeafType,
    Leaf,
)
from ..search import TatorSearch
from ..schema import AttributeTypeListSchema, parse

from ._base_views import BaseListView
from ._attributes import (
    bulk_patch_attributes,
    bulk_rename_attributes,
    bulk_mutate_attributes,
    bulk_delete_attributes,
    convert_attribute,
)
from ._permissions import ProjectFullControlPermission

logger = logging.getLogger(__name__)

ENTITY_TYPES = {
    "FileType": (FileType, File),
    "MediaType": (MediaType, Media),
    "LocalizationType": (LocalizationType, Localization),
    "StateType": (StateType, State),
    "LeafType": (LeafType, Leaf),
}


class AttributeTypeListAPI(BaseListView):
    """Interact with attributes on an individual type."""

    schema = AttributeTypeListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ["patch", "post", "put", "delete"]

    @staticmethod
    def _check_attribute_type(attribute_type):
        """
        Checks that all required fields exist in an attribute type definition.
        """

        if "name" not in attribute_type:
            raise ValueError("Attribute type definition missing 'name' field")
        if attribute_type['name'].startswith('_'):
            raise ValueError("Attribute type name can not start with '_' character")
        if "dtype" not in attribute_type:
            raise ValueError("Attribute type definition missing 'dtype' field")
        if "enum" == attribute_type["dtype"] and "choices" not in attribute_type:
            raise ValueError("enum attribute type definition missing 'choices' field")
        if "float_array" == attribute_type["dtype"] and "size" not in attribute_type:
            raise ValueError("float_array attribute type definition missing 'size' field")
        if "default" in attribute_type:
            # Convert default value to this type to validate it.
            convert_attribute(attribute_type, attribute_type["default"])

    @staticmethod
    def _get_models(type_name):
        models = ENTITY_TYPES.get(type_name)
        if not models:
            raise ValueError(
                f"Invalid 'entity_type' value '{type_name}'. Valid values are '{[ENTITY_TYPES.keys()]}'"
            )

        return models

    @staticmethod
    def _get_objects(params):
        """
        Makes use of the `entity_type` and `project` fields to extract the parent annotation type
        and all annotations of that type. Returns the annotation type object and the QuerySet of
        annotations.
        """
        parent_id = params["id"]
        models = AttributeTypeListAPI._get_models(params["entity_type"])
        entity_type = models[0].objects.select_for_update(nowait=True).get(pk=parent_id)
        model = models[1]
        obj_qs = model.objects.filter(meta=parent_id)
        return entity_type, obj_qs

    @staticmethod
    def _has_related_objects(target_entity_type, attribute_name):
        """
        Used by _patch in conjunction with _get_objects to find all types and instances of said
        types that have an attribute with the given name for bulk mutation.
        """
        project = target_entity_type.project
        for entity_type, _ in ENTITY_TYPES.values():
            for instance in entity_type.objects.filter(project=project):
                # Ignore the given entity type
                if instance.id == target_entity_type.id:
                    continue

                if instance.attribute_types and any(
                    attribute_name == attribute["name"] for attribute in instance.attribute_types
                ):
                    return True

        return False

    @classmethod
    def _modify_attribute_type(cls, params: Dict, mod_type: str) -> Dict:
        """Rename an attribute on a type."""
        valid_mod_types = ["update", "replace"]
        if mod_type not in valid_mod_types:
            raise ValueError(f"Expected `mod_type` in {valid_mod_types}, received '{mod_type}'")

        ts = TatorSearch()
        old_name = params["old_attribute_type_name"]
        old_dtype = None
        old_attribute_type = None
        new_attribute_type = params["new_attribute_type"]

        # This is a temporary limit until ES is removed
        max_instances = params.get("max_instances", 100000)
        new_name = new_attribute_type["name"]
        attribute_renamed = old_name != new_name

        # Get the old and new dtypes
        with transaction.atomic():
            entity_type, obj_qs = cls._get_objects(params)
            has_related_objects = cls._has_related_objects(entity_type, old_name)

            for attribute_type in entity_type.attribute_types:
                if attribute_type["name"] == old_name:
                    old_dtype = attribute_type["dtype"]
                    old_attribute_type = dict(attribute_type)
                    break
            else:
                raise ValueError(
                    f"Could not find attribute name {old_name} in entity type "
                    f"{type(entity_type)} ID {entity_type.id}"
                )

            # Determine if the attribute is being mutated
            attribute_mutated = False
            dtype_mutated = False

            # Check all keys present in `new_attribute_type`
            keys = set(new_attribute_type.keys())
            if mod_type == "replace":
                # Also check all keys present in `old_attribute_type` if this is a replacement
                keys.update(old_attribute_type.keys())

            for key in keys:
                # Ignore differences in `name` values, those are handled by a rename
                if key == "name":
                    continue

                if new_attribute_type.get(key) != old_attribute_type.get(key):
                    attribute_mutated = True
                    if key == "dtype":
                        dtype_mutated = True

            # Atomic validation of all changes; TatorSearch.check_* methods raise if there is a
            # problem that would cause either a rename or a mutation to fail.
            if attribute_renamed:
                # TODO Update this check once ES has been removed
                if has_related_objects:
                    raise ValueError(
                        f"Attempted to rename attribute '{old_name}', but it exists on other types. "
                        f"Currently, this is not allowed from the UI."
                    )
                ts.check_rename(entity_type, old_name, new_name)
            if attribute_mutated:
                # TODO Update this check once ES has been removed
                if dtype_mutated and has_related_objects:
                    raise ValueError(
                        f"Attempted to mutate '{old_name}'s dtype, but it exists on other types. "
                        f"Currently, this is not allowed from the UI."
                    )
                cls._check_attribute_type(new_attribute_type)
                ts.check_mutation(entity_type, old_name, new_attribute_type)

                # TODO Remove this check once ES has been removed
                if obj_qs.filter(project=entity_type.project).count() > max_instances:
                    type_name = type(entity_type).__name__
                    name = type_name.replace("Type", "")

                    if name != "Media":
                        name += "s"

                    raise RuntimeError(
                        f"Cannot mutate {type_name} with ID {entity_type.id} via the web UI "
                        f"because it has too many {name}. Contact your Tator admin for assistance."
                    )

            # List of success messages to return
            messages = []

            # Renames the attribute alias for the entity type in PSQL and ES
            if attribute_renamed:
                # Update entity type alias
                updated_types = ts.rename_alias(entity_type, related_objects, old_name, new_name)
                for instance in updated_types:
                    instance.save()
                logger.info(f"Renamed {old_name} to {new_name}")
                entity_type.project.save()

                # Update entity alias
                if obj_qs.exists():
                    bulk_rename_attributes({old_name: new_name}, obj_qs)

                messages.append(f"Attribute '{old_name}' renamed to '{new_name}'.")

                # refresh entity_type and queryset after a rename
                entity_type, obj_qs = cls._get_objects(params)

            if attribute_mutated:
                # Update entity type attribute type
                ts.mutate_alias(entity_type, new_name, new_attribute_type, mod_type).save()

                # Convert entity values
                if dtype_mutated:
                    if obj_qs.exists():
                        # Get the new attribute type to convert the existing value
                        new_attribute = None
                        for attribute_type in entity_type.attribute_types:
                            if attribute_type["name"] == new_name:
                                new_attribute = attribute_type
                                break

                        # Mutate the entity attribute values
                        bulk_mutate_attributes(new_attribute, obj_qs)

                if mod_type == "update":
                    # An update is a combination of the new and old states
                    final_attribute_type = old_attribute_type.copy()
                    final_attribute_type.update(new_attribute_type)
                else:
                    final_attribute_type = new_attribute_type

                messages.append(
                    f"Attribute '{new_name}' mutated from:\n{pformat(old_attribute_type)}\nto:\n"
                    f"{pformat(final_attribute_type)}"
                )

        return {"message": "\n".join(messages)}

    def _delete(self, params: Dict) -> Dict:
        """Delete an existing attribute on a type."""
        attribute_to_delete = params["attribute_to_delete"]
        with transaction.atomic():
            entity_type, obj_qs = self._get_objects(params)
            TatorSearch().delete_alias(entity_type, attribute_to_delete).save()

        if obj_qs.exists():
            bulk_delete_attributes([attribute_to_delete], obj_qs)

        return {"message": f"Attribute '{attribute_to_delete}' deleted"}

    def _patch(self, params: Dict) -> Dict:
        """Updates an attribute on a type."""
        return self._modify_attribute_type(params, "update")

    def _put(self, params: Dict) -> Dict:
        """Replaces an attribute on a type."""
        return self._modify_attribute_type(params, "replace")

    def _post(self, params: Dict) -> Dict:
        """Adds an attribute to a type."""
        new_attribute_type = params["addition"]
        new_name = new_attribute_type["name"]
        with transaction.atomic():
            entity_type, obj_qs = self._get_objects(params)

            # Check that the attribute type is valid and it is valid to add it to the desired entity
            # type
            self._check_attribute_type(new_attribute_type)

            # Add the attribute to the desired entity type
            if entity_type.attribute_types:
                entity_type.attribute_types.append(new_attribute_type)
            else:
                entity_type.attribute_types = []
                entity_type.attribute_types.append(new_attribute_type)
            entity_type.save()

        # Add new field to all existing attributes if there is a default value
        if obj_qs.exists() and "default" in new_attribute_type:
            new_attr = {new_name: new_attribute_type["default"]}

            # Add default value to PSQL
            bulk_patch_attributes(new_attr, obj_qs)

        return {"message": f"New attribute type '{new_name}' added"}

    def get_queryset(self):
        params = parse(self.request)
        models = self._get_models(params["entity_type"])
        queryset = models[0].objects.filter(pk=params["id"])
        return queryset
