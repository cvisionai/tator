import logging
import datetime
from itertools import chain
import os
import shutil
import mimetypes
import datetime
import tempfile
from uuid import uuid1
from urllib.parse import urlparse

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Case, When
from django.http import Http404
from PIL import Image
import pillow_avif  # add AVIF support to pillow
import rawpy
import imageio

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
from ..search import TatorSearch
from ..schema import MediaListSchema, MediaDetailSchema, parse
from ..schema.components import media as media_schema
from ..notify import Notify
from ..download import download_file
from ..store import get_tator_store, get_storage_lookup
from ..cache import TatorCache

# from ._migrate import (
# )

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
        dest_project = create_project(params, dest_project)
        create_memberships(src_api, dest_api, dest_project, memberships, users)
        create_sections(src_api, dest_api, dest_project, sections)
        version_mapping = create_versions(
            src_api, dest_api, dest_project, versions, version_mapping
        )
        media_type_mapping = create_media_types(
            src_api, dest_api, dest_project, media_types, media_type_mapping
        )
        localization_type_mapping = create_localization_types(
            src_api,
            dest_api,
            dest_project,
            localization_types,
            localization_type_mapping,
            media_type_mapping,
        )
        state_type_mapping = create_state_types(
            src_api, dest_api, dest_project, state_types, state_type_mapping, media_type_mapping
        )
        leaf_type_mapping = create_leaf_types(
            src_api, dest_api, dest_project, leaf_types, leaf_type_mapping
        )
        media_mapping = create_media(
            params,
            src_api,
            dest_api,
            dest_project,
            media,
            media_type_mapping,
            media_mapping,
            ignore_media_transfer,
        )
        localization_mapping = create_localizations(
            params,
            src_api,
            dest_api,
            dest_project,
            localizations,
            localization_type_mapping,
            localization_mapping,
            media_mapping,
            version_mapping,
        )
        create_states(
            params,
            src_api,
            dest_api,
            dest_project,
            states,
            state_type_mapping,
            state_mapping,
            media_mapping,
            version_mapping,
            localization_mapping,
        )
        create_leaves(
            params, src_api, dest_api, dest_project, leaves, leaf_type_mapping, leaf_mapping
        )
        return response
