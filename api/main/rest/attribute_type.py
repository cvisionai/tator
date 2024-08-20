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
    LeafType,
    Leaf,
    Project,
    Section,
    StateType,
    State,
)
from ..search import TatorSearch
from ..schema import AttributeTypeListSchema, parse

from ._base_views import BaseListView
from ._attributes import (
    bulk_patch_attributes,
    bulk_rename_attributes,
    bulk_delete_attributes,
    convert_attribute,
)
from ._permissions import ProjectFullControlPermission, ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

ENTITY_TYPES = {
    "FileType": (FileType, File),
    "MediaType": (MediaType, Media),
    "LocalizationType": (LocalizationType, Localization),
    "StateType": (StateType, State),
    "LeafType": (LeafType, Leaf),
    "Section": (Project, Section),
}


class AttributeTypeListAPI(BaseListView):
    """Interact with attributes on an individual type."""

    schema = AttributeTypeListSchema()
    http_method_names = ["patch", "post", "put", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectFullControlPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    @staticmethod
    def _check_attribute_type(attribute_type):
        """
        Checks that all required fields exist in an attribute type definition.
        """

        if "name" not in attribute_type:
            raise ValueError("Attribute type definition missing 'name' field")
        if attribute_type["name"].startswith("$"):
            raise ValueError("Attribute type name can not start with '$' character")
        if "dtype" not in attribute_type:
            raise ValueError("Attribute type definition missing 'dtype' field")
        if "enum" == attribute_type["dtype"] and "choices" not in attribute_type:
            raise ValueError("enum attribute type definition missing 'choices' field")
        if "float_array" == attribute_type["dtype"] and "size" not in attribute_type:
            raise ValueError("float_array attribute type definition missing 'size' field")
        if "default" in attribute_type:
            # Convert default value to this type to validate it.
            attribute_type["default"] = convert_attribute(attribute_type, attribute_type["default"])

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
        if models[0] == Project:
            obj_qs = Section.objects.filter(project=params["id"])
        else:
            obj_qs = model.objects.filter(type=parent_id)
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
        old_name = params["current_name"]
        old_attribute_type = None
        attribute_type_update = params["attribute_type_update"]

        new_name = attribute_type_update["name"]
        attribute_renamed = old_name != new_name

        # Get the old and new dtypes
        with transaction.atomic():
            entity_type, obj_qs = cls._get_objects(params)

            for attribute_type in entity_type.attribute_types:
                if attribute_type["name"] == old_name:
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

            # Check all keys present in `attribute_type_update`
            keys = set(attribute_type_update.keys())
            if mod_type == "replace":
                # Also check all keys present in `old_attribute_type` if this is a replacement
                keys.update(old_attribute_type.keys())

            for key in keys:
                # Ignore differences in `name` values, those are handled by a rename
                if key == "name":
                    continue

                if attribute_type_update.get(key) != old_attribute_type.get(key):
                    attribute_mutated = True
                    if key == "dtype":
                        dtype_mutated = True

            # Atomic validation of all changes; TatorSearch.check_* methods raise if there is a
            # problem that would cause either a rename or a mutation to fail.
            if attribute_renamed:
                ts.check_rename(entity_type, old_name, new_name)
            if attribute_mutated:
                cls._check_attribute_type(attribute_type_update)
                if dtype_mutated:
                    ts.check_mutation(entity_type, old_name, attribute_type_update)

            # List of success messages to return
            messages = []

            # Renames the attribute alias for the entity type in PSQL and ES
            if attribute_renamed:
                # Update entity type alias
                updated_types = ts.rename_alias(entity_type, old_name, new_name)
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
                ts.mutate_alias(entity_type, new_name, attribute_type_update, mod_type).save()

                # Convert entity values
                if dtype_mutated:
                    if obj_qs.exists():
                        # Get the new attribute type to convert the existing value
                        for attribute_type in entity_type.attribute_types:
                            if attribute_type["name"] == new_name:
                                break

                if mod_type == "update":
                    # An update is a combination of the new and old states
                    final_attribute_type = old_attribute_type.copy()
                    final_attribute_type.update(attribute_type_update)
                else:
                    final_attribute_type = attribute_type_update

                messages.append(
                    f"Attribute '{new_name}' mutated from:\n{pformat(old_attribute_type)}\nto:\n"
                    f"{pformat(final_attribute_type)}"
                )

        return {"message": "\n".join(messages)}

    def _delete(self, params: Dict) -> Dict:
        """Delete an existing attribute on a type."""
        name = params["name"]
        with transaction.atomic():
            entity_type, obj_qs = self._get_objects(params)
            if type(entity_type) != Project:
                TatorSearch().delete_alias(entity_type, name).save()
            else:
                found_idx = -1
                for idx, attribute_obj in enumerate(entity_type.attribute_types):
                    if attribute_obj["name"] == name:
                        element = {**attribute_obj}
                        found_idx = idx
                if found_idx >= 0:
                    del entity_type.attribute_types[found_idx]
                    entity_type.save()

        if obj_qs.exists():
            bulk_delete_attributes([name], obj_qs)

        return {"message": f"Attribute '{name}' deleted"}

    def _patch(self, params: Dict) -> Dict:
        """Updates an attribute on a type."""
        return self._modify_attribute_type(params, "update")

    def _put(self, params: Dict) -> Dict:
        """Replaces an attribute on a type."""
        return self._modify_attribute_type(params, "replace")

    def _post(self, params: Dict) -> Dict:
        """Adds an attribute to a type."""
        attribute_type_update = params["addition"]
        new_name = attribute_type_update["name"]
        with transaction.atomic():
            entity_type, obj_qs = self._get_objects(params)

            # Check that the attribute type is valid and it is valid to add it to the desired entity
            # type
            self._check_attribute_type(attribute_type_update)
            TatorSearch.validate_name(new_name)

            # Add the attribute to the desired entity type
            if entity_type.attribute_types:
                existing_names = [a["name"] for a in entity_type.attribute_types]
                if attribute_type_update["name"] in existing_names:
                    raise ValueError(f"{attribute_type_update['name']} is already an attribute.")
                entity_type.attribute_types.append(attribute_type_update)
            else:
                entity_type.attribute_types = []
                entity_type.attribute_types.append(attribute_type_update)
            entity_type.save()

        # Add new field to all existing attributes if there is a default value
        if obj_qs.exists() and "default" in attribute_type_update:
            new_attr = {new_name: attribute_type_update["default"]}

            # Add default value to PSQL
            bulk_patch_attributes(new_attr, obj_qs)

        return {"message": f"New attribute type '{new_name}' added"}

    def get_queryset(self, **kwargs):
        params = parse(self.request)
        models = self._get_models(params["entity_type"])
        qs = models[0].objects.filter(pk=params["id"])
        return self.filter_only_viewables(qs)
