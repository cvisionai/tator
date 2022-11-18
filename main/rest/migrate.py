import logging

from ..models import (
    Media,
    MediaType,
    Section,
    Localization,
    State,
    Project,
    Resource,
    Bucket,
    database_qs,
    database_query_ids,
)
from ..schema import MigrateListSchema

from ._migrate import (
    create_leaf_types,
    create_leaves,
    create_localizations,
    create_localization_types,
    create_media,
    create_media_types,
    create_memberships,
    create_project,
    create_sections,
    create_states,
    create_state_types,
    create_versions,
    find_dest_project,
    find_leaf_types,
    find_leaves,
    find_localizations,
    find_localization_types,
    find_media,
    find_media_types,
    find_memberships,
    find_sections,
    find_states,
    find_state_types,
    find_versions,
)

from ._util import url_to_key
from ._util import (
    bulk_update_and_log_changes,
    bulk_delete_and_log_changes,
    delete_and_log_changes,
    log_changes,
    log_creation,
    computeRequiredFields,
    check_required_fields,
)
from ._base_views import BaseListView, BaseDetailView
from ._media_query import get_media_queryset, get_media_es_query
from ._attributes import bulk_patch_attributes, patch_attributes, validate_attributes
from ._permissions import ProjectFullControlPermission

logger = logging.getLogger(__name__)


class MigrateListAPI(BaseListView):
    """Clones a project."""

    schema = MigrateListSchema()
    http_method_names = ["post"]
    permission_classes = [ProjectFullControlPermission]

    def _post(self, params):
        # Find which resources need to be migrated.
        dest_project = find_dest_project(params)
        memberships, users = find_memberships(params, dest_project)
        sections = find_sections(params, dest_project)
        versions, version_mapping = find_versions(params, dest_project)
        media_types, media_type_mapping = find_media_types(params, dest_project)
        localization_types, localization_type_mapping = find_localization_types(
            params, dest_project
        )
        state_types, state_type_mapping = find_state_types(params, dest_project)
        leaf_types, leaf_type_mapping = find_leaf_types(params, dest_project)
        media, media_mapping = find_media(params, dest_project)
        localizations, localization_mapping = find_localizations(
            params, dest_project, media, media_mapping, localization_type_mapping, version_mapping
        )
        states, state_mapping = find_states(
            params, dest_project, media, media_mapping, state_type_mapping, version_mapping
        )
        leaves, leaf_mapping = find_leaves(params, dest_project)
        ignore_media_transfer = params.get("ignore_media_transfer", False)
        if ignore_media_transfer:
            logger.info("Will not transfer media_files, due to ignore_media_transfer")

        # Perform migration.
        dest_project = create_project(params, dest_project, self.request.user)
        create_memberships(dest_project, memberships, users)
        create_sections(dest_project, sections)
        version_mapping = create_versions(
            dest_project, versions, version_mapping, self.request.user
        )
        media_type_mapping = create_media_types(dest_project, media_types, media_type_mapping)
        localization_type_mapping = create_localization_types(
            dest_project, localization_types, localization_type_mapping, media_type_mapping
        )
        state_type_mapping = create_state_types(
            dest_project, state_types, state_type_mapping, media_type_mapping
        )
        leaf_type_mapping = create_leaf_types(dest_project, leaf_types, leaf_type_mapping)
        media_mapping = create_media(
            params,
            dest_project,
            media,
            media_type_mapping,
            media_mapping,
            ignore_media_transfer,
        )
        localization_mapping = create_localizations(
            params,
            self.request.user,
            dest_project,
            localizations,
            localization_type_mapping,
            localization_mapping,
            media_mapping,
            version_mapping,
        )
        state_mapping = create_states(
            params,
            self.request.user,
            dest_project,
            states,
            state_type_mapping,
            state_mapping,
            media_mapping,
            version_mapping,
            localization_mapping,
        )
        create_leaves(params, dest_project, leaves, leaf_type_mapping, leaf_mapping)
        return {"message": f"Successfully cloned project {params['id']}!", "id": dest_project}

    def get_queryset(self):
        return Project.objects.all()
