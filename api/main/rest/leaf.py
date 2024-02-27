import logging
import datetime
from collections import defaultdict

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q
from django.http import Http404

from ..models import Leaf
from ..models import LeafType
from ..models import Project
from ..schema import LeafSuggestionSchema
from ..schema import LeafListSchema
from ..schema import LeafDetailSchema
from ..schema.components import leaf as leaf_schema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._leaf_query import get_leaf_queryset
from ._attributes import patch_attributes
from ._attributes import bulk_patch_attributes
from ._attributes import validate_attributes
from ._util import (
    bulk_create_from_generator,
    bulk_delete_and_log_changes,
    bulk_log_creation,
    bulk_update_and_log_changes,
    computeRequiredFields,
    check_required_fields,
    delete_and_log_changes,
    log_changes,
)
from ._permissions import ProjectViewOnlyPermission
from ._permissions import ProjectFullControlPermission

logger = logging.getLogger(__name__)

LEAF_PROPERTIES = list(leaf_schema["properties"].keys())


class LeafSuggestionAPI(BaseDetailView):
    """Rest Endpoint compatible with devbridge suggestion format.

    <https://github.com/kraaden/autocomplete>
    """

    schema = LeafSuggestionSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get"]

    def _get(self, params):
        project = params.get("project")
        min_level = int(params.get("min_level", 1))
        query = params.get("query", None)
        ancestor = params["ancestor"]

        # Try to find root node for type
        root_node = Leaf.objects.filter(project=project, path=ancestor)
        if root_node.count() == 0:
            return []

        if query.find("*") < 0:
            q_object = Q(name__istartswith=query)
        else:
            comps = query.split("*")
            queries = []
            for idx, c in enumerate(comps):
                if c:
                    if idx == 0:
                        queries.append(Q(name__istartswith=c))
                    elif idx == len(comps) - 1:
                        queries.append(Q(name__iendswith=c))
                    else:
                        queries.append(Q(name__icontains=c))

            q_object = queries[0]
            queries.pop(0)
            for q in queries:
                q_object = q_object & q

        type_id = root_node[0].type
        queryset = Leaf.objects.filter(
            project=project, type=type_id, path__istartswith=ancestor, path__depth__gte=min_level
        ).filter(q_object)

        suggestions = []
        for idx, match in enumerate(queryset):
            group = params["ancestor"]
            if match.parent:
                group = match.parent.name

            suggestion = {"value": match.name, "group": group, "data": {}}

            if "alias" in match.attributes:
                suggestion["data"]["alias"] = match.attributes["alias"]

            catAlias = None
            if match.parent:
                if match.parent.attributes:
                    catAlias = match.parent.attributes.get("alias", None)
                if catAlias != None:
                    suggestion["group"] = f'{suggestion["group"]} ({catAlias})'

            suggestions.append(suggestion)

        def functor(elem):
            return elem["group"]

        suggestions.sort(key=functor)
        logger.info(queryset.explain())
        return suggestions


class LeafListAPI(BaseListView):
    """Interact with a list of leaves.

    Tree leaves are used to define label hierarchies that can be used for autocompletion
    of string attribute types.
    """

    schema = LeafListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ["get", "post", "patch", "delete", "put"]
    entity_type = LeafType  # Needed by attribute filter mixin

    def _get(self, params):
        qs = get_leaf_queryset(params["project"], params)
        response_data = list(qs.values(*LEAF_PROPERTIES))
        return response_data

    @staticmethod
    def _leaf_obj_generator(project, leaf_specs, attr_specs, metas, user):
        for leaf_spec, attrs in zip(leaf_specs, attr_specs):
            parent = leaf_spec.get("parent")
            if parent is not None:
                parent = Leaf.objects.get(pk=parent)
                if parent.project.pk != project.id:
                    raise Exception(f"Specified parent ID is not in project {project.id}")

            leaf = Leaf(
                project=project,
                type=metas[leaf_spec["type"]],
                attributes=attrs,
                created_by=user,
                modified_by=user,
                name=leaf_spec["name"],
                parent=parent,
            )
            leaf.path = leaf.computePath()
            yield leaf

    def _post(self, params):
        # Check that we are getting a leaf list.
        if "body" in params:
            leaf_specs = params["body"]
            if not isinstance(leaf_specs, list):
                leaf_specs = [leaf_specs]
        else:
            raise Exception("Leaf creation requires list of leaves!")

        # Find unique foreign keys.
        meta_ids = set([leaf["type"] for leaf in leaf_specs])

        # Make foreign key querysets.
        meta_qs = LeafType.objects.filter(pk__in=meta_ids)

        # Construct foreign key dictionaries.
        project = Project.objects.get(pk=params["project"])
        metas = {obj.id: obj for obj in meta_qs.iterator()}

        # Get required fields for attributes.
        required_fields = {id_: computeRequiredFields(metas[id_]) for id_ in meta_ids}
        for val in required_fields.values():
            val[0].pop("path", None)  # Remove path since it is computed.
        attr_specs = [
            check_required_fields(
                required_fields[leaf["type"]][0], required_fields[leaf["type"]][2], leaf
            )
            for leaf in leaf_specs
        ]

        # Create the leaf objects.
        objs = self._leaf_obj_generator(project, leaf_specs, attr_specs, metas, self.request.user)
        leaves = bulk_create_from_generator(objs, Leaf)
        create_buffer = []

        ids = bulk_log_creation(leaves, project, self.request.user)

        # Return created IDs.
        if len(ids) == 1:
            return {"message": f"Successfully created {len(ids)} leaf!", "id": ids}
        else:
            return {"message": f"Successfully created {len(ids)} leaves!", "id": ids}

    def _delete(self, params):
        qs = get_leaf_queryset(params["project"], params)
        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(f"Safety check failed - expected {expected_count} but would delete {count}")
        if count > 0:
            bulk_delete_and_log_changes(qs, params["project"], self.request.user)

        if count == 1:
            return {"message": f"Successfully deleted {count} leaf!"}
        else:
            return {"message": f"Successfully deleted {count} leaves!"}

    def _patch(self, params):
        qs = get_leaf_queryset(params["project"], params)
        count = qs.count()
        expected_count = params.get("count")
        if expected_count is not None and expected_count != count:
            raise ValueError(f"Safety check failed - expected {expected_count} but would update {count}")
        if count > 0:
            if qs.values("type").distinct().count() != 1:
                raise ValueError(
                    "When doing a bulk patch the type id of all objects must be the same."
                )
            new_attrs = validate_attributes(params, qs[0])
            bulk_update_and_log_changes(
                qs, params["project"], self.request.user, new_attributes=new_attrs
            )
            bulk_patch_attributes(new_attrs, qs)

        if count == 1:
            return {"message": f"Successfully updated {count} leaf!"}
        else:
            return {"message": f"Successfully updated {count} leaves!"}

    def _put(self, params):
        """Retrieve list of leaves by ID."""
        return self._get(params)


class LeafDetailAPI(BaseDetailView):
    """Interact with individual leaf.

    Tree leaves are used to define label hierarchies that can be used for autocompletion
    of string attribute types.
    """

    schema = LeafDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = "id"

    def _get(self, params):
        qs = Leaf.objects.filter(pk=params["id"], deleted=False)
        if not qs.exists():
            raise Http404
        return qs.values(*LEAF_PROPERTIES)[0]

    @transaction.atomic
    def _patch(self, params):
        obj = Leaf.objects.get(pk=params["id"], deleted=False)
        model_dict = obj.model_dict
        grandparent = obj.parent

        # Patch common attributes.
        if "name" in params:
            obj.name = params["name"]

        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)
        obj.save()

        # Change the parent of a leaf
        if "parent" in params:
            if params["parent"] != params["id"]:
                children = Leaf.objects.filter(parent=obj.id, deleted=False)
                if params["parent"] is None or params["parent"] == -1:
                    obj.parent = None
                else:
                    obj.parent = Leaf.objects.get(pk=params["parent"], deleted=False)
                obj.path = obj.computePath()
                obj.save()

                # Update child path, or parent
                newparent = params["parent"]
                self._update_children_newparent(children, grandparent, newparent)

        obj.save()
        log_changes(obj, model_dict, obj.project, self.request.user)
        return {"message": f'Leaf {params["id"]} successfully updated!'}

    def _delete(self, params):
        leaf = Leaf.objects.get(pk=params["id"], deleted=False)
        project = leaf.project

        ids = self._get_children_id_set(params["id"])

        queryset = Leaf.objects.filter(pk__in=ids)

        for i in ids:
            inner_leaf = Leaf.objects.get(pk=i, deleted=False)

        bulk_delete_and_log_changes(queryset, project, self.request.user)

        # todo figure out syntax for this query
        # query = get_leaf_es_query(params)
        # TatorSearch().delete(project, query)

        if len(ids) == 2:
            return {
                "message": f'Leaf {params["id"]} and {len(ids) - 1} child successfully deleted! '
            }
        elif len(ids) > 2:
            return {
                "message": f'Leaf {params["id"]} and {len(ids) - 1} children successfully deleted! '
            }
        else:
            return {"message": f'Leaf {params["id"]} successfully deleted! '}

    def _get_children_id_set(self, leaf_id):
        ch_list = self._recursive_inner_child(leaf_id, [])
        return ch_list

    def _recursive_inner_child(self, leaf_id, carryOver):
        new_array = carryOver
        new_array.append(leaf_id)

        query = Leaf.objects.filter(parent=leaf_id, deleted=False)
        if query and len(query) > 0:
            for inner_child in query:
                new_array = self._recursive_inner_child(inner_child.id, new_array)

        return new_array

    def get_queryset(self):
        return Leaf.objects.all()

    def _update_children_newparent(self, children, grandparent, newparent):
        if children and len(children) > 0:
            for child in children:
                child_model_dict = child.model_dict

                # if a child is the newParent
                if child.id == newparent:
                    if grandparent == None:
                        child.parent = None
                    else:
                        child.parent = Leaf.objects.get(pk=grandparent, deleted=False)

                child.path = child.computePath()
                child.save()
                log_changes(child, child_model_dict, child.project, self.request.user)

                inner_children = Leaf.objects.filter(parent=child.id, deleted=False)
                if inner_children and len(inner_children) > 0:
                    self._update_path(inner_children)

    def _update_path(self, children):
        for child in children:
            child_model_dict = child.model_dict

            child.path = child.computePath()
            child.save()
            log_changes(child, child_model_dict, child.project, self.request.user)

            inner_children = Leaf.objects.filter(parent=child.pk, deleted=False)
            if inner_children and len(inner_children) > 0:
                self._update_path(inner_children)
