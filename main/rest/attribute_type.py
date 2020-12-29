from typing import Dict

from django.db import transaction

from .. import models
from ..search import TatorSearch
from ..schema import AttributeTypeListSchema, parse

from ._base_views import BaseListView
from ._annotation_query import get_annotation_queryset
from ._attributes import (
    bulk_patch_attributes,
    bulk_rename_attributes,
    bulk_mutate_attributes,
)
from ._permissions import ProjectFullControlPermission


class AttributeTypeListAPI(BaseListView):
    """Interact with attributes on an individual type."""

    schema = AttributeTypeListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ["patch", "post"]

    @staticmethod
    def _get_objects(params):
        """
        Makes use of the `entity_type` and `project` fields to extract the parent annotation type
        and all annotations of that type. Returns the annotation type object and the QuerySet of
        annotations.
        """
        type_name = params["entity_type"]
        parent_id = params["id"]
        model_type = getattr(models, type_name)
        entity_type = model_type.objects.filter(pk=parent_id)[0]
        entity_name = type_name[: -len("Type")]
        model = getattr(models, entity_name)
        obj_qs = model.objects.filter(meta=parent_id)
        return entity_type, obj_qs

    def _patch(self, params: Dict) -> Dict:
        """Rename an attribute on a type."""
        ts = TatorSearch()
        old_name = params["old_attribute_type_name"]
        old_dtype = None
        new_attribute_type = params["new_attribute_type"]
        new_name = new_attribute_type["name"]

        # Get the old and new dtypes
        entity_type, obj_qs = self._get_objects(params)
        for attribute_type in entity_type.attribute_types:
            if attribute_type["name"] == old_name:
                old_dtype = attribute_type["dtype"]
                break
        else:
            raise ValueError(
                f"Could not find attribute name {old_name} in entity type "
                "{type(entity_type)} ID {entity_type.id}"
            )

        new_dtype = new_attribute_type.get("dtype", old_dtype)

        # Atomic validation of all changes; TatorSearch.check_* methods raise if there is a problem
        # that would cause either a rename or a mutation to fail.
        if old_name != new_name:
            ts.check_rename(entity_type, old_name, new_name)
        if old_dtype != new_dtype:
            ts.check_mutation(entity_type, old_name, new_attribute_type)

        # List of success messages to return
        messages = []

        # Renames the attribute alias for the entity type in PSQL and ES
        if old_name != new_name:
            # Update entity type alias
            ts.rename_alias(entity_type, old_name, new_name).save()
            entity_type.project.save()

            # Update entity alias
            if obj_qs.exists():
                bulk_rename_attributes({old_name: new_name}, obj_qs)

            messages.append(f"Attribute '{old_name}' renamed to '{new_name}'.")

            # refresh entity_type and queryset after a rename
            entity_type, obj_qs = self._get_objects(params)

        if old_dtype != new_dtype:
            # Update entity type dtype
            ts.mutate_alias(entity_type, new_name, new_attribute_type).save()

            # Convert entity values
            if obj_qs.exists():
                # Get the new attribute type to convert the existing value
                new_attribute_type = None
                for attribute_type in entity_type.attribute_types:
                    if attribute_type["name"] == new_name:
                        new_attribute_type = attribute_type
                        break

                # Mutate the entity attribute values
                bulk_mutate_attributes(new_attribute_type, obj_qs)

            messages.append(
                f"Attribute '{new_name}' changed type from '{old_dtype}' to '{new_dtype}'."
            )

        return {"message": " ".join(messages)}

    def _post(self, params: Dict) -> Dict:
        """Adds an attribute to a type."""
        entity_type, obj_qs = self._get_objects(params)

        new_attribute_type = params["addition"]
        entity_type.attribute_types.append(new_attribute_type)
        entity_type.save()

        # Create attribute alias mappings
        TatorSearch().create_mapping(entity_type)

        # Add new field to all existing attributes
        if obj_qs.exists():
            new_name = new_attribute_type["name"]
            new_default = new_attribute_type.get("default")
            bulk_patch_attributes({new_name: new_default}, obj_qs)
            # TODO: add attribute to ES

        return {"message": f"New attribute type '{new_attribute_type['name']}' added"}

    def get_queryset(self):
        params = parse(self.request)
        model_type = getattr(models, params["entity_type"])
        queryset = model_type.objects.filter(pk=params["id"])
        return queryset
