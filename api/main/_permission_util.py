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

CHILD_SHIFT = 8


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
    elif source_model in [Section]:
        shift = 1
    elif source_model in [Version]:
        shift = 2
    else:
        assert False, f"Unhandled source_model {source_model}"

    if model in [
        Dashboard,
        Favorite,
        Bookmark,
        TemporaryFile,
        ChangeLog,
        Announcement,
    ]:
        return CHILD_SHIFT * (4 - shift)
    elif model in [Localization, State, Group]:
        return CHILD_SHIFT * (3 - shift)
    elif model in [Media]:
        return CHILD_SHIFT * (2 - shift)
    elif model in [
        Section,
        Version,
        Algorithm,
        File,
        Bucket,
        JobCluster,
        Affiliation,
        Invitation,
        HostedTemplate,
    ]:
        return CHILD_SHIFT * (1 - shift)
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
        if not model in [
            Project,
            Organization,
            Group,
            JobCluster,
            Bucket,
            HostedTemplate,
            Affiliation,
            Invitation,
        ]:
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
        elif model in [Group, JobCluster, Bucket, HostedTemplate, Affiliation, Invitation]:
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
                >> shift_permission(model, Organization)
                for entry in org_rp.values("target_organization", "calc_perm")
            }
            org_cases = [
                When(organization=target_org, then=Value(perm))
                for target_org, perm in org_perm_dict.items()
            ]
            qs = qs.annotate(
                org_permission=Case(*org_cases, default=Value(0), output_field=BigIntegerField())
            )
        elif model in [Project, Organization]:
            pass  # Project/ Organization permissions are handled below (for self)
        else:
            # This will make for clearer error messages if we don't have a model handled correctly (unlikely)
            assert False, f"Unhandled model {model} (no permission logic for org/project)"
    else:
        # If an object doesn't exist, we can't annotate it
        return qs.annotate(effective_permission=Value(0))

    if qs.query.low_mark != 0 or qs.query.high_mark is not None:
        # This is a slice, we need to get the full queryset to annotate + filter
        new_qs = model.objects.filter(pk__in=qs.values("pk"))
        new_qs = new_qs.alias(
            project_permission=Value(project_permission >> bit_shift),
        )
        if qs.exists():
            if hasattr(qs[0], "incident"):
                incident_cases_dict = {
                    entry["pk"]: entry["incident"] for entry in qs.values("pk", "incident")
                }
                incident_cases = [
                    When(pk=pk, then=Value(incident))
                    for pk, incident in incident_cases_dict.items()
                ]
                new_qs = new_qs.annotate(
                    incident=Case(*incident_cases, default=Value(None), output_field=IntegerField())
                )

        qs = new_qs

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
        TemporaryFile,
        ChangeLog,
        Leaf,
    ]:
        qs = qs.annotate(effective_permission=F("project_permission"))
    elif model in [Membership]:
        qs = qs.annotate(
            effective_permission=F("project_permission")
        )  # match project-level permissions (for now)
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
    elif model in [Affiliation, Invitation]:
        # Affiliations don't have per-row control, they are all scoped to the organization permission shifted
        qs = qs.annotate(effective_permission=F("org_permission"))
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
            entry["job_cluster"]: entry["calc_perm"]
            for entry in jc_rp.values("job_cluster", "calc_perm")
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

        section_qs = Section.objects.filter(pk__in=effected_sections)
        section_qs = augment_permission(user, section_qs)

        section_perm_dict = {
            entry["pk"]: (entry["effective_permission"] >> CHILD_SHIFT)
            for entry in section_qs.values("pk", "effective_permission")
        }
        section_cases = [
            When(primary_section=section, then=Value(perm))
            for section, perm in section_perm_dict.items()
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
            Section.objects.filter(project=project, pk__in=qs.values("section"))
            .values("pk")
            .distinct()
        )
        effected_versions = qs.values("version__pk")

        # Calculate augmented permission which accounts for usage of default
        # permission at either the section or version level (e.g. no RP)
        section_qs = Section.objects.filter(pk__in=effected_sections)
        section_qs = augment_permission(user, section_qs)
        version_qs = Version.objects.filter(pk__in=effected_versions)
        version_qs = augment_permission(user, version_qs)

        # Make dicts and account for child shift of each type
        # Versions direct child is metadata, but for sections is 2 shifts
        section_perm_dict = {
            entry["pk"]: (entry["effective_permission"] >> (CHILD_SHIFT * 2))
            for entry in section_qs.values("pk", "effective_permission")
        }
        version_perm_dict = {
            entry["pk"]: (entry["effective_permission"] >> CHILD_SHIFT)
            for entry in version_qs.values("pk", "effective_permission")
        }

        # Based on the sections and versions create a case match for each permutation
        # in this resultset
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
                default=F("project_permission"),
                output_field=BigIntegerField(),
            ),
        )
    else:
        assert False, f"Unhandled model {model}"

    return qs


class PermissionMask:
    ## These bits are repeated so the left-byte is for children objects. This allows
    ## a higher object to store the default permission for children objects by bitshifting by the
    ## level of abstraction.
    ## [0:7] Self-level objects (projects, algos, versions)
    ## [8:15] Children objects (project -> section* -> media -> metadata)
    ## [16:23] Grandchildren objects (project -> section -> media* -> metadata)
    ## [24:31] Great-grandchildren objects (project -> section -> media -> metadata*)
    ## If a permission points to a child object, that occupies [0:7]
    ## Permission objects exist against either projects, algos, versions or sections

    EXIST = 0x1  # Allows a row to be seen in a list, or individual GET
    READ = 0x2  # Allows a references to be accessed, e.g. generate presigned URLs
    CREATE = 0x4  # Allows a row to be created (e.g. POST)
    MODIFY = 0x8  # Allows a row to be PATCHED (but not in-place, includes variant delete)
    DELETE = 0x10  # Allows a row to be deleted (pruned for metadata)
    EXECUTE = 0x20  # Allows an algorithm to be executed (applies to project-level or algorithm)
    UPLOAD = 0x40  # Allows media to be uploaded
    ACL = 0x80  # Allows ACL modification for a row, if not a creator
    FULL_CONTROL = 0xFF  # All bits and all future bits are set
    # Convenience wrappers to original tator permission system
    OLD_READ = (
        EXIST
        | READ
        | EXIST << 8
        | READ << 8
        | EXIST << 16
        | READ << 16
        | EXIST << 24
        | READ << 24
        | EXIST << 32
        | READ << 32
    )

    # Old write was a bit more complicated as it let you modify elements but not the project itself
    OLD_WRITE = (
        OLD_READ
        | CREATE << 8
        | MODIFY << 8
        | DELETE << 8
        | CREATE << 16
        | MODIFY << 16
        | DELETE << 16
        | CREATE << 24
        | MODIFY << 24
        | DELETE << 24
        | MODIFY << 32
        | DELETE << 32
        | CREATE << 32
    )
    OLD_TRANSFER = OLD_WRITE | UPLOAD << 16

    OLD_EXECUTE = OLD_TRANSFER | EXECUTE | EXECUTE << 32 | EXECUTE << 8

    # Old full control lets one delete and write the project (plus you need all bits set in lower byte)
    OLD_FULL_CONTROL = (
        OLD_EXECUTE | CREATE | MODIFY | DELETE | 0xFF | ACL << 8 | ACL << 16 | ACL << 24
    )

    # This lets a user see and modify an organization, job cluster details, etc.
    OLD_AFFL_ADMIN = (
        (EXIST | READ | MODIFY | CREATE | DELETE | ACL) << shift_permission(Group, Organization)
        | (EXIST | READ | CREATE | MODIFY | DELETE | ACL)
        << shift_permission(JobCluster, Organization)
        | (FULL_CONTROL)
    )
    # This lets users see a organization, see the existance of, but not configuration of job clusters and make groups
    OLD_AFFL_USER = (
        (EXIST | READ | CREATE | MODIFY | DELETE) << shift_permission(Group, Organization)
        | (EXIST) << shift_permission(JobCluster, Organization)
        | (READ | EXIST)
    )

    # This level lets a user make sections they have full control over and eventually media upload priv
    # If bit 16 was 0, they could make sections, but ultimately not media due to project-level restriction (AND bitwise logic)
    CAN_MAKE_MEDIA_AND_SECTIONS = (CREATE | UPLOAD) << 16 | (CREATE) << 8 | (EXIST | READ | UPLOAD)


# Utility function for checking bucket permissions against a user
def check_bucket_permissions(user, bucket):
    """raises an exception if user doesn't have access to work with the bucket"""
    if os.getenv("TATOR_FINE_GRAIN_PERMISSION"):
        bucket_aug = augment_permission(user, bucket)
        if bucket_aug[0].effective_permission < 0x1:
            raise ValueError(f"User {user.pk} does not have permission to bucket {bucket.pk}!")
    else:
        org = bucket.first().organization
        affls = user.affiliation_set.filter(organization=org)
        if not affls.exists():
            raise ValueError(f"User {user.pk} does not have permission to bucket {bucket.pk}!")
