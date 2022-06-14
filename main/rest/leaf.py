import logging
import datetime
from collections import defaultdict

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.http import Http404

from ..models import Leaf
from ..models import LeafType
from ..models import Project
from ..models import database_qs
from ..models import database_query_ids
from ..search import TatorSearch
from ..schema import LeafSuggestionSchema
from ..schema import LeafListSchema
from ..schema import LeafDetailSchema
from ..schema.components import leaf as leaf_schema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._leaf_query import get_leaf_queryset
from ._leaf_query import get_leaf_es_query
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

LEAF_PROPERTIES = list(leaf_schema['properties'].keys())

class LeafSuggestionAPI(BaseDetailView):
    """ Rest Endpoint compatible with devbridge suggestion format.

    <https://github.com/kraaden/autocomplete>
    """
    schema = LeafSuggestionSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):
        minLevel=int(params.get('minLevel', 1))
        startsWith=params.get('query', None)
        ancestor=params['ancestor']
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['size'] = 10
        query['sort']['_exact_treeleaf_name'] = 'asc'
        query['query']['bool']['filter'] = [
            {'match': {'_dtype': {'query': 'leaf'}}},
            {'range': {'_treeleaf_depth': {'gte': minLevel}}},
            {'query_string': {'query': f'{startsWith}* AND _treeleaf_path:{ancestor}*'}},
        ]
        ids, _ = TatorSearch().search(params['project'], query)
        queryset = list(Leaf.objects.filter(pk__in=ids))

        suggestions=[]
        for idx,match in enumerate(queryset):
            group = params['ancestor']
            if match.parent:
                group = match.parent.name

            suggestion={
                "value": match.name,
                "group": group,
                "data": {}
            }

            if 'alias' in match.attributes:
                suggestion["data"]["alias"] = match.attributes['alias']

            catAlias=None
            if match.parent:
                if match.parent.attributes:
                    catAlias=match.parent.attributes.get("alias",None)
                if catAlias != None:
                    suggestion["group"] = f'{suggestion["group"]} ({catAlias})'


            suggestions.append(suggestion);

        def functor(elem):
            return elem["group"]

        suggestions.sort(key=functor)
        return suggestions

class LeafListAPI(BaseListView):
    """ Interact with a list of leaves.

        Tree leaves are used to define label hierarchies that can be used for autocompletion
        of string attribute types.
    """
    schema = LeafListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ['get', 'post', 'patch', 'delete', 'put']
    entity_type = LeafType # Needed by attribute filter mixin

    def _get(self, params):
        qs = get_leaf_queryset(params['project'], params)
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
                meta=metas[leaf_spec["type"]],
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
        if 'body' in params:
            leaf_specs = params['body']
        else:
            raise Exception('Leaf creation requires list of leaves!')

        # Find unique foreign keys.
        meta_ids = set([leaf['type'] for leaf in leaf_specs])

        # Make foreign key querysets.
        meta_qs = LeafType.objects.filter(pk__in=meta_ids)

        # Construct foreign key dictionaries.
        project = Project.objects.get(pk=params['project'])
        metas = {obj.id: obj for obj in meta_qs.iterator()}

        # Get required fields for attributes.
        required_fields = {id_:computeRequiredFields(metas[id_]) for id_ in meta_ids}
        for val in required_fields.values():
            val[0].pop('path', None) # Remove path since it is computed.
        attr_specs = [check_required_fields(required_fields[leaf['type']][0],
                                            required_fields[leaf['type']][2],
                                            leaf)
                      for leaf in leaf_specs]

        # Create the leaf objects.
        objs = self._leaf_obj_generator(project, leaf_specs, attr_specs, metas, self.request.user)
        leaves = bulk_create_from_generator(objs, Leaf)
        create_buffer = []

        # Build ES documents.
        ts = TatorSearch()
        documents = []
        for leaf in leaves:
            documents += ts.build_document(leaf)
            if len(documents) > 1000:
                ts.bulk_add_documents(documents)
                documents = []
        ts.bulk_add_documents(documents)

        ids = bulk_log_creation(leaves, project, self.request.user)

        # Return created IDs.
        return {'message': f'Successfully created {len(ids)} leaves!', 'id': ids}

    def _delete(self, params):
        qs = get_leaf_queryset(params['project'], params)
        count = qs.count()
        if count > 0:
            bulk_delete_and_log_changes(qs, params["project"], self.request.user)
            query = get_leaf_es_query(params)
            TatorSearch().delete(self.kwargs['project'], query)

        return {'message': f'Successfully deleted {count} leaves!'}

    def _patch(self, params):
        qs = get_leaf_queryset(params['project'], params)
        count = qs.count()
        if count > 0:
            new_attrs = validate_attributes(params, qs[0])
            bulk_update_and_log_changes(
                qs, params["project"], self.request.user, new_attributes=new_attrs
            )
            bulk_patch_attributes(new_attrs, qs)

            query = get_leaf_es_query(params)
            TatorSearch().update(self.kwargs['project'], qs[0].meta, query, new_attrs)

        return {'message': f'Successfully updated {count} leaves!'}

    def _put(self, params):
        """ Retrieve list of leaves by ID.
        """
        return self._get(params)

class LeafDetailAPI(BaseDetailView):
    """ Interact with individual leaf.

        Tree leaves are used to define label hierarchies that can be used for autocompletion
        of string attribute types.
    """
    schema = LeafDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'

    def _get(self, params):
        qs = Leaf.objects.filter(pk=params['id'], deleted=False)
        if not qs.exists():
            raise Http404
        return database_qs(qs)[0]

    @transaction.atomic
    def _patch(self, params):
        obj = Leaf.objects.get(pk=params['id'], deleted=False)
        model_dict = obj.model_dict
        grandparent = obj.parent

        # Patch common attributes.
        if 'name' in params:
            obj.name = params['name']
        
        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)

        # Change the parent of a leaf
        if 'parent' in params and params['parent'] != params['id']:
            children = Leaf.objects.filter(parent=obj.id, deleted=False)
            if params['parent'] == None or params['parent'] == -1:
                obj.parent = None
            else:
                obj.parent = Leaf.objects.get(pk=params['parent'], deleted=False)
            obj.path = obj.computePath()
            obj.save()

            #Update child path, or parent
            newparent = params['parent']
            self._update_children_newparent(self, children, grandparent, newparent)
            

        obj.save()
        log_changes(obj, model_dict, obj.project, self.request.user)
        return {'message': f'Leaf {params["id"]} successfully updated!'}

    def _delete(self, params):
        leaf = Leaf.objects.get(pk=params['id'], deleted=False)
        project = leaf.project

        parent = leaf.id
        grandparent = leaf.parent
        children = Leaf.objects.filter(parent=parent, deleted=False)
        self._update_children_delparent(self, children, grandparent, leaf.id)

        model_dict = leaf.model_dict
        delete_and_log_changes(leaf, project, self.request.user)
        TatorSearch().delete_document(leaf)
        return {'message': f'Leaf {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Leaf.objects.all()

    @staticmethod
    def _update_children_newparent(self, children, grandparent, newparent):
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
                self._update_children_newparent(self, inner_children, newparent, child.parent)

    @staticmethod
    def _update_children_delparent(self, children, grandparent, parent):
        for child in children:
            child_model_dict = child.model_dict

            if grandparent == None:
                child.parent = None
            else:
                child.parent = Leaf.objects.get(pk=grandparent, deleted=False)
            
            child.path = child.computePath()
            child.save()
            log_changes(child, child_model_dict, child.project, self.request.user)

            inner_children = Leaf.objects.filter(parent=child.id, deleted=False)
            if inner_children and len(inner_children) > 0:
                self._update_children_newparent(self, inner_children, parent, child.parent)
