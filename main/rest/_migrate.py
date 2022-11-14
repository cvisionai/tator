#!/usr/bin/env python3

import logging
import os
import shutil
import sys
import traceback


from collections import defaultdict

from ..models import (
    Leaf,
    LeafType,
    Localization,
    LocalizationType,
    Media,
    MediaType,
    Membership,
    Project,
    Section,
    State,
    StateType,
    Version,
)


logger = logging.getLogger(__name__)


def get_tator_user_sections(media):
    tator_user_sections = None
    if media.attributes:
        tator_user_sections = media.attributes.get("tator_user_sections", None)
    return tator_user_sections


def find_dest_project(params):
    """Finds destination project if it exists."""
    if "dest_project" in params:
        dest_project = Project.objects.get(pk=params["dest_project"])
        logger.info(f"Migrating to existing project {dest_project.name} specified by dest_project.")
    else:
        src_project = Project.objects.get(pk=params["id"])
        memberships = Membership.objects.filter(user=self.request.user)
        project_ids = memberships.values_list("id", flat=True)
        dest_projects = Project.objects.filter(pk__in=project_ids)
        dest_project = None
        name = params["new_project_name"] if params["new_project_name"] else src_project.name

        for project_obj in dest_projects:
            if project_obj.name == name:
                dest_project = project_obj
                logger.info(f"Migrating to existing project with ID {project_obj.id}.")
                break

        if dest_project is None:
            logger.info(f"New project with name {name} will be created.")

    return dest_project


def find_memberships(params, dest_project):
    """
    Finds existing memberships in destination project. Returns users and memberships corresponding
    to memberships in source project that need to be created.
    """
    memberships = []
    users = []
    if params.get("skip_memberships", False):
        logger.info("Skipping memberships due to skip_memberships.")
    else:
        memberships = Membership.objects.filter(project=params["id"])
        users = [membership.user for membership in memberships]
        num_src = len(users)
        if dest_project is not None:
            existing = Membership.objects.filter(project=dest_project.id)
            existing_usernames = [membership.user.username for membership in existing]
            memberships = [
                membership
                for membership in memberships
                if membership.user.username not in existing_usernames
            ]
            users = [
                membership.user
                for membership in memberships
                if membership.user.username not in existing_usernames
            ]
        logger.info(
            f"{len(users)} memberships will be created ({num_src - len(users)} already exist)."
        )
    return memberships, users


def find_sections(params, dest_project):
    """Finds existing sections in destination project. Returns sections in source project
    that need to be created and sections for which media should be migrated.
    """
    sections = []
    if params["skip_sections"]:
        logger.info("Skipping sections due to skip_sections.")
    else:
        sections = Section.objects.filter(project=params["project"])
        num_src = sections.count()
        if params.get("sections", []):
            sections = [section for section in sections if section.name in params["sections"]]
        if dest_project is not None:
            existing = Section.objects.filter(project=dest_project.id)
            existing_names = [section.name for section in existing]
            sections = [section for section in sections if section.name not in existing_names]
        logger.info(
            f"{len(sections)} sections will be created ({num_src - len(sections)} already exist)."
        )
    return sections


def find_versions(params, dest_project):
    """Finds existing versions in destination project. Returns ID mapping between source
    and destination versions and versions that need to be created.
    """
    versions = []
    version_mapping = {}
    if params.get("skip_versions", False):
        logger.info("Skipping versions due to skip_versions.")
    else:
        versions = Version.objects.filter(project=params["id"])
        if dest_project is not None:
            existing = Version.objects.filter(project=dest_project.id)
            existing_names = [version.name for version in existing]
            for version in versions:
                if version.name in existing_names:
                    version_mapping[version.id] = existing[existing_names.index(version.name)].id
            versions = [version for version in versions if version.name not in existing_names]
        logger.info(
            f"{len(versions)} versions will be created ({len(version_mapping.values())} "
            "already exist)."
        )
    return versions, version_mapping


def find_media_types(params, dest_project):
    """Finds existing media types in destination project. Returns ID mapping between source
    and destination media types and media types that need to be created.
    """
    media_types = []
    media_type_mapping = {}
    if params.get("skip_media_types", False):
        logger.info("Skipping media types due to skip_media_types.")
    else:
        media_types = MediaType.objects.filter(project=params["project"])
        if dest_project is not None:
            existing = MediaType.objects.filter(project=dest_project.id)
            existing_names = [media_type.name for media_type in existing]
            for media_type in media_types:
                if media_type.name in existing_names:
                    media_type_mapping[media_type.id] = existing[
                        existing_names.index(media_type.name)
                    ].id
            media_types = [
                media_type for media_type in media_types if media_type.name not in existing_names
            ]
        logger.info(
            f"{len(media_types)} media types will be created ({len(media_type_mapping.values())} "
            "already exist)."
        )
    return media_types, media_type_mapping


def find_localization_types(params, dest_project):
    """Finds existing localization types in destination project. Returns ID mapping between source
    and destination localization types and localization types that need to be created.
    """
    localization_types = []
    localization_type_mapping = {}
    if params.get("skip_localization_types", False):
        logger.info("Skipping localization types due to skip_localization_types.")
    else:
        localization_types = LocalizationType.objects.filter(project=params["id"])
        if dest_project is not None:
            existing = LocalizationType.objects.filter(project=dest_project.id)
            existing_names = [localization_type.name for localization_type in existing]
            for localization_type in localization_types:
                if localization_type.name in existing_names:
                    existing_id = existing[existing_names.index(localization_type.name)].id
                    localization_type_mapping[localization_type.id] = existing_id
            localization_types = [
                localization_type
                for localization_type in localization_types
                if localization_type.name not in existing_names
            ]
        logger.info(
            f"{len(localization_types)} localization types will be created "
            f"({len(localization_type_mapping.values())} already exist)."
        )
    return localization_types, localization_type_mapping


def find_state_types(params, dest_project):
    """Finds existing state types in destination project. Returns ID mapping between source
    and destination state types and state types that need to be created.
    """
    state_types = []
    state_type_mapping = {}
    if params.get("skip_state_types", False):
        logger.info("Skipping state types due to skip_state_types.")
    else:
        state_types = StateType.objects.filter(project=params["id"])
        if dest_project is not None:
            existing = StateType.objects.filter(project=dest_project.id)
            existing_names = [state_type.name for state_type in existing]
            for state_type in state_types:
                if state_type.name in existing_names:
                    state_type_mapping[state_type.id] = existing[
                        existing_names.index(state_type.name)
                    ].id
            state_types = [
                state_type for state_type in state_types if state_type.name not in existing_names
            ]
        logger.info(
            f"{len(state_types)} state types will be created ({len(state_type_mapping.values())} "
            "already exist)."
        )
    return state_types, state_type_mapping


def find_leaf_types(params, dest_project):
    """Finds existing leaf types in destination project. Returns ID mapping between source
    and destination leaf types and leaf types that need to be created.
    """
    leaf_types = []
    leaf_type_mapping = {}
    if params.get("skip_leaf_types", False):
        logger.info("Skipping leaf types due to skip_leaf_types.")
    else:
        leaf_types = LeafType.objects.filter(project=params["id"])
        if dest_project is not None:
            existing = LeafType.objects.filter(project=dest_project.id)
            existing_names = [leaf_type.name for leaf_type in existing]
            for leaf_type in leaf_types:
                if leaf_type.name in existing_names:
                    leaf_type_mapping[leaf_type.id] = existing[
                        existing_names.index(leaf_type.name)
                    ].id
            leaf_types = [
                leaf_type for leaf_type in leaf_types if leaf_type.name not in existing_names
            ]
        logger.info(
            f"{len(leaf_types)} leaf types will be created ({len(leaf_type_mapping.values())} "
            "already exist)."
        )
    return leaf_types, leaf_type_mapping


def find_media(params, dest_project):
    """Finds existing media in destination project. Returns media that need to be created and ID
    mapping between source and destination medias.
    """
    media = []
    media_mapping = {}
    if params.get("skip_media", False):
        logger.info("Skipping media due to skip_media.")
    else:
        if params.get("sections", []):
            sections = Section.objects.filter(project=params["id"])
            sections = [section for section in sections if section.name in params["sections"]]
            for section in sections:
                section_media = Media.objects.filter(
                    project=params["id"],
                    attributes__tator_user_sections=section.tator_user_sections,
                )
                num_src_media = section_media.count()
                if dest_project is not None:
                    existing_section = Section.objects.filter(
                        project=dest_project.id, name__iexact=f"'{section.name}'"
                    )
                    if existing_section.exists():
                        existing = Media.objects.filter(
                            project=dest_project.id,
                            attributes__tator_user_sections=existing_section[0].tator_user_sections,
                        )
                        existing_names = [m.name for m in existing]
                        for m in section_media:
                            if m.name in existing_names:
                                media_mapping[m.id] = existing[existing_names.index(m.name)].id
                        section_media = [m for m in section_media if m.name not in existing_names]
                logger.info(
                    f"{len(section_media)} media from section {section.name} will be "
                    f"created ({num_src_media - len(section_media)} already exist)."
                )
                media += section_media
        else:
            media = Media.objects.filter(project=params["id"])
            num_src_media = len(media)
            if dest_project is not None:
                src_sections = Section.objects.filter(project=params["id"])
                dest_sections = Section.objects.filter(project=dest_project.id)
                src_section_names = {s.tator_user_sections: s.name for s in src_sections}
                dest_section_names = {s.tator_user_sections: s.name for s in dest_sections}
                src_section_names[None] = None
                dest_section_names[None] = None
                existing = Media.objects.filter(project=dest_project.id)
                existing_name_section = [
                    (m.name, dest_section_names[get_tator_user_sections(m)]) for m in existing
                ]
                for m in media:
                    key = (m.name, src_section_names[get_tator_user_sections(m)])
                    if key in existing_name_section:
                        media_mapping[m.id] = existing[existing_name_section.index(key)].id
                media = [
                    m
                    for m in media
                    if (m.name, src_section_names[get_tator_user_sections(m)])
                    not in existing_name_section
                ]
            logger.info(
                f"{len(media)} media will be created ({num_src_media - len(media)} "
                "already exist)."
            )
    return media, media_mapping


def _is_num(x):
    return isinstance(x, float) or isinstance(x, int)


def _same_localization(a, b, localization_type_mapping, version_mapping):
    """Returns true if two localizations have nearly identical geometry.
    a is a source localization, b is a dest localization
    """
    ok = localization_type_mapping.get(a.meta) == b.meta
    ok = ok and version_mapping.get(a.version) == b.version
    ok = ok and a.frame == b.frame
    for key in a.attributes:
        attr_a = a.attributes.get(key)
        attr_b = b.attributes.get(key)
        if attr_a is None or attr_b is None:
            # It is possible for an attribute to be present that is not carried
            # over to a clone if that attribute been deleted from the type since
            # it was defined.
            continue
        if _is_num(attr_a) and _is_num(attr_b):
            ok = ok and abs(attr_a - attr_b) < 0.01
        else:
            ok = ok and a.attributes.get(key) == b.attributes.get(key)
    if a.x and b.x:
        ok = ok and abs(a.x - b.x) < 0.01
    if a.y and b.y:
        ok = ok and abs(a.y - b.y) < 0.01
    if a.width and b.width:
        ok = ok and abs(a.width - b.width) < 0.01
    if a.height and b.height:
        ok = ok and abs(a.height - b.height) < 0.01
    if a.u and b.u:
        ok = ok and abs(a.u - b.u) < 0.01
    if a.v and b.v:
        ok = ok and abs(a.v - b.v) < 0.01
    return ok


def find_localizations(
    params,
    dest_project,
    media,
    media_mapping,
    localization_type_mapping,
    version_mapping,
):
    """Finds existing localizations in destination project. Returns localizations that need to
    be created and ID mapping between source and destination medias.
    """
    count = 0
    localization_media_ids = []
    if params.get("skip_localizations", False):
        logger.info("Skipping localizations due to skip_localizations")
        localizations = []
        localization_mapping = {}
    else:
        # Get existing localizations.
        dest_media_ids = list(media_mapping.values())
        existing_loc = Localization.objects.filter(project=dest_project.id, media__in=dest_media_ids)
        # Get all source localizations.
        src_media_ids = list(media_mapping.keys()) + [m.id for m in media]
        source_loc = Localization.objects.filter(project=params["id"], media__in=src_media_ids)
        # Group source and dest localizations by source media ID and frame number.
        reverse_media = {v: k for k, v in media_mapping.items()}
        existing_grouped = defaultdict(list)
        source_grouped = defaultdict(list)
        for loc in existing_loc:
            existing_grouped[(reverse_media[loc.media], loc.frame)].append(loc)
        for loc in source_loc:
            source_grouped[(loc.media, loc.frame)].append(loc)
        # Add localizations to mapping or create list depending on geometry match.
        localizations = []
        localization_mapping = {}
        for key, locs in source_grouped.items():
            for src_loc in locs:
                found = False
                for dest_loc in existing_grouped[key]:
                    same = _same_localization(
                        src_loc, dest_loc, localization_type_mapping, version_mapping
                    )
                    if same:
                        found = True
                        localization_mapping[src_loc.id] = dest_loc.id
                if not found:
                    logger.warning(
                        f"NOT FOUND: SRC ID {src_loc.id}, DEST IDS {[loc.id for loc in existing_grouped[key]]}"
                    )
                    raise RuntimeError("Shouldn't be missing any...")
                    localizations.append(src_loc)
        logger.info(
            f"{len(localizations)} localizations will be created ({len(localization_mapping.keys())} "
            "already exist)."
        )
    return localizations, localization_mapping


def _same_state(a, b, state_type_mapping, version_mapping):
    """Returns true if two states have same version and type."""
    ok = state_type_mapping.get(a.meta) == b.meta
    ok = ok and version_mapping.get(a.version) == b.version
    ok = ok and a.frame == b.frame
    for key in a.attributes:
        attr_a = a.attributes.get(key)
        attr_b = b.attributes.get(key)
        if _is_num(attr_a) and _is_num(attr_b):
            ok = ok and abs(attr_a - attr_b) < 0.01
        else:
            ok = ok and a.attributes.get(key) == b.attributes.get(key)
    return ok


def find_states(params, dest_project, media, media_mapping, state_type_mapping, version_mapping):
    """Finds existing states in destination project. Returns"""
    count = 0
    state_media_ids = []
    if params.get("skip_states"):
        logger.info("Skipping states due to skip_states")
        states = []
        state_mapping = {}
    else:
        # Get existing states.
        dest_media_ids = list(media_mapping.values())
        existing_states = State.objects.filter(project=dest_project.id, media__in=dest_media_ids)
        # Get all source states.
        src_media_ids = list(media_mapping.keys()) + [m.id for m in media]
        source_states = State.objects.filter(project=dest_project.id, media__in=src_media_ids)
        # Group source and dest states by source media ID and frame number.
        print("Building lookups by media/frame...")
        reverse_media = {v: k for k, v in media_mapping.items()}
        existing_grouped = defaultdict(list)
        source_grouped = defaultdict(list)
        for state in existing_states:
            existing_grouped[(reverse_media[state.media[0]], state.frame)].append(state)
        for state in source_states:
            source_grouped[(state.media[0], state.frame)].append(state)
        # Add states to mapping or create list depending on geometry match.
        states = []
        state_mapping = {}
        for key, state_list in source_grouped.items():
            for src_state in state_list:
                found = False
                for dest_state in existing_grouped[key]:
                    same = _same_state(src_state, dest_state, state_type_mapping, version_mapping)
                    if same:
                        found = True
                        state_mapping[src_state.id] = dest_state.id
                if not found:
                    states.append(src_state)
        logger.info(
            f"{len(states)} states will be created ({len(state_mapping.keys())} " "already exist)."
        )
    return states, state_mapping


def find_leaves(params, dest_project):
    """Finds existing leaves in destination project. Returns leaves that need to be created,
    grouped in a dictionary by depth and mapping of src and dest leaves for existing
    leaves.
    """
    leaves = {}
    leaf_mapping = {}
    num_leaves = 0
    num_skipped = 0
    if params.get("skip_leaves"):
        logger.info("Skipping leaves due to skip_leaves")
    else:
        depth = 0
        while True:
            min_depth = depth + 1
            max_depth = depth + 3
            all_src_leaves = Leaf.objects.filter(project=params["id"])
            src_leaves = [leaf for leaf in all_src_leaves if min_depth < leaf.depth() < max_depth]
            if not src_leaves:
                break
            if dest_project:
                all_dest_leaves = Leaf.objects.filter(project=dest_project.id)
                dest_leaves = [leaf for leaf in all_dest_leaves if min_depth < leaf.depth() < max_depth]
                dest_paths = [leaf.path[1] for leaf in dest_leaves]
                for leaf in src_leaves:
                    path = leaf.path[1]
                    if path in dest_paths:
                        leaf_mapping[leaf.id] = dest_leaves[dest_paths.index(path)].id
                leaves[depth] = [leaf for leaf in src_leaves if leaf.path[1] not in dest_paths]
            else:
                leaves[depth] = list(src_leaves)
            num_leaves += len(leaves[depth])
            num_skipped += len(src_leaves) - len(leaves[depth])
            depth += 1
        logger.info(f"{num_leaves} leaves will be created ({num_skipped} " "already exist).")
    return leaves, leaf_mapping


def create_project(params, dest_project):
    """Creates a project if necessary. Returns the destination project ID."""
    if dest_project is None:
        src_project = Project.objects.get(params["id"])
        name = params["new_project_name"] if "new_project_name" in params else src_project.name
        spec = {"name": name, "organization": params["dest_organization"]}
        if src_project.summary:
            spec["summary"] = src_project.summary
        # TODO continue here!
        response = dest_api.create_project(project_spec=spec)
        logger.info(f"Created new project with ID {response.id}")
        dest_project = response.id
    else:
        dest_project = dest_project.id
    return dest_project


def create_memberships(src_api, dest_api, dest_project, memberships, users):
    """Creates memberships."""
    num_skipped = 0
    num_created = 0
    for membership, user in zip(memberships, users):
        # Look up user by username.
        dest_users = dest_api.get_user_list(username=user.username)
        if len(dest_users) == 0:
            num_skipped += 1
        else:
            dest_user = dest_users[0]
            spec = {"user": dest_user.id, "permission": membership.permission}
            response = dest_api.create_membership(dest_project, membership_spec=spec)
            assert isinstance(response, tator.models.CreateResponse)
            num_created += 1
    msg = f"Created {num_created} memberships."
    if num_skipped > 0:
        msg += f" Skipped {num_skipped} (no matching user)."
    logger.info(msg)


def create_sections(src_api, dest_api, dest_project, sections):
    """Creates sections."""
    for section in sections:
        response = tator.util.clone_section(src_api, section.id, dest_project, dest_api)
        assert isinstance(response, tator.models.CreateResponse)
    logger.info(f"Created {len(sections)} sections.")


def create_versions(src_api, dest_api, dest_project, versions, version_mapping):
    """Creates versions. Returns updated version mapping."""
    for version in versions:
        response = tator.util.clone_version(
            src_api, version.id, dest_project, version_mapping, dest_api
        )
        assert isinstance(response, tator.models.CreateResponse)
        version_mapping[version.id] = response.id
    logger.info(f"Created {len(versions)} versions.")
    return version_mapping


def create_media_types(src_api, dest_api, dest_project, media_types, media_type_mapping):
    """Creates media types. Returns updated media type mapping."""
    for media_type in media_types:
        response = tator.util.clone_media_type(src_api, media_type.id, dest_project, dest_api)
        assert isinstance(response, tator.models.CreateResponse)
        media_type_mapping[media_type.id] = response.id
    logger.info(f"Created {len(media_types)} media types.")
    return media_type_mapping


def create_localization_types(
    src_api,
    dest_api,
    dest_project,
    localization_types,
    localization_type_mapping,
    media_type_mapping,
):
    """Creates localization types. Returns updated localization type mapping."""
    for localization_type in localization_types:
        response = tator.util.clone_localization_type(
            src_api, localization_type.id, dest_project, media_type_mapping, dest_api
        )
        assert isinstance(response, tator.models.CreateResponse)
        localization_type_mapping[localization_type.id] = response.id
    logger.info(f"Created {len(localization_types)} localization types.")
    return localization_type_mapping


def create_state_types(
    src_api, dest_api, dest_project, state_types, state_type_mapping, media_type_mapping
):
    """Creates state types. Returns updated state type mapping."""
    for state_type in state_types:
        response = tator.util.clone_state_type(
            src_api, state_type.id, dest_project, media_type_mapping, dest_api
        )
        assert isinstance(response, tator.models.CreateResponse)
        state_type_mapping[state_type.id] = response.id
    logger.info(f"Created {len(state_types)} state types.")
    return state_type_mapping


def create_leaf_types(src_api, dest_api, dest_project, leaf_types, leaf_type_mapping):
    """Creates leaf types. Returns updated leaf type mapping."""
    for leaf_type in leaf_types:
        response = tator.util.clone_leaf_type(src_api, leaf_type.id, dest_project, dest_api)
        assert isinstance(response, tator.models.CreateResponse)
        leaf_type_mapping[leaf_type.id] = response.id
    logger.info(f"Created {len(leaf_types)} leaf types.")
    return leaf_type_mapping


def create_media(
    args,
    src_api,
    dest_api,
    dest_project,
    media,
    media_type_mapping,
    media_mapping,
    ignore_media_transfer,
):
    """Creates media. Returns media mapping."""
    num_total = len(media)
    # Look up sections in destination project, create a dict between tator_user_sections and
    # section name.
    sections = src_api.get_section_list(args.project)
    if args.sections:
        sections = [section for section in sections if section.name in args.sections]
    section_mapping = {s.tator_user_sections: s.name for s in sections}
    section_mapping[None] = None
    # Construct dictionary between destination type/destination section and media IDs.
    media_ids = defaultdict(list)
    for single in media:
        key = (media_type_mapping[single.meta], section_mapping[get_tator_user_sections(single)])
        media_ids[key].append(single.id)
    # Sort keys so that multi are created after images/videos.
    sorter = lambda mtype: 1 if dest_api.get_media_type(mtype[0]).dtype == "multi" else 0
    keys = list(media_ids.keys())
    keys.sort(key=sorter)
    # Iterate through type/sections and create media.
    use_dest_api = None if src_api is dest_api else dest_api
    total_created = 0
    for key in keys:
        dest_type, dest_section = key
        for idx in range(0, len(media_ids[key]), 100):  # Do batching here to manage ID query size.
            query_params = {"project": args.project, "media_id": media_ids[key][idx : idx + 100]}
            generator = tator.util.clone_media_list(
                src_api,
                query_params,
                dest_project,
                media_mapping,
                dest_type,
                dest_section,
                use_dest_api,
                ignore_media_transfer,
            )
            for _, _, response, id_map in generator:
                if isinstance(response, tator.models.CreateResponse):
                    total_created += 1
                elif isinstance(response, tator.models.CreateListResponse):
                    total_created += len(response.id)
                else:
                    raise ValueError("Error cloning media!")
                logger.info(f"Created {total_created} of {num_total} files...")
                media_mapping = {**media_mapping, **id_map}
    logger.info(f"Created {num_total} media.")
    return media_mapping


def create_localizations(
    args,
    src_api,
    dest_api,
    dest_project,
    localizations,
    localization_type_mapping,
    localization_mapping,
    media_mapping,
    version_mapping,
):
    """Creates localizations. Returns localization mapping."""
    # Iterate through media and create localization.
    total_created = 0
    for idx in range(0, len(localizations), 100):  # Do batching here to manage ID query size.
        query_params = {
            "project": args.project,
            "localization_id_query": {"ids": [loc.id for loc in localizations[idx : idx + 100]]},
        }
        generator = tator.util.clone_localization_list(
            src_api,
            query_params,
            dest_project,
            version_mapping,
            media_mapping,
            localization_type_mapping,
            dest_api,
        )
        for _, _, response, id_map in generator:
            total_created += len(response.id)
            logger.info(f"Created {total_created} of {len(localizations)} localizations...")
            localization_mapping = {**localization_mapping, **id_map}
    logger.info(f"Created {total_created} localizations.")
    return localization_mapping


def create_states(
    args,
    src_api,
    dest_api,
    dest_project,
    states,
    state_type_mapping,
    state_mapping,
    media_mapping,
    version_mapping,
    localization_mapping,
):
    """Creates states."""
    # Iterate through media and create state.
    total_created = 0
    for idx in range(0, len(states), 100):  # Do batching here to manage ID query size.
        query_params = {
            "project": args.project,
            "state_id_query": {"ids": [state.id for state in states[idx : idx + 100]]},
        }
        generator = tator.util.clone_state_list(
            src_api,
            query_params,
            dest_project,
            version_mapping,
            media_mapping,
            localization_mapping,
            state_type_mapping,
            dest_api,
        )
        for _, _, response, id_map in generator:
            total_created += len(response.id)
            logger.info(f"Created {total_created} of {len(states)} states...")
            state_mapping = {**state_mapping, **id_map}
    logger.info(f"Created {total_created} states.")
    return state_mapping


def create_leaves(args, src_api, dest_api, dest_project, leaves, leaf_type_mapping, leaf_mapping):
    """Creates leaves. Returns leaf mapping."""
    total_created = 0
    leaf_count = sum([len(leaf_list) for leaf_list in leaves.values()])
    for depth in leaves:
        for idx in range(0, len(leaves[depth]), 100):
            leaf_ids = [leaf.id for leaf in leaves[depth][idx : idx + 100]]
            query_params = {"project": args.project, "leaf_id": leaf_ids}
            generator = tator.util.clone_leaf_list(
                src_api, query_params, dest_project, leaf_mapping, leaf_type_mapping, dest_api
            )
            for _, _, response, id_map in generator:
                total_created += len(response.id)
                logger.info(f"Created {total_created} of {leaf_count}")
                leaf_mapping = {**leaf_mapping, **id_map}
    logger.info(f"Created {leaf_count} leaves.")


if __name__ == "__main__":
    args = parse_args()
    src_api, dest_api = setup_apis(args)
    # Find which resources need to be migrated.
    dest_project = find_dest_project(args, src_api, dest_api)
    memberships, users = find_memberships(args, src_api, dest_api, dest_project)
    sections = find_sections(args, src_api, dest_api, dest_project)
    versions, version_mapping = find_versions(args, src_api, dest_api, dest_project)
    media_types, media_type_mapping = find_media_types(args, src_api, dest_api, dest_project)
    localization_types, localization_type_mapping = find_localization_types(
        args, src_api, dest_api, dest_project
    )
    state_types, state_type_mapping = find_state_types(args, src_api, dest_api, dest_project)
    leaf_types, leaf_type_mapping = find_leaf_types(args, src_api, dest_api, dest_project)
    media, media_mapping = find_media(args, src_api, dest_api, dest_project)
    localizations, localization_mapping = find_localizations(
        args,
        src_api,
        dest_api,
        dest_project,
        media,
        media_mapping,
        localization_type_mapping,
        version_mapping,
    )
    states, state_mapping = find_states(
        args,
        src_api,
        dest_api,
        dest_project,
        media,
        media_mapping,
        state_type_mapping,
        version_mapping,
    )
    leaves, leaf_mapping = find_leaves(args, src_api, dest_api, dest_project)
    ignore_media_transfer = True if args.ignore_media_transfer else False
    if ignore_media_transfer:
        logger.info("Will not transfer media_files")

    # Confirm migration with user.
    proceed = input("Continue with migration [y/N]? ")
    if proceed == "y":
        # Perform migration.
        dest_project = create_project(args, src_api, dest_api, dest_project)
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
            args,
            src_api,
            dest_api,
            dest_project,
            media,
            media_type_mapping,
            media_mapping,
            ignore_media_transfer,
        )
        localization_mapping = create_localizations(
            args,
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
            args,
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
            args, src_api, dest_api, dest_project, leaves, leaf_type_mapping, leaf_mapping
        )
    else:
        logger.info("Migration cancelled by user.")
