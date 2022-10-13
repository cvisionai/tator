import logging
import datetime
from django.db.models import Subquery
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.http import Http404

from ..models import Localization
from ..models import LocalizationType
from ..models import Media
from ..models import MediaType
from ..models import Membership
from ..models import State
from ..models import User
from ..models import Project
from ..models import Version
from ..models import database_qs
from ..models import database_query_ids
from ..search import TatorSearch
from ..schema import LocalizationListSchema
from ..schema import LocalizationDetailSchema
from ..schema import parse
from ..schema.components import localization as localization_schema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._annotation_query import get_annotation_queryset
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
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)

LOCALIZATION_PROPERTIES = list(localization_schema['properties'].keys())

class LocalizationListAPI(BaseListView):
    """ Interact with list of localizations.

        Localizations are shape annotations drawn on a video or image. They are currently of type
        box, line, or dot. Each shape has slightly different data members. Localizations are
        a type of entity in Tator, meaning they can be described by user defined attributes.

        This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
        Both are accomplished using the same query parameters used for a GET request.
    """
    schema = LocalizationListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'post', 'patch', 'delete', 'put']
    entity_type = LocalizationType # Needed by attribute filter mixin

    def _get(self, params):
        qs = get_annotation_queryset(self.kwargs['project'], params, 'localization')
        response_data = list(qs.values(*LOCALIZATION_PROPERTIES))

        # Adjust fields for csv output.
        if self.request.accepted_renderer.format == 'csv':
            # CSV creation requires a bit more
            user_ids = set([d['user'] for d in response_data])
            users = list(User.objects.filter(id__in=user_ids).values('id','email'))
            email_dict = {}
            for user in users:
                email_dict[user['id']] = user['email']

            media_ids = set([d['media'] for d in response_data])
            medias = list(Media.objects.filter(id__in=media_ids).values('id','name'))
            filename_dict = {}
            for media in medias:
                filename_dict[media['id']] = media['name']

            for element in response_data:
                del element['meta']

                oldAttributes = element['attributes']
                del element['attributes']
                element.update(oldAttributes)

                user_id = element['user']
                media_id = element['media']

                element['user'] = email_dict[user_id]
                element['media'] = filename_dict[media_id]
        return response_data

    def _post(self, params):
        # Check that we are getting a localization list.
        if 'body' in params:
            loc_specs = params['body']
        else:
            raise Exception('Localization creation requires list of localizations!')

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
        meta_ids = set([loc['type'] for loc in loc_specs])
        media_ids = set([loc['media_id'] for loc in loc_specs])
        version_ids = set([loc.get('version', None) for loc in loc_specs])
        version_ids.add(default_version.id)

        # Make foreign key querysets.
        meta_qs = LocalizationType.objects.filter(pk__in=meta_ids)
        media_qs = Media.objects.filter(pk__in=media_ids)
        version_qs = Version.objects.filter(pk__in=version_ids)

        # Construct foreign key dictionaries.
        project = Project.objects.get(pk=params['project'])
        metas = {obj.id:obj for obj in meta_qs.iterator()}
        medias = {obj.id:obj for obj in media_qs.iterator()}
        versions = {obj.id:obj for obj in version_qs.iterator()}
        versions[None] = default_version

        # Make sure project of all foreign keys is correct.
        meta_projects = list(meta_qs.values_list('project', flat=True).distinct())
        media_projects = list(media_qs.values_list('project', flat=True).distinct())
        version_projects = list(version_qs.values_list('project', flat=True).distinct())
        if len(meta_projects) != 1:
            raise Exception(f"Localization types must be part of project {project.id}, got "
                            f"projects {meta_projects}!")
        elif meta_projects[0] != project.id:
            raise Exception(f"Localization types must be part of project {project.id}, got "
                            f"project {meta_projects[0]}!")
        if len(media_projects) != 1:
            raise Exception(f"Media must be part of project {project.id}, got projects "
                            f"{media_projects}!")
        elif media_projects[0] != project.id:
            raise Exception(f"Media must be part of project {project.id}, got project "
                            f"{media_projects[0]}!")
        if len(version_projects) != 1:
            raise Exception(f"Versions must be part of project {project.id}, got projects "
                            f"{version_projects}!")
        elif version_projects[0] != project.id:
            raise Exception(f"Versions must be part of project {project.id}, got project "
                            f"{version_projects[0]}!")

        # Get required fields for attributes.
        required_fields = {id_:computeRequiredFields(metas[id_]) for id_ in meta_ids}
        attr_specs = [check_required_fields(required_fields[loc['type']][0],
                                            required_fields[loc['type']][2],
                                            loc)
                      for loc in loc_specs]

        # Create the localization objects.
        objs = (
            Localization(
                project=project,
                meta=metas[loc_spec["type"]],
                media=medias[loc_spec["media_id"]],
                user=self.request.user,
                attributes=attrs,
                created_by=self.request.user,
                modified_by=self.request.user,
                version=versions[loc_spec.get("version", None)],
                parent=Localization.objects.get(pk=loc_spec.get("parent"))
                if loc_spec.get("parent")
                else None,
                x=loc_spec.get("x", None),
                y=loc_spec.get("y", None),
                u=loc_spec.get("u", None),
                v=loc_spec.get("v", None),
                width=loc_spec.get("width", None),
                height=loc_spec.get("height", None),
                points=loc_spec.get("points", None),
                frame=loc_spec.get("frame", None),
            )
            for loc_spec, attrs in zip(loc_specs, attr_specs)
        )
        localizations = bulk_create_from_generator(objs, Localization)

        # Build ES documents.
        ts = TatorSearch()
        documents = []
        for loc in localizations:
            documents += ts.build_document(loc)
            if len(documents) > 1000:
                ts.bulk_add_documents(documents)
                documents = []
        ts.bulk_add_documents(documents)

        ids = bulk_log_creation(localizations, project, self.request.user)

        # Return created IDs.
        return {'message': f'Successfully created {len(ids)} localizations!', 'id': ids}

    def _delete(self, params):
        qs = get_annotation_queryset(params['project'], params, 'localization')
        count = qs.count()
        if count > 0:
            # Delete the localizations.
            bulk_delete_and_log_changes(qs, params["project"], self.request.user)

        return {'message': f'Successfully deleted {count} localizations!'}

    def _patch(self, params):
        patched_version = params.pop("version", None)
        qs = get_annotation_queryset(params['project'], params, 'localization')
        count = qs.count()
        if count > 0:
            # Get the current representation of the object for comparison
            obj = qs.first()
            first_id = obj.id
            entity_type = obj.meta
            new_attrs = validate_attributes(params, qs[0])
            update_kwargs = {"modified_by": self.request.user}
            if patched_version is not None:
                update_kwargs["version"] = patched_version

            bulk_update_and_log_changes(
                qs,
                params["project"],
                self.request.user,
                update_kwargs=update_kwargs,
                new_attributes=new_attrs,
            )

        return {'message': f'Successfully updated {count} localizations!'}

    def _put(self, params):
        """ Retrieve list of localizations by ID.
        """
        return self._get(params)

class LocalizationDetailAPI(BaseDetailView):
    """ Interact with single localization.

        Localizations are shape annotations drawn on a video or image. They are currently of type
        box, line, or dot. Each shape has slightly different data members. Localizations are
        a type of entity in Tator, meaning they can be described by user defined attributes.
    """
    schema = LocalizationDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        qs = Localization.objects.filter(pk=params['id'], deleted=False)
        if not qs.exists():
            raise Http404
        return database_qs(qs)[0]

    @transaction.atomic
    def _patch(self, params):
        obj = Localization.objects.get(pk=params['id'], deleted=False)
        model_dict = obj.model_dict

        # Patch common attributes.
        frame = params.get("frame", None)
        version = params.get("version", None)

        if frame is not None:
            obj.frame = frame
        if version is not None:
            obj.version = version

        if obj.meta.dtype == 'box':
            x = params.get("x", None)
            y = params.get("y", None)
            height = params.get("height", None)
            width = params.get("width", None)
            thumbnail_image = params.get("thumbnail_image", None)
            if x is not None:
                obj.x = x
            if y is not None:
                obj.y = y
            if height:
                obj.height = height
            if width:
                obj.width = width

            # If the localization moved; the thumbnail is expired
            if (x or y or height or width) and obj.thumbnail_image:
                obj.thumbnail_image.delete()

            if thumbnail_image:
                try:
                    thumbnail_obj = Media.objects.get(pk=thumbnail_image)
                    obj.thumbnail_image = thumbnail_obj
                except:
                    logger.error("Bad thumbnail reference given")
        elif obj.meta.dtype == 'line':
            x = params.get("x", None)
            y = params.get("y", None)
            u = params.get("u", None)
            v = params.get("v", None)
            if x is not None:
                obj.x = x
            if y is not None:
                obj.y = y
            if u:
                obj.u = u
            if v:
                obj.v = v
        elif obj.meta.dtype == 'dot':
            x = params.get("x", None)
            y = params.get("y", None)
            if x is not None:
                obj.x = x
            if y is not None:
                obj.y = y
        elif obj.meta.dtype == 'poly':
            points = params.get("points", None)
            if points:
                obj.points = points
        else:
            # TODO: Handle circles.
            pass

        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)

        # Update modified_by to be the last user
        obj.modified_by = self.request.user

        # Patch the thumbnail attributes
        if obj.thumbnail_image:
            obj.thumbnail_image = patch_attributes(new_attrs, obj.thumbnail_image)
            obj.thumbnail_image.save()

        obj.save()
        log_changes(obj, model_dict, obj.project, self.request.user)

        return {'message': f'Localization {params["id"]} successfully updated!'}

    def _delete(self, params):
        qs = Localization.objects.filter(pk=params['id'], deleted=False)
        if not qs.exists():
            raise Http404
        obj = qs[0]
        delete_and_log_changes(obj, obj.project, self.request.user)
        TatorSearch().delete_document(obj)
        return {'message': f'Localization {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Localization.objects.all()

