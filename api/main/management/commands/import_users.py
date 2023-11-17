import datetime
import logging
import csv

from django.core.management.base import BaseCommand
from main.models import User
from main.models import Affiliation
from main.models import Membership
from main.models import Organization

logger = logging.getLogger(__name__)

def _get(d, key):
    for k, v in d.items():
        if k.lower().replace(' ', '_') == key:
            return v
    return None

def _get_name(row):
    first_name = _get(row, "first_name")
    last_name = _get(row, "last_name")
    if first_name is None or last_name is None:
        name = _get(row, "name")
        if name is None:
            raise ValueError(f"Could not find a name column for user with email {user['email']}!")
        parts = name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""
    return (first_name, last_name)

def _get_username(row, first_name, last_name):
    username = _get(row, "username")
    if username is None:
        username = first_name            
        if User.objects.filter(username=username).exists():
            username = first_name[0] + last_name
            increment = None
            while True:
                inc_str = "" if increment is None else str(increment)
                check = username + increment
                if User.objects.filter(username=check).exists():
                    increment = 1 if increment is None else increment + 1
                else:
                    username = check
                    break
    return username

def _find_users(options, data):
    emails = [_get(row, "email") for row in data]
    users = list(User.objects.filter(email__in=emails))
    existing = {user.email:user for user in users}
    new = []
    for user in data:
        email = _get(user, "email")
        if email in existing:
            continue
        first_name, last_name = _get_name(user)
        username = _get_username(user, first_name, last_name)
        obj = User(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            is_active=True,
        )
        new.append(obj)
    return existing, new

def _find_affiliations(options, existing, new):
    total_users = len(existing) + len(new)
    organization = options["organization"]
    existing_ids = [user.id for user in existing.values()]
    existing_affiliations = list(Affiliation.objects.filter(organization=organization, user__in=existing_ids))
    num_new = total_users - len(existing_affiliations)
    return existing_affiliations, num_new

def _find_memberships(options, existing, new):
    total_users = len(existing) + len(new)
    projects = options["projects"]
    existing_memberships = []
    num_new = 0
    if projects is not None:
        existing_ids = [user.id for user in existing.values()]
        existing_memberships = list(Membership.objects.filter(project__in=projects, user__in=existing_ids))
        num_new = total_users * len(projects) - len(existing_memberships)
    return existing_memberships, num_new

class Command(BaseCommand):
    help = (
        "Create users from a CSV, optionally adding them to organizations or projects."
    )

    def add_arguments(self, parser):
        parser.add_argument("--csv", type=str, required=True, help="Path to csv file. Columns may include first name, last name, name, email, username, and password. For names, first name and last name is searched first. If it does not exist, the name column is used and the first space is used to split first and last name. Email is required and is used for idempotency, so they must be unique. If username is not specified, usernames are created using first name (lowercase), unless that user already exists in which case first initial and last name is used. If that exists a number is appended. If password is not specified, random passwords are generated unless the `--password` parameter is supplied, in which case the same password is used for all users.")
        parser.add_argument(
            "--organization",
            type=int,
            required=True,
            help="Organization ID. Users will be created under this organization. They will be assigned the Member role.",
        )
        parser.add_argument(
            "--password",
            type=str,
            help="Password to be used for all new users. Required if CSV does not contain a password column.",
        )
        parser.add_argument(
            "--projects",
            type=int,
            nargs="+",
            help="Optional list of project IDs. If given, memberships will be created for the users specified in the CSV and the projects.",
        )
        parser.add_argument(
            "--project_permission",
            type=str,
            default="r",
            help="Permission level granted to user memberships. `n` = no access, `r` = view only, `w` = can edit, `t` = can transfer, `x` = can execute, `a` = full control. Default is `r` (view only).",
        )

    def handle(self, **options):
        with open(options["csv"], "r") as f:
            reader = csv.DictReader(f)
            data = [row for row in reader]
        existing, new = _find_users(options, data)
        existing_affiliations, num_affiliations = _find_affiliations(options, existing, new)
        existing_memberships, num_memberships = _find_memberships(options, existing, new)
        print(f"Create {len(new)} new users ({len(existing)} already exist)")
        print(f"Create {num_affiliations} new affiliations ({len(existing_affiliations)} already exist)")
        print(f"Create {num_memberships} new memberships ({len(existing_memberships)} already exist)")
        proceed = input("Continue? [y/N]: ")
        if proceed.lower().strip() == 'y':
            pass

        
