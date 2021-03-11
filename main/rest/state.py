import logging
import datetime
import itertools

from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.aggregates import ArrayAgg
from django.http import Http404
import numpy as np

from ..models import ChangeLog
from ..models import ChangeToObject
from ..models import State
from ..models import StateType
from ..models import Media
from ..models import Localization
from ..models import Project
from ..models import Membership
from ..models import Version
from ..models import User
from ..models import InterpolationMethods
from ..models import database_qs
from ..models import database_query_ids
from ..search import TatorSearch
from ..schema import StateListSchema
from ..schema import StateDetailSchema
from ..schema import MergeStatesSchema
from ..schema import TrimStateEndSchema
from ..schema.components import state as state_schema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._annotation_query import get_annotation_queryset
from ._annotation_query import get_annotation_es_query
from ._attributes import patch_attributes
from ._attributes import bulk_patch_attributes
from ._attributes import validate_attributes
from ._util import bulk_create_from_generator
from ._util import computeRequiredFields
from ._util import check_required_fields
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)

STATE_PROPERTIES = list(state_schema['properties'].keys())
STATE_PROPERTIES.pop(STATE_PROPERTIES.index('media'))
STATE_PROPERTIES.pop(STATE_PROPERTIES.index('localizations'))

def _fill_m2m(response_data):
    # Get many to many fields.
    state_ids = [state['id'] for state in response_data]
    localizations = {obj['state_id']:obj['localizations'] for obj in
        State.localizations.through.objects\
        .filter(state__in=state_ids)\
        .values('state_id').order_by('state_id')\
        .annotate(localizations=ArrayAgg('localization_id')).iterator()}
    media = {obj['state_id']:obj['media'] for obj in
        State.media.through.objects\
        .filter(state__in=state_ids)\
        .values('state_id').order_by('state_id')\
        .annotate(media=ArrayAgg('media_id')).iterator()}
    # Copy many to many fields into response data.
    for state in response_data:
        state['localizations'] = localizations.get(state['id'], [])
        state['media'] = media.get(state['id'], [])
    return response_data

class StateListAPI(BaseListView):
    """ Interact with list of states.

        A state is a description of a collection of other objects. The objects a state describes
        could be media (image or video), video frames, or localizations. A state referring
        to a collection of localizations is often referred to as a track. States are
        a type of entity in Tator, meaning they can be described by user defined attributes.

        This endpoint supports bulk patch of user-defined state attributes and bulk delete.
        Both are accomplished using the same query parameters used for a GET request.

        It is importarant to know the fields required for a given entity_type_id as they are
        expected in the request data for this function. As an example, if the entity_type_id has
        attribute types associated with it named time and position, the JSON object must have
        them specified as keys.
    """
    schema=StateListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'post', 'patch', 'delete', 'put']
    entity_type = StateType # Needed by attribute filter mixin

    def _get(self, params):
        t0 = datetime.datetime.now()
        qs = get_annotation_queryset(self.kwargs['project'], params, 'state')
        response_data = list(qs.values(*STATE_PROPERTIES))

        t1 = datetime.datetime.now()
        response_data = _fill_m2m(response_data)
        if self.request.accepted_renderer.format == 'csv':

            # CSV creation requires a bit more
            user_ids = set([d['modified_by'] for d in response_data])
            users = list(User.objects.filter(id__in=user_ids).values('id','email'))
            email_dict = {}
            for user in users:
                email_dict[user['id']] = user['email']

            media_ids = set(media for d in response_data for media in d['media'])
            medias = list(Media.objects.filter(id__in=media_ids).values('id','name'))
            filename_dict = {media['id']:media['name'] for media in medias}

            for element in response_data:
                del element['meta']

                oldAttributes = element['attributes']
                del element['attributes']
                element.update(oldAttributes)

                user_id = element['modified_by']
                media_ids = element['media']

                element['user'] = email_dict[user_id]
                element['media'] = [filename_dict[media_id] for media_id in media_ids]

            if 'type' in params:
                type_object=StateType.objects.get(pk=params['type'])
                if type_object.association == 'Frame' and type_object.interpolation == InterpolationMethods.LATEST:
                    for idx,el in enumerate(response_data):
                        mediaEl=Media.objects.get(pk=el['media'])
                        endFrame=0
                        if idx + 1 < len(response_data):
                            next_element=response_data[idx+1]
                            endFrame=next_element['frame']
                        else:
                            endFrame=mediaEl.num_frames
                        el['media']=mediaEl.name

                        el['endFrame'] = endFrame
                        el['startSeconds'] = int(el['frame']) * mediaEl.fps
                        el['endSeconds'] = int(el['endFrame']) * mediaEl.fps
        t2 = datetime.datetime.now()
        logger.info(f"Number of states: {len(response_data)}")
        logger.info(f"Time to get states: {t1-t0}")
        logger.info(f"Time to get states many to many fields: {t2-t1}")
        return response_data

    def _post(self, params):
        # Check that we are getting a state list.
        if 'body' in params:
            state_specs = params['body']
        else:
            raise Exception('State creation requires list of states!')

        # Get a default version.
        membership = Membership.objects.get(user=self.request.user, project=params['project'])
        if membership.default_version:
            default_version = membership.default_version
        else:
            default_version = Version.objects.filter(project=params['project'],
                                                     number__gte=0).order_by('number')
            if default_version.exists():
                default_version = default_version[0]
            else:
                # If no versions exist, create one.
                default_version = Version.objects.create(
                    name="Baseline",
                    description="Initial version",
                    project=project,
                    number=0,
                )

        # Find unique foreign keys.
        meta_ids = set([state['type'] for state in state_specs])
        version_ids = set([state.get('version', None) for state in state_specs])

        # Make foreign key querysets.
        meta_qs = StateType.objects.filter(pk__in=meta_ids)
        version_qs = Version.objects.filter(pk__in=version_ids)

        # Construct foreign key dictionaries.
        project = Project.objects.get(pk=params['project'])
        metas = {obj.id:obj for obj in meta_qs.iterator()}
        versions = {obj.id:obj for obj in version_qs.iterator()}
        versions[None] = default_version

        # Get required fields for attributes.
        required_fields = {id_:computeRequiredFields(metas[id_]) for id_ in meta_ids}
        attr_specs = [check_required_fields(required_fields[state['type']][0],
                                            required_fields[state['type']][2],
                                            state)
                      for state in state_specs]

        # Create the state objects.
        objs = (
            State(
                project=project,
                meta=metas[state_spec["type"]],
                attributes=attrs,
                created_by=self.request.user,
                modified_by=self.request.user,
                version=versions[state_spec.get("version", None)],
                frame=state_spec.get("frame", None),
            )
            for state_spec, attrs in zip(state_specs, attr_specs)
        )
        states = bulk_create_from_generator(objs, State)

        # Create media relations.
        media_relations = []
        for state, state_spec in zip(states, state_specs):
            for media_id in state_spec['media_ids']:
                media_states = State.media.through(
                    state_id=state.id,
                    media_id=media_id,
                )
                media_relations.append(media_states)
                if len(media_relations) > 1000:
                    State.media.through.objects.bulk_create(media_relations)
                    media_relations = []
        State.media.through.objects.bulk_create(media_relations)

        # Create localization relations.
        loc_relations = []
        for state, state_spec in zip(states, state_specs):
            if 'localization_ids' in state_spec:
                for localization_id in state_spec['localization_ids']:
                    loc_states = State.localizations.through(
                        state_id=state.id,
                        localization_id=localization_id,
                    )
                    loc_relations.append(loc_states)
                    if len(loc_relations) > 1000:
                        State.localizations.through.objects.bulk_create(loc_relations)
                        loc_relations = []
        State.localizations.through.objects.bulk_create(loc_relations)

        # Calculate segments (this is not triggered for bulk created m2m).
        localization_ids = itertools.chain(*[state_spec.get('localization_ids', [])
                                             for state_spec in state_specs])
        loc_id_to_frame = {loc['id']:loc['frame'] for loc in
                           Localization.objects.filter(pk__in=localization_ids)\
                           .values('id', 'frame').iterator()}
        for state, state_spec in zip(states, state_specs):
            frames = [loc_id_to_frame[loc_id] for loc_id in state_spec.get('localization_ids', [])]
            if len(frames) > 0:
                frames = np.sort(frames)
                segments = np.split(frames, np.where(np.diff(frames) != 1)[0] + 1)
                state.segments = [[int(segment[0]), int(segment[-1])] for segment in segments]
        State.objects.bulk_update(states, ['segments'])

        # Build ES documents.
        ts = TatorSearch()
        documents = []
        for state in states:
            documents += ts.build_document(state)
            if len(documents) > 1000:
                ts.bulk_add_documents(documents)
                documents = []
        ts.bulk_add_documents(documents)

        # Create ChangeLogs
        objs = (
            ChangeLog(
                project=project, user=self.request.user, description_of_change=state.create_dict
            )
            for state in states
        )
        change_logs = bulk_create_from_generator(objs, ChangeLog)

        # Associate ChangeLogs with created objects
        ref_table = ContentType.objects.get_for_model(states[0])
        ids = [state.id for state in states]
        objs = (
            ChangeToObject(ref_table=ref_table, ref_id=ref_id, change_id=cl)
            for ref_id, cl in zip(ids, change_logs)
        )
        bulk_create_from_generator(objs, ChangeToObject)

        # Return created IDs.
        ids = [state.id for state in states]
        return {'message': f'Successfully created {len(ids)} states!', 'id': ids}

    def _delete(self, params):
        qs = get_annotation_queryset(params['project'], params, 'state')
        count = qs.count()
        if count > 0:
            # Get info to populate ChangeLog entry
            obj = qs.first()
            project = obj.project
            delete_dicts = [obj.delete_dict for obj in qs]
            ref_table = ContentType.objects.get_for_model(obj)
            ref_ids = [o.id for o in qs]

            # Delete states.
            qs.update(deleted=True,
                      modified_datetime=datetime.datetime.now(datetime.timezone.utc),
                      modified_by=self.request.user)
            query = get_annotation_es_query(params['project'], params, 'state')
            TatorSearch().delete(self.kwargs['project'], query)

            # Create ChangeLogs
            objs = (
                ChangeLog(project=project, user=self.request.user, description_of_change=dd)
                for dd in delete_dicts
            )
            change_logs = bulk_create_from_generator(objs, ChangeLog)

            # Associate ChangeLogs with deleted objects
            objs = (
                ChangeToObject(ref_table=ref_table, ref_id=ref_id, change_id=cl)
                for ref_id, cl in zip(ref_ids, change_logs)
            )
            bulk_create_from_generator(objs, ChangeToObject)

        return {'message': f'Successfully deleted {count} states!'}

    def _patch(self, params):
        qs = get_annotation_queryset(params['project'], params, 'state')
        count = qs.count()
        if count > 0:
            # Get the current representation of the object for comparison
            original_dict = qs.first().model_dict
            new_attrs = validate_attributes(params, qs[0])
            bulk_patch_attributes(new_attrs, qs)
            qs.update(modified_by=self.request.user)

            # Get one object from the queryset to create the change log
            obj = qs.first()
            change_dict = obj.change_dict(original_dict)
            ref_table = ContentType.objects.get_for_model(obj)

            query = get_annotation_es_query(params['project'], params, 'state')
            TatorSearch().update(self.kwargs['project'], qs[0].meta, query, new_attrs)

            # Create the ChangeLog entry and associate it with all objects in the queryset
            cl = ChangeLog(
                project=obj.project, user=self.request.user, description_of_change=change_dict
            )
            cl.save()
            objs = (ChangeToObject(ref_table=ref_table, ref_id=o.id, change_id=cl) for o in qs)
            bulk_create_from_generator(objs, ChangeToObject)

        return {'message': f'Successfully updated {count} states!'}

    def _put(self, params):
        """ Retrieve list of states by ID.
        """
        return self._get(params)

class StateDetailAPI(BaseDetailView):
    """ Interact with an individual state.

        A state is a description of a collection of other objects. The objects a state describes
        could be media (image or video), video frames, or localizations. A state referring
        to a collection of localizations is often referred to as a track. States are
        a types of entity in Tator, meaning they can be described by user defined attributes.
    """
    schema = StateDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        qs = State.objects.filter(pk=params['id'], deleted=False)
        if not qs.exists():
            raise Http404
        state = database_qs(qs)[0]
        # Get many to many fields.
        state['localizations'] = list(State.localizations.through.objects\
                                      .filter(state_id=state['id'])\
                                      .aggregate(localizations=ArrayAgg('localization_id'))\
                                      ['localizations'])
        state['media'] = list(State.media.through.objects\
                              .filter(state_id=state['id'])\
                              .aggregate(media=ArrayAgg('media_id'))\
                              ['media'])
        return state

    @transaction.atomic
    def _patch(self, params):
        obj = State.objects.get(pk=params['id'], deleted=False)
        original_dict = obj.model_dict

        if 'frame' in params:
            obj.frame = params['frame']

        if 'media_ids' in params:
            media_elements = Media.objects.filter(pk__in=params['media_ids'])
            obj.media.set(media_elements)

        if 'localization_ids' in params:
            localizations = Localization.objects.filter(pk__in=params['localization_ids'])
            obj.localizations.set(localizations)

        if 'localization_ids_add' in params:
            localizations = Localization.objects.filter(pk__in=params['localization_ids_add'])
            obj.localizations.add(*list(localizations))

        if 'localization_ids_remove' in params:
            localizations = Localization.objects.filter(pk__in=params['localization_ids_remove'])
            obj.localizations.remove(*list(localizations))

        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)
        # Update modified_by to be the last user
        obj.modified_by = self.request.user

        obj.save()
        cl = ChangeLog(
            project=obj.project,
            user=self.request.user,
            description_of_change=obj.change_dict(original_dict),
        )
        cl.save()
        ChangeToObject(
            ref_table=ContentType.objects.get_for_model(obj),
            ref_id=obj.id,
            change_id=cl,
        ).save()

        return {'message': f'State {params["id"]} successfully updated!'}

    def _delete(self, params):
        state = State.objects.get(pk=params['id'], deleted=False)
        project = state.project
        delete_dict = state.delete_dict
        ref_table = ContentType.objects.get_for_model(state)
        ref_id = state.id
        delete_localizations = []
        if state.meta.delete_child_localizations:

            # Only delete localizations that are not not a part of other states
            for loc in state.localizations.all():

                loc_qs = Localization.state_set.through.objects.filter(localization_id=loc.id).exclude(state_id=state.id)

                if not loc_qs.exists():
                    delete_localizations.append(loc.id)

        state.deleted=True
        state.modified_datetime=datetime.datetime.now(datetime.timezone.utc)
        state.modified_by=self.request.user
        state.save()
        TatorSearch().delete_document(state)
        cl = ChangeLog(project=project, user=self.request.user, description_of_change=delete_dict)
        cl.save()
        ChangeToObject(ref_table=ref_table, ref_id=ref_id, change_id=cl).save()

        qs = Localization.objects.filter(pk__in=delete_localizations)
        qs.update(deleted=True,
                  modified_datetime=datetime.datetime.now(datetime.timezone.utc),
                  modified_by=self.request.user)
        for loc in qs.iterator():
            TatorSearch().delete_document(loc)

        return {'message': f'State {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return State.objects.all()

class MergeStatesAPI(BaseDetailView):
    """ #TODO
    """

    schema = MergeStatesSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
    http_method_names = ['patch']

    @transaction.atomic
    def _patch(self, params: dict) -> dict:

        obj = State.objects.get(pk=params['id'])
        otherObj = State.objects.get(pk=params['merge_state_id'])
        localizations = otherObj.localizations.all()
        localization_ids = list(localizations.values_list('id', flat=True))
        obj.localizations.add(*localization_ids)
        obj.save()

        otherObj.delete()

        return {'message': f'Localizations from state {params["merge_state_id"]} has been merged into {params["id"]}. State {params["merge_state_id"]} has been deleted.'}

    def get_queryset(self):
        return State.objects.all()

class TrimStateEndAPI(BaseDetailView):
    """ #TODO
    """

    schema = TrimStateEndSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
    http_method_names = ['patch']

    @transaction.atomic
    def _patch(self, params: dict) -> dict:

        obj = State.objects.get(pk=params['id'], deleted=False)
        localizations = obj.localizations.order_by('frame')

        if params['endpoint'] == 'start':
            keep_localization = lambda frame: frame >= params['frame']

        elif params['endpoint'] == 'end':
            keep_localization = lambda frame: frame <= params['frame']

        else:
            raise ValueError("ERROR: Invalid endpoint parameter provided.")

        localizations_to_remove = []
        for loc in localizations:
            if not keep_localization(frame=loc.frame):
                localizations_to_remove.append(loc.id)

        localizations = Localization.objects.filter(pk__in=localizations_to_remove)
        obj.localizations.remove(*list(localizations))
        obj.save()

        deleted_localizations = []
        for loc_id in localizations_to_remove:
            qs = State.objects.filter(localizations__pk=loc_id)
            if not qs.exists():
                deleted_localizations.append(loc_id)

        qs = Localization.objects.filter(pk__in=deleted_localizations)
        qs._raw_delete(qs.db)

        return {'message': f'State {params["id"]} has been updated. Deleted {len(deleted_localizations)} localizations.'}

    def get_queryset(self):
        return State.objects.all()
