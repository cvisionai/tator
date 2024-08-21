# Class to pull out permissions logic from models.py to avoid false positives on migration checks

from main.models import RowProtection
from django.db.models import (
    UniqueConstraint,
    FilteredRelation,
    Q,
    F,
    Value,
    Subquery,
    Func,
    OuterRef,
    Window,
)
from django.contrib.gis.db.models import BigIntegerField
from django.contrib.postgres.aggregates import BitOr
from django.contrib.postgres.expressions import ArraySubquery
from django.db.models.functions import Coalesce, Cast
from django.db.models import JSONField, Lookup, IntegerField, Case, When
from main.models import *

import logging

logger = logging.getLogger(__name__)


class ColBitAnd(Func):
    function = ""
    template = "(%(expressions)s & %(bitmask)s)"

    def __init__(self, expression, bitmask, **extra):
        super().__init__(expression, bitmask=bitmask, **extra)


def mask_to_old_permission_string(project_bitmask):
    string_val = "None"
    if project_bitmask == PermissionMask.FULL_CONTROL:
        string_val = "Full Control"
    elif project_bitmask & PermissionMask.EXECUTE:
        string_val = "Can Execute"
    elif project_bitmask & PermissionMask.UPLOAD:
        string_val = "Can Transfer"
    elif project_bitmask & (PermissionMask.CREATE | PermissionMask.MODIFY):
        string_val = "Can Edit"
    elif project_bitmask & PermissionMask.READ:
        string_val = "View Only"

    return string_val


def get_parents_for_model(model):
    if model in [
        Dashboard,
        Favorite,
        Bookmark,
        HostedTemplate,
        TemporaryFile,
        ChangeLog,
        Announcement,
    ]:
        return [Project]
    elif model in [Localization, State]:
        return [Section, Version]
    elif model in [Media]:
        return [Section]
    elif model in [Section, Version, Algorithm, File, Leaf]:
        return [Project]
    elif model in [Bucket, JobCluster]:
        return [Organization]
    elif model in [
        Project,
        MediaType,
        LocalizationType,
        StateType,
        LeafType,
        FileType,
        Membership,
        None,
    ]:
        # These objects are originators, but logic should work out
        return [Project]
    else:
        assert False, f"Unhandled model {model}"


def shift_permission(model, source_model):
    if source_model in [Project, Organization]:
        shift = 0
    elif source_model in [Section, Version]:
        shift = 1
    else:
        assert False, f"Unhandled source_model {source_model}"

    if model in [
        Dashboard,
        Favorite,
        Bookmark,
        HostedTemplate,
        TemporaryFile,
        ChangeLog,
        Announcement,
    ]:
        return PermissionMask.CHILD_SHIFT * (4 - shift)
    elif model in [Localization, State, Group]:
        return PermissionMask.CHILD_SHIFT * (3 - shift)
    elif model in [Media]:
        return PermissionMask.CHILD_SHIFT * (2 - shift)
    elif model in [Section, Version, Algorithm, File, Bucket, JobCluster]:
        return PermissionMask.CHILD_SHIFT * (1 - shift)
    elif model in [
        Project,
        MediaType,
        LocalizationType,
        StateType,
        LeafType,
        FileType,
        Membership,
        Leaf,
        Organization,
    ]:
        return 0 - (shift * 8)  # this will cause an exception if we have a logic error somewhere
    else:
        assert False, f"Unhandled model {model}"


def augment_permission(user, qs):
    # Add effective_permission to the queryset
    if qs.exists():
        model = qs.model
        # handle shift due to underlying model
        # children are shifted by 8 bits, grandchildren by 16, etc.
        bit_shift = shift_permission(model, Project)
        groups = user.groupmembership_set.all().values("group").distinct()
        # groups = Group.objects.filter(pk=-1).values("id")
        organizations = user.affiliation_set.all().values("organization")

        # Exclude projects + organizational level objects
        if not model in [Project, Organization, Group, JobCluster, Bucket, HostedTemplate]:
            # This assumes all checks are scoped to the same project (expensive to check in runtime)
            project = qs[0].project

            # Filter for all relevant permissions the user has and OR them together
            # If someone is in a group with a permission, you can't remove it via a user-level
            # permission
            project_permission_query = RowProtection.objects.filter(project=project).filter(
                Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
            )
            if project_permission_query.exists():
                project_permission_query = project_permission_query.aggregate(
                    computed_permission=BitOr("permission")
                )
                project_permission = project_permission_query["computed_permission"]
            else:
                project_permission = 0

            qs = qs.alias(
                project_permission=Value(project_permission >> bit_shift),
            )
        elif model in [Group, JobCluster, Bucket, HostedTemplate]:
            # This calculates the default permission for an object based on what organization it is in
            org_qs = qs.values("organization")
            org_rp = RowProtection.objects.filter(target_organization__in=org_qs).filter(
                Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
            )
            org_rp = org_rp.annotate(
                calc_perm=Window(
                    expression=BitOr(F("permission")), partition_by=[F("target_organization")]
                )
            )
            org_perm_dict = {
                entry["target_organization"]: entry["calc_perm"]
                for entry in org_rp.values("target_organization", "calc_perm")
            }
            org_cases = [
                When(organization=target_org, then=Value(perm))
                for target_org, perm in org_perm_dict.items()
            ]
            qs = qs.alias(
                org_permission=Case(*org_cases, default=Value(0), output_field=BigIntegerField())
            )
        else:
            pass
    else:
        # If an object doesn't exist, we can't annotate it
        return qs

    if qs.query.low_mark != 0 or qs.query.high_mark is not None:
        # This is a slice, we need to get the full queryset to annotate + filter
        qs = model.objects.filter(pk__in=qs.values("pk"))
        qs = qs.alias(
            project_permission=Value(project_permission >> bit_shift),
        )

    if model in [Announcement]:
        # Everyone can read announcements
        qs = qs.annotate(effective_permission=Value(0x3))
    elif model in [
        Favorite,
        Bookmark,
        MediaType,
        LocalizationType,
        StateType,
        LeafType,
        FileType,
        Dashboard,
        HostedTemplate,
        TemporaryFile,
        ChangeLog,
        Leaf,
    ]:
        qs = qs.annotate(effective_permission=F("project_permission"))
    elif model in [Membership]:
        qs = qs.annotate(effective_permission=Value(0x3))  # disable mutability of these objects
    elif model in [Group]:
        group_rp = RowProtection.objects.filter(target_group__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        group_rp = group_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("target_group")])
        )
        group_perm_dict = {
            entry["group"]: entry["calc_perm"] for entry in group_rp.values("group", "calc_perm")
        }
        group_cases = [
            When(target_group=group, then=Value(perm)) for group, perm in group_perm_dict.items()
        ]
        qs = qs.annotate(
            effective_permission=Case(
                *group_cases,
                default=F("org_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [Project]:
        # These models are only protected by project-level permissions
        raw_rp = RowProtection.objects.filter(project__in=qs.values("pk"))
        project_rp = raw_rp.filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        project_rp = project_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("project")])
        )
        project_perm_dict = {
            entry["project"]: entry["calc_perm"]
            for entry in project_rp.values("project", "calc_perm")
        }

        project_cases = [
            When(pk=project, then=Value(perm)) for project, perm in project_perm_dict.items()
        ]
        qs = qs.annotate(
            effective_permission=Case(
                *project_cases,
                default=Value(0),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [Organization]:
        raw_rp = RowProtection.objects.filter(target_organization__in=qs.values("pk"))
        org_rp = raw_rp.filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        org_rp = org_rp.annotate(
            calc_perm=Window(
                expression=BitOr(F("permission")), partition_by=[F("target_organization")]
            )
        )
        org_perm_dict = {
            entry["target_organization"]: entry["calc_perm"]
            for entry in org_rp.values("target_organization", "calc_perm")
        }
        logger.info(f"ORG RP = {org_perm_dict}")
        org_cases = [
            When(pk=target_org, then=Value(perm)) for target_org, perm in org_perm_dict.items()
        ]
        qs = qs.annotate(
            effective_permission=Case(
                *org_cases,
                default=Value(0),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [File]:
        # These models are only protected by project-level permissions
        file_rp = RowProtection.objects.filter(file__pk__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        file_rp = file_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("file")])
        )
        file_perm_dict = {
            entry["file"]: entry["calc_perm"] for entry in file_rp.values("file", "calc_perm")
        }
        file_cases = [When(pk=fp, then=Value(perm)) for fp, perm in file_perm_dict.items()]
        qs = qs.annotate(
            effective_permission=Case(
                *file_cases,
                default=F("project_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [Bucket]:
        bucket_rp = RowProtection.objects.filter(target_group__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        bucket_rp = bucket_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("bucket")])
        )
        bucket_perm_dict = {
            entry["bucket"]: entry["calc_perm"] for entry in bucket_rp.values("bucket", "calc_perm")
        }
        bucket_cases = [
            When(bucket=bucket, then=Value(perm)) for bucket, perm in bucket_perm_dict.items()
        ]
        qs = qs.annotate(
            effective_permission=Case(
                *bucket_cases,  # not to be confused with basket_cases
                default=F("org_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [JobCluster]:
        jc_rp = RowProtection.objects.filter(target_group__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        jc_rp = jc_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("job_cluster")])
        )
        jc_perm_dict = {
            entry["jc"]: entry["calc_perm"] for entry in jc_rp.values("job_cluster", "calc_perm")
        }
        jc_cases = [When(job_cluster=jc, then=Value(perm)) for jc, perm in jc_perm_dict.items()]
        qs = qs.annotate(
            effective_permission=Case(
                *jc_cases,
                default=F("org_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [HostedTemplate]:
        ht_rp = RowProtection.objects.filter(target_group__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        ht_rp = ht_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("hosted_template")])
        )
        ht_perm_dict = {
            entry["jc"]: entry["calc_perm"]
            for entry in ht_rp.values("hosted_template", "calc_perm")
        }
        ht_cases = [When(job_cluster=jc, then=Value(perm)) for ht, perm in ht_perm_dict.items()]
        qs = qs.annotate(
            effective_permission=Case(
                *ht_cases,
                default=F("org_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [Algorithm]:
        algo_rp = RowProtection.objects.filter(algorithm__pk__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        algo_rp = algo_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("algorithm")])
        )
        algo_perm_dict = {
            entry["algorithm"]: entry["calc_perm"]
            for entry in algo_rp.values("algorithm", "calc_perm")
        }
        algo_cases = [When(pk=algo, then=Value(perm)) for algo, perm in algo_perm_dict.items()]
        qs = qs.annotate(
            effective_permission=Case(
                *algo_cases,
                default=F("project_permission"),
                output_field=BigIntegerField(),
            ),
        )
        logger.info(f"GOT HERE = {qs.query}")
    elif model in [Version]:
        version_rp = RowProtection.objects.filter(version__pk__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        version_rp = version_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("version")])
        )
        version_perm_dict = {
            entry["version"]: entry["calc_perm"]
            for entry in version_rp.values("version", "calc_perm")
        }

        version_cases = [
            When(pk=version, then=Value(perm)) for version, perm in version_perm_dict.items()
        ]
        qs = qs.annotate(
            effective_permission=Case(
                *version_cases,
                default=F("project_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [Section]:
        # These models are protected by individual and project-level permissions
        # Section-level permissions inherit from parent sections
        # Make the appropriate subquery for individual protection, then coalesce with
        # project-level permissions

        # First get all sections including parents (this includes self)
        section_rp = RowProtection.objects.filter(section__pk__in=qs.values("pk")).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        section_rp = section_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("section")])
        )
        section_perm_dict = {
            entry["section"]: entry["calc_perm"]
            for entry in section_rp.values("section", "calc_perm")
        }
        section_cases = [
            When(pk=section, then=Value(perm)) for section, perm in section_perm_dict.items()
        ]
        qs = qs.annotate(
            effective_permission=Case(
                *section_cases,
                default=F("project_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [Media]:
        # For these models, we can use the section+project to determine permissions
        #
        effected_sections = qs.values("primary_section__pk")

        section_rp = RowProtection.objects.filter(section__in=effected_sections).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        section_rp = section_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("section")])
        )
        section_perm_dict = {
            entry["section"]: (entry["calc_perm"] >> PermissionMask.CHILD_SHIFT)
            for entry in section_rp.values("section", "calc_perm")
        }
        section_cases = [
            When(section=section, then=Value(perm)) for section, perm in section_perm_dict.items()
        ]
        qs = qs.annotate(
            effective_permission=Case(
                *section_cases,
                default=F("project_permission"),
                output_field=BigIntegerField(),
            ),
        )
    elif model in [Localization, State]:
        # For these models, we can use the section+version+project to determine permissions
        #

        if model == Localization:
            qs = qs.annotate(section=F("media__primary_section__pk"))
        elif model == State:
            sb = Subquery(
                Media.objects.filter(state__pk=OuterRef("pk")).values("primary_section__pk")[:1]
            )
            qs = qs.annotate(section=sb)

        # Calculate a dictionary for permissions by section and version in this set
        effected_media = qs.values("media__pk")
        effected_sections = (
            Section.objects.filter(project=project, media__in=effected_media)
            .values("pk")
            .distinct()
        )
        effected_versions = qs.values("version__pk")

        section_rp = RowProtection.objects.filter(section__in=effected_sections).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        section_rp = section_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("section")])
        )
        version_rp = RowProtection.objects.filter(version__in=effected_versions).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        version_rp = version_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("version")])
        )

        section_perm_dict = {
            entry["section"]: (entry["calc_perm"] >> (PermissionMask.CHILD_SHIFT * 2))
            for entry in section_rp.values("section", "calc_perm")
        }
        version_perm_dict = {
            entry["version"]: (entry["calc_perm"] >> PermissionMask.CHILD_SHIFT)
            for entry in version_rp.values("version", "calc_perm")
        }

        section_cases = [
            When(section=section, then=Value(perm)) for section, perm in section_perm_dict.items()
        ]
        version_cases = [
            When(version=version, then=Value(perm)) for version, perm in version_perm_dict.items()
        ]

        combo_cases = []
        for section, section_perm in section_perm_dict.items():
            for version, version_perm in version_perm_dict.items():
                combined_perm = section_perm & version_perm
                combo_cases.append(
                    When(
                        section=section,
                        version=version,
                        then=Value(combined_perm),
                    )
                )

        # Annotate on the final permission for each row
        qs = qs.annotate(
            effective_permission=Case(
                *combo_cases,  # Match intersections first
                *section_cases,  # Then sections
                *version_cases,  # Then versions
                default=F("project_permission"),
                output_field=BigIntegerField(),
            ),
        )
    else:
        assert False, f"Unhandled model {model}"

    return qs
