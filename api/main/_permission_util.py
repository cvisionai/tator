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
from django.contrib.postgres.aggregates import BitOr
from django.db.models.functions import Coalesce, Cast


class ColBitwiseOr(Func):
    function = "|"
    template = "%(expressions)s"


class ColBitwiseAnd(Func):
    function = "&"
    template = "%(expressions)s"


@BigIntegerField.register_lookup
class BitwiseAnd(Lookup):
    lookup_name = "bitand"

    def as_sql(self, compiler, connection):
        lhs, lhs_params = self.process_lhs(compiler, connection)
        rhs, rhs_params = self.process_rhs(compiler, connection)
        params = lhs_params + rhs_params
        return "%s & %s" % (lhs, rhs), params


def augment_permission(user, qs):
    # Add effective_permission to the queryset
    if qs.exists():
        model = qs.model
        groups = user.groupmembership_set.all().values("group").distinct()
        # groups = Group.objects.filter(pk=-1).values("id")
        organizations = user.affiliation_set.all().values("organization")
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
            project_permission = (
                project_permission_query["computed_permission"] >> RowProtection.BITS.CHILD_SHIFT
                & 0xFF
            )
        else:
            project_permission = 0

        qs = qs.alias(
            project_permission=Value(project_permission),
        )
    else:
        return qs

    # continue on based on type of model where each is handled a little differently
    if model in [File]:
        # These models are only protected by project-level permissions
        qs = qs.annotate(effective_permission=F("project_permission"))
    if model in [Algorithm]:
        pass
    if model in [Section]:
        # These models are protected by individual and project-level permissions
        # Section-level permissions inherit from parent sections
        # Make the appropriate subquery for individual protection, then coalesce with
        # project-level permissions
        nested_subquery = Section.objects.filter(path__ancestors=OuterRef("path"))
        # section_rp = RowProtection.objects.filter(section__in=).filter(
        #    Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        # )
    elif model in [Media]:
        # For these models, we can use the section+project to determine permissions
        #
        effected_sections = (
            Section.objects.filter(project=project, media__in=effected_media)
            .values("pk")
            .distinct()
        )
        effected_versions = qs.values("version__pk").distinct()

        section_rp = RowProtection.objects.filter(section__in=effected_sections).filter(
            Q(user=user) | Q(group__in=groups) | Q(organization__in=organizations)
        )
        section_rp = section_rp.annotate(
            calc_perm=Window(expression=BitOr(F("permission")), partition_by=[F("section")])
        )
        section_perm_dict = {
            entry["section"]: (entry["calc_perm"] >> RowProtection.BITS.CHILD_SHIFT) & 0xFF
            for entry in section_rp.values("section", "calc_perm")
        }
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
        effected_media = qs.values("media__pk").distinct()
        effected_sections = (
            Section.objects.filter(project=project, media__in=effected_media)
            .values("pk")
            .distinct()
        )
        effected_versions = qs.values("version__pk").distinct()

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
            entry["section"]: (entry["calc_perm"] >> RowProtection.BITS.CHILD_SHIFT) & 0xFF
            for entry in section_rp.values("section", "calc_perm")
        }
        version_perm_dict = {
            entry["version"]: (entry["calc_perm"] >> RowProtection.BITS.CHILD_SHIFT) & 0xFF
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
                combined_perm = (
                    (section_perm & version_perm) >> RowProtection.BITS.CHILD_SHIFT
                ) & 0xFF
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

    return qs
