import os
import json
import random
import datetime
import logging
import string
import functools
import time
from uuid import uuid1, uuid4
from math import sin, cos, sqrt, atan2, radians
import re
import requests
import io
import base64
import unittest

from main.models import *

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.base import ContentFile
from django.contrib.gis.geos import Point
from rest_framework import status
from rest_framework.test import APITestCase, APITransactionTestCase
from dateutil.parser import parse as dateutil_parse
from botocore.errorfactory import ClientError
from main.throttles import BurstableThrottle

from .backup import TatorBackupManager
from .models import *
from .search import TatorSearch, ALLOWED_MUTATIONS
from .store import get_tator_store, PATH_KEYS
from .util import update_queryset_archive_state, memberships_to_rowp

from django.db import transaction

logger = logging.getLogger(__name__)

TEST_IMAGE = (
    "https://www.cvisionai.com/static/b91b90512c92c96884afd035c2d9c81a/f2464/tator-cloud.png"
)


class TatorTransactionTest(APITransactionTestCase):
    """Handle cases when test runner flushes DB and indices are still being made."""

    def setUp(self):
        # Need to do this for first test in a test db instance
        with connection.cursor() as cursor:
            create_prepared_statements(cursor)

    def _fixture_teardown(self):
        for x in range(30):
            try:
                super()._fixture_teardown()
                break
            except:
                print("Flush failed, sleep, and try again.")
                time.sleep(1)


def wait_for_indices(entity_type):
    entity_type.refresh_from_db()
    attr_indices = [x for x in entity_type.attribute_types if x["dtype"] != "blob"]
    built_ins = BUILT_IN_INDICES.get(type(entity_type), [])
    types_to_scan = [*attr_indices, *built_ins]
    # Wait for btree indices too
    for t in types_to_scan:
        if t["dtype"] == "string":
            new_obj = {**t}
            new_obj["dtype"] = "string_btree"
            types_to_scan.append(new_obj)
        if t["dtype"] == "native_string":
            new_obj = {**t}
            new_obj["dtype"] = "native_string_btree"
            types_to_scan.append(new_obj)
        if t["dtype"] == "upper_string":
            new_obj = {**t}
            new_obj["dtype"] = "upper_string_btree"
            types_to_scan.append(new_obj)
    for attribute in types_to_scan:
        found_it = False
        for i in range(1, 600):
            if TatorSearch().is_index_present(entity_type, attribute) == True:
                found_it = True
                break
            time.sleep(0.1 * min(i, 30))
        assert found_it


def assertResponse(self, response, expected_code):
    if response.status_code != expected_code:
        print(response.data)
    self.assertEqual(response.status_code, expected_code)


def create_test_user(is_staff=False, username=None):
    if username == None:
        username = "".join(random.choices(string.ascii_lowercase, k=10))
    return User.objects.create(
        username=username,
        password="jsnow",
        first_name="Jon",
        last_name="Snow",
        email="jon.snow@gmail.com",
        middle_initial="A",
        initials="JAS",
        is_staff=is_staff,
    )


def create_test_group(name):
    return Group.objects.create(
        name=name,
    )


def create_test_organization():
    return Organization.objects.create(
        name="my_org",
    )


def create_test_affiliation(user, organization):
    return Affiliation.objects.create(
        user=user,
        organization=organization,
        permission="Admin",
    )


def create_test_bucket(organization):
    return Bucket.objects.create(
        name=str(uuid1()),
        organization=organization,
        store_type="AWS",
        archive_sc="STANDARD",
        live_sc="STANDARD",
        config={
            "aws_access_key_id": "asdf",
            "aws_secret_access_key": "asdf",
            "endpoint_url": "https://asdf.com",
            "region_name": "us-east-2",
        },
    )


def create_test_project(user, organization=None, backup_bucket=None, bucket=None):
    kwargs = {
        "name": "asdf",
        "creator": user,
    }

    if organization:
        kwargs["organization"] = organization

    if backup_bucket:
        kwargs["backup_bucket"] = backup_bucket

    if bucket:
        kwargs["bucket"] = bucket

    return Project.objects.create(**kwargs)


def create_test_membership(user, project):
    return Membership.objects.create(
        user=user,
        project=project,
        permission=Permission.FULL_CONTROL,
    )


def create_test_algorithm(user, name, project):
    obj = Algorithm.objects.create(
        name=name,
        project=project,
        user=user,
        files_per_job=1,
        description="test description",
        categories=["categoryA", "categoryB"],
        parameters=[{"name": "param-name", "value": "param-dtype"}],
    )
    obj.manifest.save(
        name="asdf.yaml",
        content=ContentFile(
            """
apiVersion: argoproj.io/v1alpha1
kind: Workflow                  # new type of k8s spec
metadata:
  generateName: hello-world-    # name of the workflow spec
spec:
  entrypoint: whalesay          # invoke the whalesay template
  ttlSecondsAfterFinished: 30
  templates:
  - name: whalesay              # name of the template
    container:
      image: docker/whalesay
      command: [cowsay]
      args: ["hello world"]
      resources:                # limit the resources
        limits:
          memory: 32Mi
          cpu: 100m
""",
        ),
    )
    return obj


def create_test_section(name, project):
    return Section.objects.create(name=name, project=project)


def create_test_favorite(name, project, user, meta, entityTypeName):
    if entityTypeName == "Localization":
        return Favorite.objects.create(
            name=name,
            project=project,
            user=user,
            type=meta.id,
            localization_type=meta,
            values={},
            entity_type_name=entityTypeName,
        )

    elif entityTypeName == "State":
        return Favorite.objects.create(
            name=name,
            project=project,
            user=user,
            type=meta.id,
            state_type=meta,
            values={},
            entity_type_name=entityTypeName,
        )

    else:
        return None


def create_test_bookmark(name, project, user):
    return Bookmark.objects.create(name=name, project=project, user=user, uri="/projects")


def create_test_video(user, name, entity_type, project, attributes={}):
    return Media.objects.create(
        name=name,
        type=entity_type,
        project=project,
        md5="",
        num_frames=1,
        fps=30.0,
        codec="H264",
        width="640",
        height="480",
        created_by=user,
        elemental_id=str(uuid4()),
        attributes=attributes,
    )


def create_test_image(user, name, entity_type, project, attributes={}):
    return Media.objects.create(
        name=name,
        type=entity_type,
        project=project,
        md5="",
        width="640",
        height="480",
        attributes=attributes,
    )


def create_test_box(user, entity_type, project, media, frame, attributes={}, version=None):
    x = random.uniform(0.0, float(media.width))
    y = random.uniform(0.0, float(media.height))
    w = random.uniform(0.0, float(media.width) - x)
    h = random.uniform(0.0, float(media.height) - y)
    if version is None:
        version = project.version_set.all()[0]
    return Localization.objects.create(
        user=user,
        created_by=user,
        modified_by=user,
        type=entity_type,
        project=project,
        version=version,
        media=media,
        frame=frame,
        x=x,
        y=y,
        width=w,
        height=h,
        attributes=attributes,
    )


def make_box_obj(user, entity_type, project, media, frame, attributes={}):
    x = random.uniform(0.0, float(media.width))
    y = random.uniform(0.0, float(media.height))
    w = random.uniform(0.0, float(media.width) - x)
    h = random.uniform(0.0, float(media.height) - y)
    return Localization(
        user=user,
        created_by=user,
        modified_by=user,
        type=entity_type,
        project=project,
        version=project.version_set.all()[0],
        media=media,
        frame=frame,
        x=x,
        y=y,
        width=w,
        height=h,
        attributes=attributes,
    )


def create_test_box_with_attributes(user, entity_type, project, media, frame, attributes):
    test_box = create_test_box(user, entity_type, project, media, frame)
    test_box.attributes.update(attributes)
    test_box.save()
    return test_box


def create_test_line(user, entity_type, project, media, frame, attributes={}):
    x0 = random.uniform(0.0, float(media.width))
    y0 = random.uniform(0.0, float(media.height))
    x1 = random.uniform(0.0, float(media.width) - x0)
    y1 = random.uniform(0.0, float(media.height) - y0)
    return Localization.objects.create(
        user=user,
        created_by=user,
        modified_by=user,
        type=entity_type,
        project=project,
        version=project.version_set.all()[0],
        media=media,
        frame=frame,
        x=x0,
        y=y0,
        u=(x1 - x0),
        v=(y1 - y0),
        attributes=attributes,
    )


def create_test_dot(user, entity_type, project, media, frame, attributes={}):
    x = random.uniform(0.0, float(media.width))
    y = random.uniform(0.0, float(media.height))
    return Localization.objects.create(
        user=user,
        created_by=user,
        modified_by=user,
        type=entity_type,
        project=project,
        version=project.version_set.all()[0],
        media=media,
        frame=frame,
        x=x,
        y=y,
        attributes=attributes,
    )


def create_test_leaf(name, entity_type, project, attributes={}):
    return Leaf.objects.create(
        name=name,
        type=entity_type,
        project=project,
        path="".join(random.choices(string.ascii_lowercase, k=10)),
        attributes=attributes,
    )


def create_test_attribute_types():
    """Create one of each attribute type."""
    return [
        dict(
            name="Bool Test",
            dtype="bool",
            default=False,
        ),
        dict(
            name="Int Test",
            dtype="int",
            default=42,
            minimum=-10000,
            maximum=10000,
        ),
        dict(
            name="Float Test",
            dtype="float",
            default=42.0,
            minimum=-10000.0,
            maximum=10000.0,
        ),
        dict(
            name="Enum Test",
            dtype="enum",
            choices=["enum_val1", "enum_val2", "enum_val3", "enum_val4"],
            default="enum_val1",
        ),
        dict(
            name="String Test",
            dtype="string",
            default="asdf_default",
            style="long_string",
        ),
        dict(
            name="Datetime Test",
            dtype="datetime",
            use_current=True,
        ),
        dict(
            name="Geoposition Test",
            dtype="geopos",
            default=[-179.0, -89.0],
        ),
        dict(
            name="Special Characters are %&<>:;,()@",
            dtype="string",
            default="fun",
        ),
    ]


def create_test_version(name, description, number, project, media):
    return Version.objects.create(
        name=name,
        description=description,
        number=number,
        project=project,
    )


def create_test_file(name, entity_type, project, user):
    return File.objects.create(
        name=name, type=entity_type, project=project, created_by=user, modified_by=user
    )


def random_string(length):
    return "".join(random.choice(string.ascii_letters) for _ in range(length))


def random_datetime(start, end):
    """Generate a random datetime between `start` and `end`"""
    return start + datetime.timedelta(
        seconds=random.randint(0, int((end - start).total_seconds())),
    )


def random_latlon():
    return (random.uniform(-90.0, 90.0), random.uniform(-180.0, 180.0))


def latlon_distance(lat0, lon0, lat1, lon1):
    R = 6373.0  # Radius of earth in km
    rlat0 = radians(lat0)
    rlon0 = radians(lon0)
    rlat1 = radians(lat1)
    rlon1 = radians(lon1)
    dlon = rlon1 - rlon0
    dlat = rlat1 - rlat0
    a = sin(dlat / 2) ** 2 + cos(rlat0) * cos(rlat1) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    return distance


permission_levels = [
    Permission.VIEW_ONLY,
    Permission.CAN_EDIT,
    Permission.CAN_TRANSFER,
    Permission.CAN_EXECUTE,
    Permission.FULL_CONTROL,
]

affiliation_levels = [
    "Member",
    "Admin",
]


class AttributeRenameMixin:
    def test_attribute_rename(self):
        """Test that renaming an attribute works."""
        # Fetching existing values
        type_name = self.detail_uri + "Type"
        resp = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?type={self.entity_type.pk}"
        )
        values = [x["attributes"].get("Float Test") for x in resp.data]

        # Rename float test to something else the back again
        resp = self.client.patch(
            f"/rest/AttributeType/{self.entity_type.pk}",
            {
                "entity_type": type_name,
                "current_name": "Float Test",
                "attribute_type_update": {"name": "Float Test Renamed"},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?type={self.entity_type.pk}"
        )
        new_values = [x["attributes"].get("Float Test Renamed") for x in resp.data]
        for idx, val in enumerate(values):
            self.assertEqual(val, new_values[idx])

        # TODO: This could result in 400 if someone slams the UI, but it won't break
        # for test reliability, wait for all indices to complete prior to renaming back
        wait_for_indices(self.entity_type)
        # Rename back
        resp = self.client.patch(
            f"/rest/AttributeType/{self.entity_type.pk}",
            {
                "entity_type": type_name,
                "current_name": "Float Test Renamed",
                "attribute_type_update": {"name": "Float Test"},
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?type={self.entity_type.pk}"
        )
        new_values = [x["attributes"].get("Float Test") for x in resp.data]
        for idx, val in enumerate(values):
            self.assertEqual(val, new_values[idx])

        # A corner case of renaming when the attribute is not present in the data
        # to emulate this corner case we will add a new attribute to the data w/o a default
        # and then rename it
        # We then refetch the entities and ensure that the existing attributes are
        # unadulterated.
        resp = self.client.post(
            f"/rest/AttributeType/{self.entity_type.pk}",
            {
                "entity_type": type_name,
                "addition": {"name": "Attribute Not Present", "dtype": "float"},
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        wait_for_indices(self.entity_type)
        resp = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?type={self.entity_type.pk}"
        )

        # Check 2; attribute has no default set but it is registered
        new_values = [x["attributes"].get("Float Test") for x in resp.data]
        for idx, val in enumerate(values):
            self.assertEqual(val, new_values[idx])
            self.assertTrue("Attribute Not Present" not in resp.data[idx]["attributes"])

        resp = self.client.patch(
            f"/rest/AttributeType/{self.entity_type.pk}",
            {
                "entity_type": type_name,
                "current_name": "Attribute Not Present",
                "attribute_type_update": {"name": "BingoBango"},
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        wait_for_indices(self.entity_type)

        resp = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?type={self.entity_type.pk}"
        )

        # Check 3; attributes are not effected by renaming a non-existant attribute
        new_values = [x["attributes"].get("Float Test") for x in resp.data]
        for idx, val in enumerate(values):
            self.assertEqual(val, new_values[idx])
            self.assertTrue("Attribute Not Present" not in resp.data[idx]["attributes"])

        # Delete attribute and verify no records have changed
        resp = self.client.delete(
            f"/rest/AttributeType/{self.entity_type.pk}",
            {
                "entity_type": type_name,
                "name": "BingoBango",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        wait_for_indices(self.entity_type)

        resp = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?type={self.entity_type.pk}"
        )

        # Check 3; attributes are not effected by renaming a non-existant attribute
        new_values = [x["attributes"].get("Float Test") for x in resp.data]
        for idx, val in enumerate(values):
            self.assertEqual(val, new_values[idx])
            self.assertTrue("Attribute Not Present" not in resp.data[idx]["attributes"])


class ElementalIDChangeMixin:
    def test_elemental_id_create(self):
        endpoint = f"/rest/{self.list_uri}/{self.project.pk}"
        # Remove attribute values.
        if isinstance(self.create_json, dict):
            create_json = [{**self.create_json}]
            if "attributes" in create_json[0]:
                del create_json[0]["attributes"]
        else:
            temp_create_json = [{**obj} for obj in self.create_json]
            create_json = []
            for t in temp_create_json:
                if "attributes" in t:
                    del t["attributes"]
                create_json.append(t)

        # Post the json with a specified elemental_id value
        elemental_id = uuid4()
        create_json[0]["elemental_id"] = elemental_id
        response = self.client.post(endpoint, create_json, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        response = self.client.get(f"/rest/{self.detail_uri}/{response.data['id'][0]}")
        self.assertEqual(response.data["elemental_id"], elemental_id)

    def test_elemental_id_updates(self):
        list_endpoint = f"/rest/{self.list_uri}/{self.project.pk}"
        elemental_id = uuid4()

        for entity in self.entities:
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{entity.id}",
                {"elemental_id": elemental_id},
                format="json",
            )
            assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            list_endpoint, {"elemental_id": elemental_id, "show_all_marks": 1}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), len(self.entities))

        response = self.client.get(list_endpoint, format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        existing_count = len(response.data)
        new_elemental_id = uuid4()
        response = self.client.patch(
            list_endpoint, {"new_elemental_id": new_elemental_id}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            list_endpoint, {"elemental_id": new_elemental_id, "show_all_marks": 1}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), existing_count)

        for obj in response.data:
            self.assertEqual(obj["elemental_id"], new_elemental_id)


class EntityAuthorChangeMixin:
    def test_author_change(self):
        test_entity = self.entities[0]
        response = self.client.get(f"/rest/{self.detail_uri}/{test_entity.pk}")
        assert response.data["created_by"] == self.user.pk
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{test_entity.pk}",
            {"user_elemental_id": self.user_two.elemental_id},
            format="json",
        )
        assert response.status_code < 400
        response = self.client.get(f"/rest/{self.detail_uri}/{test_entity.pk}")
        assert response.data["created_by"] == self.user_two.pk

        new_json = {**self.create_json[0], **{"user_elemental_id": self.user_two.elemental_id}}

        response = self.client.post(
            f"/rest/{self.list_uri}/{self.project.pk}", [new_json], format="json"
        )
        new_id = response.data["id"][0]
        response = self.client.get(f"/rest/{self.detail_uri}/{new_id}")
        assert response.data["created_by"] == self.user_two.pk

        # test bulk patch authorship change (back to original)
        response = self.client.patch(
            f"/rest/{self.list_uri}/{self.project.pk}",
            {"ids": [new_id, test_entity.id], "user_elemental_id": self.user.elemental_id},
            format="json",
        )
        response = self.client.get(f"/rest/{self.detail_uri}/{new_id}")
        assert response.data["created_by"] == self.user.pk
        response = self.client.get(f"/rest/{self.detail_uri}/{test_entity.id}")
        assert response.data["created_by"] == self.user.pk


class DefaultCreateTestMixin:
    def _check_object(self, response, is_default):
        # Get the created objects.
        if isinstance(response.data["id"], list):
            id_ = response.data["id"][0]
        else:
            id_ = response.data["id"]
        # Assert it has all the expected values.
        obj = type(self.entities[0]).objects.get(pk=id_)
        for attr_type in self.entity_type.attribute_types:
            field = attr_type["name"]
            if is_default:
                if not attr_type["dtype"] == "datetime":
                    default = attr_type["default"]
                    self.assertTrue(obj.attributes[field] == default)
            else:
                if isinstance(self.create_json, dict):
                    self.assertTrue(obj.attributes[field] == self.create_json["attributes"][field])
                else:
                    for create_json in self.create_json:
                        self.assertTrue(
                            obj.attributes[field]
                            == create_json.get("attributes", {}).get(field, None)
                        )
        # Delete the object
        obj.delete()

    def test_create_default(self):
        endpoint = f"/rest/{self.list_uri}/{self.project.pk}"
        # Remove attribute values.
        if isinstance(self.create_json, dict):
            create_json = {**self.create_json}
            if "attributes" in create_json:
                del create_json["attributes"]
        else:
            temp_create_json = [{**obj} for obj in self.create_json]
            create_json = []
            for t in temp_create_json:
                if "attributes" in t:
                    del t["attributes"]
                create_json.append(t)

        # Post the json with no attribute values.
        response = self.client.post(endpoint, create_json, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        self._check_object(response, True)
        # Post the json with attribute values.
        response = self.client.post(endpoint, self.create_json, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        self._check_object(response, False)


class PermissionCreateTestMixin:
    def test_create_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            from main._permission_util import shift_permission

            rp = RowProtection.objects.get(project=self.project)
            orig_permission = rp.permission

            if self.list_uri == "Transcodes":
                model = Media
                required_permission = PermissionMask.UPLOAD
            else:

                # iterate over all permission levels and change the underlying row protection object for this project
                # to a given permission level and verify that the delete endpoint respects this
                model = type(self.entities[0])
                required_permission = PermissionMask.MODIFY
            for permission in [
                PermissionMask.OLD_READ,
                PermissionMask.OLD_WRITE,
                PermissionMask.OLD_TRANSFER,
                PermissionMask.OLD_EXECUTE,
                PermissionMask.OLD_FULL_CONTROL,
            ]:
                rp.permission = permission
                rp.save()
                if (
                    permission >> shift_permission(model, Project)
                ) & required_permission == required_permission:
                    expected_status = status.HTTP_201_CREATED
                else:
                    expected_status = status.HTTP_403_FORBIDDEN

                endpoint = f"/rest/{self.list_uri}/{self.project.pk}"
                response = self.client.post(endpoint, self.create_json, format="json")
                assertResponse(self, response, expected_status)
                if hasattr(self, "entities"):
                    obj_type = type(self.entities[0])
                if expected_status == status.HTTP_201_CREATED:
                    if "id" in response.data:
                        if isinstance(response.data["id"], list):
                            created_id = response.data["id"][0]
                        else:
                            created_id = response.data["id"]
                        response = self.client.delete(f"/rest/{self.detail_uri}/{created_id}")
                        assertResponse(self, response, status.HTTP_200_OK)
            self.membership.permission = Permission.FULL_CONTROL
            rp.permission = orig_permission
            rp.save()
        else:
            permission_index = permission_levels.index(self.edit_permission)
            for index, level in enumerate(permission_levels):
                self.membership.permission = level
                self.membership.save()
                if index >= permission_index:
                    expected_status = status.HTTP_201_CREATED
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                endpoint = f"/rest/{self.list_uri}/{self.project.pk}"
                response = self.client.post(endpoint, self.create_json, format="json")
                assertResponse(self, response, expected_status)
                if hasattr(self, "entities"):
                    obj_type = type(self.entities[0])
                if expected_status == status.HTTP_201_CREATED:
                    if "id" in response.data:
                        if isinstance(response.data["id"], list):
                            created_id = response.data["id"][0]
                        else:
                            created_id = response.data["id"]
                        response = self.client.delete(f"/rest/{self.detail_uri}/{created_id}")
                        assertResponse(self, response, status.HTTP_200_OK)
            self.membership.permission = Permission.FULL_CONTROL
            self.membership.save()


class PermissionListTestMixin:
    def test_list_patch_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            from main._permission_util import shift_permission

            rp = RowProtection.objects.get(project=self.project)
            orig_permission = rp.permission

            # iterate over all permission levels and change the underlying row protection object for this project
            # to a given permission level and verify that the delete endpoint respects this
            model = type(self.entities[0])
            for permission in [
                PermissionMask.OLD_READ,
                PermissionMask.OLD_WRITE,
                PermissionMask.OLD_TRANSFER,
                PermissionMask.OLD_EXECUTE,
                PermissionMask.OLD_FULL_CONTROL,
            ]:
                rp.permission = permission
                rp.save()
                test_val = random.random() > 0.5
                response = self.client.patch(
                    f"/rest/{self.list_uri}/{self.project.pk}" f"?type={self.entity_type.pk}",
                    {"attributes": {"Bool Test": test_val}},
                    format="json",
                )
                if (
                    permission >> shift_permission(model, Project)
                ) & PermissionMask.MODIFY == PermissionMask.MODIFY:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                assertResponse(self, response, expected_status)
            rp.permission = orig_permission
            rp.save()
        else:
            permission_index = permission_levels.index(self.edit_permission)
            for index, level in enumerate(permission_levels):
                self.membership.permission = level
                self.membership.save()
                if index >= permission_index:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                test_val = random.random() > 0.5
                response = self.client.patch(
                    f"/rest/{self.list_uri}/{self.project.pk}" f"?type={self.entity_type.pk}",
                    {"attributes": {"Bool Test": test_val}},
                    format="json",
                )
                assertResponse(self, response, expected_status)
            self.membership.permission = Permission.FULL_CONTROL
            self.membership.save()

    def test_list_delete_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            from main._permission_util import shift_permission

            rp = RowProtection.objects.get(project=self.project)
            orig_permission = rp.permission

            # iterate over all permission levels and change the underlying row protection object for this project
            # to a given permission level and verify that the delete endpoint respects this
            model = type(self.entities[0])
            for permission in [
                PermissionMask.OLD_READ,
                PermissionMask.OLD_WRITE,
                PermissionMask.OLD_TRANSFER,
                PermissionMask.OLD_EXECUTE,
                PermissionMask.OLD_FULL_CONTROL,
            ]:
                rp.permission = permission
                rp.save()
                response = self.client.delete(
                    f"/rest/{self.list_uri}/{self.project.pk}" f"?type={self.entity_type.pk}"
                )
                if (
                    permission >> shift_permission(model, Project)
                ) & PermissionMask.MODIFY == PermissionMask.MODIFY:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                assertResponse(self, response, expected_status)
            rp.permission = orig_permission
            rp.save()
        else:
            permission_index = permission_levels.index(self.edit_permission)
            for index, level in enumerate(permission_levels):
                self.membership.permission = level
                self.membership.save()
                if index >= permission_index:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                response = self.client.delete(
                    f"/rest/{self.list_uri}/{self.project.pk}" f"?type={self.entity_type.pk}"
                )
                assertResponse(self, response, expected_status)
            self.membership.permission = Permission.FULL_CONTROL
            self.membership.save()


class PermissionDetailTestMixin:
    def test_detail_patch_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            from main._permission_util import shift_permission

            rp = RowProtection.objects.get(project=self.project)
            orig_permission = rp.permission

            # iterate over all permission levels and change the underlying row protection object for this project
            # to a given permission level and verify that the delete endpoint respects this
            model = type(self.entities[0])
            for permission in [
                PermissionMask.OLD_READ,
                PermissionMask.OLD_WRITE,
                PermissionMask.OLD_TRANSFER,
                PermissionMask.OLD_EXECUTE,
                PermissionMask.OLD_FULL_CONTROL,
            ]:
                rp.permission = permission
                rp.save()
                if "name" in self.patch_json:
                    self.patch_json["name"] = f"foo_{hex(permission)}"
                response = self.client.patch(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", self.patch_json, format="json"
                )
                if (
                    permission >> shift_permission(model, Project)
                ) & PermissionMask.MODIFY == PermissionMask.MODIFY:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                assertResponse(self, response, expected_status)
            rp.permission = orig_permission
            rp.save()
        else:
            permission_index = permission_levels.index(self.edit_permission)
            for index, level in enumerate(permission_levels):
                self.membership.permission = level
                self.membership.save()
                if index >= permission_index:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                if "name" in self.patch_json:
                    self.patch_json["name"] += f"_{index}"
                response = self.client.patch(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", self.patch_json, format="json"
                )
                assertResponse(self, response, expected_status)
            self.membership.permission = Permission.FULL_CONTROL
            self.membership.save()

    def test_detail_delete_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            from main._permission_util import shift_permission

            rp = RowProtection.objects.get(project=self.project)
            orig_permission = rp.permission

            # iterate over all permission levels and change the underlying row protection object for this project
            # to a given permission level and verify that the delete endpoint respects this
            model = type(self.entities[0])
            for permission in [
                PermissionMask.OLD_READ,
                PermissionMask.OLD_WRITE,
                PermissionMask.OLD_TRANSFER,
                PermissionMask.OLD_EXECUTE,
                PermissionMask.OLD_FULL_CONTROL,
            ]:
                rp.permission = permission
                rp.save()
                response = self.client.delete(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", format="json"
                )
                if (
                    permission >> shift_permission(model, Project)
                ) & PermissionMask.DELETE == PermissionMask.DELETE:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                assertResponse(self, response, expected_status)
                # Delete it from the list if we actually deleted it
                if expected_status == status.HTTP_200_OK:
                    del self.entities[0]
            rp.permission = orig_permission
            rp.save()
        else:
            permission_index = permission_levels.index(self.edit_permission)
            for index, level in enumerate(permission_levels):
                self.membership.permission = level
                self.membership.save()
                if index >= permission_index:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                test_val = random.random() > 0.5
                response = self.client.delete(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", format="json"
                )
                assertResponse(self, response, expected_status)
                if expected_status == status.HTTP_200_OK:
                    del self.entities[0]
            self.membership.permission = Permission.FULL_CONTROL
            self.membership.save()


class PermissionListMembershipTestMixin:
    def test_list_not_a_member_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            rp = RowProtection.objects.get(project=self.project)
            rp.delete()
        self.membership.delete()
        url = f"/rest/{self.list_uri}/{self.project.pk}"
        if hasattr(self, "entity_type"):
            url += f"?type={self.entity_type.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        self.membership.save()
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_list_is_a_member_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            rp = RowProtection.objects.get(project=self.project)
            old_perm = rp.permission
            rp.permission = PermissionMask.OLD_READ
            rp.save()

        self.membership.permission = Permission.VIEW_ONLY
        self.membership.save()
        url = f"/rest/{self.list_uri}/{self.project.pk}"
        if hasattr(self, "entity_type"):
            url += f"?type={self.entity_type.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_200_OK)
        self.membership.permission = Permission.FULL_CONTROL
        self.membership.save()
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            rp.permission = old_perm
            rp.save()


class PermissionDetailMembershipTestMixin:
    def test_detail_not_a_member_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            rp = RowProtection.objects.get(project=self.project)
            rp.delete()
        self.membership.delete()
        url = f"/rest/{self.detail_uri}/{self.entities[0].pk}"
        if hasattr(self, "entity_type"):
            url += f"?type={self.entity_type.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        self.membership.save()
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            rp.save()

    def test_detail_is_a_member_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            rp = RowProtection.objects.get(project=self.project)
            old_perm = rp.permission
            rp.permission = PermissionMask.OLD_READ
            rp.save()
        self.membership.permission = Permission.VIEW_ONLY
        self.membership.save()
        url = f"/rest/{self.detail_uri}/{self.entities[0].pk}"
        if hasattr(self, "entity_type"):
            url += f"?type={self.entity_type.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_200_OK)
        self.membership.permission = Permission.FULL_CONTROL
        self.membership.save()
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            rp.permission = old_perm
            rp.save()


class PermissionListAffiliationTestMixin:
    def test_list_not_a_member_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        affiliation.delete()
        url = f"/rest/{self.list_uri}/{self.organization.pk}"
        if hasattr(self, "entity_type"):
            url += f"?type={self.entity_type.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.save()

    def test_list_is_a_member_permissions(self):
        for index, level in enumerate(affiliation_levels):
            affiliation = self.get_affiliation(self.organization, self.user)
            affiliation.permission = level
            affiliation.save()
            if self.get_requires_admin and not (level == "Admin"):
                expected_status = status.HTTP_403_FORBIDDEN
            else:
                expected_status = status.HTTP_200_OK
            url = f"/rest/{self.list_uri}/{self.organization.pk}"
            if hasattr(self, "entity_type"):
                url += f"?type={self.entity_type.pk}"
            response = self.client.get(url)
            assertResponse(self, response, expected_status)
        affiliation.permission = "Admin"
        affiliation.save()


class PermissionDetailAffiliationTestMixin:
    def test_detail_not_a_member_permissions(self):
        affiliation = self.get_affiliation(self.get_organization(), self.user)
        affiliation.delete()
        url = f"/rest/{self.detail_uri}/{self.entities[0].pk}"
        if hasattr(self, "entity_type"):
            url += f"?type={self.entity_type.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.save()

    def test_detail_is_a_member_permissions(self):
        for index, level in enumerate(affiliation_levels):
            affiliation = self.get_affiliation(self.get_organization(), self.user)
            affiliation.permission = level
            affiliation.save()
            if self.get_requires_admin and not (level == "Admin"):
                expected_status = status.HTTP_403_FORBIDDEN
            else:
                expected_status = status.HTTP_200_OK
            url = f"/rest/{self.detail_uri}/{self.entities[0].pk}"
            if hasattr(self, "entity_type"):
                url += f"?type={self.entity_type.pk}"
            response = self.client.get(url)
            assertResponse(self, response, expected_status)
        affiliation.permission = "Admin"
        affiliation.save()

    def test_detail_patch_permissions(self):
        permission_index = affiliation_levels.index(self.edit_permission)
        for index, level in enumerate(affiliation_levels):
            obj = Affiliation.objects.filter(organization=self.get_organization(), user=self.user)[
                0
            ]
            obj.permission = level
            obj.save()
            del obj
            if index >= permission_index:
                expected_status = status.HTTP_200_OK
            else:
                expected_status = status.HTTP_403_FORBIDDEN
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{self.entities[0].pk}", self.patch_json, format="json"
            )
            assertResponse(self, response, expected_status)

    def test_detail_delete_permissions(self):
        permission_index = affiliation_levels.index(self.edit_permission)
        for index, level in enumerate(affiliation_levels):
            obj = Affiliation.objects.filter(organization=self.get_organization(), user=self.user)[
                0
            ]
            obj.permission = level
            obj.save()
            del obj
            if index >= permission_index:
                expected_status = status.HTTP_200_OK
            else:
                expected_status = status.HTTP_403_FORBIDDEN
            test_val = random.random() > 0.5
            response = self.client.delete(
                f"/rest/{self.detail_uri}/{self.entities[0].pk}", format="json"
            )
            assertResponse(self, response, expected_status)
            if expected_status == status.HTTP_200_OK:
                del self.entities[0]


class AttributeMediaTestMixin:
    def test_media_with_attr(self):
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?media_id={self.media_entities[0].pk}"
            f"&type={self.entity_type.pk}&attribute=Bool Test::true"
        )
        assertResponse(self, response, status.HTTP_200_OK)


class AttributeTestMixin:
    def test_query_no_attributes(self):
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?type={self.entity_type.pk}&format=json"
        )
        self.assertEqual(len(response.data), len(self.entities))
        this_ids = [e.pk for e in self.entities]
        rest_ids = [e["id"] for e in response.data]
        for this_id, rest_id in zip(sorted(this_ids), sorted(rest_ids)):
            self.assertEqual(this_id, rest_id)

    def test_multiple_attribute(self):
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?type={self.entity_type.pk}&attribute=Bool Test::true&attribute=Int Test::0"
        )
        assertResponse(self, response, status.HTTP_200_OK)

    def test_pagination(self):
        test_vals = [random.random() > 0.5 for _ in range(len(self.entities))]
        for idx, test_val in enumerate(test_vals):
            pk = self.entities[idx].pk
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{pk}",
                {"attributes": {"Bool Test": test_val}},
                format="json",
            )
            assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?format=json"
            f"&attribute=Bool Test::true"
            f"&type={self.entity_type.pk}"
            f"&start=0"
            f"&stop=2"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), max(0, min(sum(test_vals), 2)))
        response1 = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?format=json"
            f"&attribute=Bool Test::true"
            f"&type={self.entity_type.pk}"
            f"&start=1"
            f"&stop=4"
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response1.data), max(0, min(sum(test_vals) - 1, 3)))
        if len(response.data) >= 2 and len(response1.data) >= 1:
            self.assertEqual(response.data[1], response1.data[0])

    def test_sorting(self):
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?format=json"
            f"&type={self.entity_type.pk}"
        )
        last_id = response.data[0]["id"]
        for r in response.data[1:]:
            assert r["id"] > last_id
            last_id = r["id"]

        # sort by descending id
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?format=json"
            f"&type={self.entity_type.pk}"
            f"&sort_by=-$id"
        )
        last_id = response.data[0]["id"]
        for r in response.data[1:]:
            assert r["id"] < last_id
            last_id = r["id"]

        # sort by an attribute
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?format=json"
            f"&type={self.entity_type.pk}"
            f"&sort_by=Float Test"
        )

        last_val = response.data[0]["attributes"]["Float Test"]
        for r in response.data[1:]:
            assert r["attributes"]["Float Test"] >= last_val
            last_val = r["attributes"]["Float Test"]

        # sort by an attribute descending
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?format=json"
            f"&type={self.entity_type.pk}"
            f"&sort_by=-Float Test"
        )
        last_val = response.data[0]["attributes"]["Float Test"]
        for r in response.data[1:]:
            assert r["attributes"]["Float Test"] <= last_val
            last_val = r["attributes"]["Float Test"]

    def test_list_patch(self):
        test_val = random.random() > 0.5
        response = self.client.patch(
            f"/rest/{self.list_uri}/{self.project.pk}" f"?type={self.entity_type.pk}",
            {"attributes": {"Bool Test": test_val}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_200_OK)
        for entity in self.entities:
            if hasattr(entity, "mark") and hasattr(entity, "elemental_id"):
                response = self.client.get(
                    f"/rest/{self.detail_uri}/{entity.version.pk}/{entity.elemental_id}"
                )
            else:
                response = self.client.get(f"/rest/{self.detail_uri}/{entity.pk}")
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(response.data["attributes"]["Bool Test"], test_val)

    def test_list_delete(self):
        test_val = random.random() > 0.5
        to_delete = [self.create_entity() for _ in range(5)]
        obj_ids = list(map(lambda x: str(x.pk), to_delete))
        for obj_id in obj_ids:
            response = self.client.get(f"/rest/{self.detail_uri}/{obj_id}")
            assertResponse(self, response, status.HTTP_200_OK)
            # Update objects with a string so we know which to delete
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{obj_id}",
                {"in_place": 1, "attributes": {"String Test": "DELETE ME!!!"}},
                format="json",
            )

        response = self.client.delete(
            f"/rest/{self.list_uri}/{self.project.pk}"
            f"?type={self.entity_type.pk}"
            f"&attribute=String Test::DELETE ME!!!",
            {"prune": 1},
            format="json",
        )
        assertResponse(self, response, status.HTTP_200_OK)
        for obj_id in obj_ids:
            response = self.client.get(f"/rest/{self.detail_uri}/{obj_id}")
            assertResponse(self, response, status.HTTP_404_NOT_FOUND)
        for entity in self.entities:
            response = self.client.get(f"/rest/{self.detail_uri}/{entity.pk}")
            assertResponse(self, response, status.HTTP_200_OK)

    def test_null_attr(self):
        test_vals = [random.random() > 0.5 for _ in range(len(self.entities))]
        for idx, test_val in enumerate(test_vals):
            pk = self.entities[idx].pk
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{pk}",
                {"attributes": {"Bool Test": test_val}},
                format="json",
            )
            assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_null=Bool Test::false"
            f"&type={self.entity_type.pk}",  # needed for localizations
            format="json",
        )
        self.assertEqual(len(response.data), len(self.entities))
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_null=Bool Test::true"
            f"&type={self.entity_type.pk}",  # needed for localizations
            format="json",
        )
        self.assertEqual(len(response.data), 0)

        # Nullify all the Bool Tests
        for idx, test_val in enumerate(test_vals):
            if hasattr(self.entities[idx], "mark") and hasattr(self.entities[idx], "elemental_id"):
                elemental_id = self.entities[idx].elemental_id
                response = self.client.patch(
                    f"/rest/{self.detail_uri}/{self.entities[idx].version.pk}/{elemental_id}?format=json",
                    {"null_attributes": ["Bool Test"]},
                    format="json",
                )
            else:
                pk = self.entities[idx].pk
                response = self.client.patch(
                    f"/rest/{self.detail_uri}/{pk}",
                    {"null_attributes": ["Bool Test"]},
                    format="json",
                )

            assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_null=Bool Test::true"
            f"&type={self.entity_type.pk}",  # needed for localizations
            format="json",
        )
        self.assertEqual(len(response.data), len(self.entities))

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_null=asdf::true"
            f"&type={self.entity_type.pk}",  # needed for localizations
            format="json",
        )
        self.assertEqual(len(response.data), len(self.entities))
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_null=asdf::false"
            f"&type={self.entity_type.pk}",  # needed for localizations
            format="json",
        )
        self.assertEqual(len(response.data), 0)

    def generic_attr_helper(self, idx, name, test_val):
        def to_string(dt):
            return dt.isoformat().replace("+00:00", "Z")

        pk = self.entities[idx].pk
        is_date = type(test_val) == datetime.datetime
        if is_date:
            test_val = to_string(test_val)

        if hasattr(self.entities[idx], "mark") and hasattr(self.entities[idx], "elemental_id"):
            elemental_id = self.entities[idx].elemental_id
            fetch_url = f"/rest/{self.detail_uri}/{self.entities[idx].version.pk}/{elemental_id}?format=json"
            mark_based = True
        else:
            fetch_url = f"/rest/{self.detail_uri}/{pk}"
            mark_based = False

        initial_value = self.entities[idx].attributes.get(name, None)
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{pk}", {"attributes": {name: test_val}}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        # Do this again to test after the attribute object has been created.
        # This verifies patching non-latest element by serial doesn't work (when pedantic)
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{pk}",
            {"attributes": {name: test_val}, "pedantic": 1},
            format="json",
        )
        if mark_based:
            assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        else:
            assertResponse(self, response, status.HTTP_200_OK)

        # By serial ID the result is actually the initial value, the change went to
        # a new version
        if mark_based:
            response = self.client.get(f"/rest/{self.detail_uri}/{pk}?format=json")
            self.assertEqual(response.data["id"], pk)
            self.assertEqual(response.data["attributes"].get(name, None), initial_value)
            this_mark = response.data["mark"]
            last_mark = this_mark

        # Access via the UUID accessor + verify we got a new mark on the version
        # Use fetch_url which is the pk-based method for elements with out mark-based versioning
        response = self.client.get(fetch_url)
        if is_date:
            self.assertEqual(response.data["attributes"][name].replace("+00:00", "Z"), test_val)
        else:
            self.assertEqual(response.data["attributes"][name], test_val)
        if mark_based:
            self.assertEqual(response.data["elemental_id"], elemental_id)
            this_mark = response.data["mark"]
            self.assertEqual(last_mark + 1, this_mark)
        else:
            self.assertEqual(response.data["id"], pk)

    def generic_reset_nullification(self, attribute_name, default_value, null_value=None):
        # Test attribute reset / nullification
        # Of note; this also tests PATCH/GET via version/UUID path
        if hasattr(self.entities[0], "mark") and hasattr(self.entities[0], "elemental_id"):
            elemental_id = self.entities[0].elemental_id
            version = self.entities[0].version.pk
            fetch_url = f"/rest/{self.detail_uri}/{self.entities[0].version.pk}/{elemental_id}?"
        else:
            pk = self.entities[0].pk
            fetch_url = f"/rest/{self.detail_uri}/{pk}"

        project = self.entities[0].project
        many_pks = [e.pk for e in self.entities]
        response = self.client.patch(
            fetch_url, {"reset_attributes": [attribute_name]}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(fetch_url, format="json")
        assert response.data["attributes"][attribute_name] == default_value
        response = self.client.patch(
            fetch_url, {"null_attributes": [attribute_name]}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(fetch_url, format="json")
        assert response.data["attributes"][attribute_name] == null_value

        # verify bulk modifications via ids / in-place updates
        response = self.client.patch(
            f"/rest/{self.list_uri}/{project.pk}",
            {"ids": many_pks, "reset_attributes": [attribute_name]},
            format="json",
        )
        assertResponse(self, response, status.HTTP_200_OK)
        for pk in many_pks:
            response = self.client.get(f"/rest/{self.detail_uri}/{pk}", format="json")
            assert response.data["attributes"][attribute_name] == default_value

        response = self.client.patch(
            f"/rest/{self.list_uri}/{project.pk}",
            {"ids": many_pks, "null_attributes": [attribute_name]},
            format="json",
        )
        assertResponse(self, response, status.HTTP_200_OK)
        datetime_map = {}

        for pk in many_pks:
            response = self.client.get(f"/rest/{self.detail_uri}/{pk}", format="json")
            assert response.data["attributes"][attribute_name] == null_value
            if "created_datetime" in response.data:
                datetime_map[response.data["elemental_id"]] = response.data["created_datetime"]

        if hasattr(self.entities[0], "mark") and hasattr(self.entities[0], "elemental_id"):
            version = self.entities[0].version.pk
            many_eids = [e.elemental_id for e in self.entities]
            # verify bulk modifications via mark-based bulk update
            response = self.client.patch(
                f"/rest/{self.list_uri}/{project.pk}",
                {"elemental_ids": many_eids, "reset_attributes": [attribute_name]},
                format="json",
            )
            assertResponse(self, response, status.HTTP_200_OK)
            for eid in many_eids:
                response = self.client.get(
                    f"/rest/{self.detail_uri}/{version}/{eid}", format="json"
                )
                assert response.data["attributes"][attribute_name] == default_value
                if "created_datetime" in response.data:
                    assert response.data["created_datetime"] == datetime_map[eid]

            response = self.client.patch(
                f"/rest/{self.list_uri}/{project.pk}",
                {"elemental_ids": many_eids, "null_attributes": [attribute_name]},
                format="json",
            )
            assertResponse(self, response, status.HTTP_200_OK)
            for eid in many_eids:
                response = self.client.get(
                    f"/rest/{self.detail_uri}/{version}/{eid}", format="json"
                )
                assert response.data["attributes"][attribute_name] == null_value
                if "created_datetime" in response.data:
                    assert response.data["created_datetime"] == datetime_map[eid]

    def test_bool_attr(self):
        test_vals = [random.random() > 0.5 for _ in range(len(self.entities))]

        # Test setting an invalid bool
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}",
            {"attributes": {"Bool Test": "asdfasdf"}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for idx, test_val in enumerate(test_vals):
            self.generic_attr_helper(idx, "Bool Test", test_val)

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute=Bool Test::true&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), sum(test_vals))
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute=Bool Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), len(test_vals) - sum(test_vals))
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gt=Bool Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gte=Bool Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lt=Bool Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lte=Bool Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_contains=Bool Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_distance=Bool Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

    def test_int_attr(self):
        test_vals = [random.randint(-1000, 1000) for _ in range(len(self.entities))]
        # Test setting an invalid int
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}",
            {"attributes": {"Int Test": "asdfasdf"}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for idx, test_val in enumerate(test_vals):
            pk = self.entities[idx].pk
            self.generic_attr_helper(idx, "Int Test", test_val)
            # Test that attribute maximum is working.
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{pk}", {"attributes": {"Int Test": 100000}}, format="json"
            )
            assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
            # Test that attribute minimum is working.
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{pk}",
                {"attributes": {"Int Test": -100000}},
                format="json",
            )
            assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        for test_val in test_vals:
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute=Int Test::{test_val}&type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(len(response.data), sum([t == test_val for t in test_vals]))
        for lbound, ubound in [(-1000, 1000), (-500, 500), (-500, 0), (0, 500)]:
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_gt=Int Test::{lbound}&attribute_lt=Int Test::{ubound}&type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([(t > lbound) and (t < ubound) for t in test_vals])
            )
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_gte=Int Test::{lbound}&attribute_lte=Int Test::{ubound}&type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([(t >= lbound) and (t <= ubound) for t in test_vals])
            )
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_contains=Int Test::1&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_distance=Int Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        self.generic_reset_nullification("Int Test", 42)

    def test_float_attr(self):
        test_vals = [random.uniform(-1000.0, 1000.0) for _ in range(len(self.entities))]
        # Test setting an invalid float
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}",
            {"attributes": {"Float Test": "asdfasdf"}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for idx, test_val in enumerate(test_vals):
            pk = self.entities[idx].pk
            self.generic_attr_helper(idx, "Float Test", test_val)
            # Test that attribute maximum is working.
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{pk}",
                {"attributes": {"Float Test": 100000}},
                format="json",
            )
            assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
            # Test that attribute minimum is working.
            response = self.client.patch(
                f"/rest/{self.detail_uri}/{pk}",
                {"attributes": {"Float Test": -100000}},
                format="json",
            )
            assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        # Equality on float not recommended but is allowed.
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute=Float Test::{test_val}&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        for lbound, ubound in [(-1000.0, 1000.0), (-500.0, 500.0), (-500.0, 0.0), (0.0, 500.0)]:
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_gt=Float Test::{lbound}&attribute_lt=Float Test::{ubound}&type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([(t > lbound) and (t < ubound) for t in test_vals])
            )
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_gte=Float Test::{lbound}&attribute_lte=Float Test::{ubound}&type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([(t >= lbound) and (t <= ubound) for t in test_vals])
            )
        # Contains on float not recommended but is allowed.
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_contains=Float Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_distance=Float Test::false&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        self.generic_reset_nullification("Float Test", 42.0)

    def test_enum_attr(self):
        test_vals = [
            random.choice(["enum_val1", "enum_val2", "enum_val3"])
            for _ in range(len(self.entities))
        ]
        # Test setting an invalid choice
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}",
            {"attributes": {"Enum Test": "asdfasdf"}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for idx, test_val in enumerate(test_vals):
            self.generic_attr_helper(idx, "Enum Test", test_val)

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gt=Enum Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gte=Enum Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lt=Enum Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lte=Enum Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for _ in range(10):
            subs = "".join(random.choices(string.ascii_lowercase, k=2))
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_contains=Enum Test::{subs}&type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([subs.lower() in t.lower() for t in test_vals])
            )
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_distance=Enum Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        self.generic_reset_nullification("Enum Test", "enum_val1")

    def test_string_attr(self):
        test_vals = [
            "".join(random.choices(string.ascii_uppercase + string.digits, k=random.randint(1, 64)))
            for _ in range(len(self.entities))
        ]
        for idx, test_val in enumerate(test_vals):
            self.generic_attr_helper(idx, "String Test", test_val)

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gt=String Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gte=String Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lt=String Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lte=String Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for _ in range(10):
            subs = "".join(random.choices(string.ascii_lowercase, k=2))
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_contains=String Test::{subs}&type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([subs.lower() in t.lower() for t in test_vals])
            )
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_distance=String Test::0&type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        self.generic_reset_nullification("String Test", "asdf_default")

    def test_datetime_attr(self):
        def to_string(dt):
            return dt.isoformat().replace("+00:00", "Z")

        end_dt = datetime.datetime.now(datetime.timezone.utc)
        start_dt = end_dt - datetime.timedelta(days=5 * 365)
        test_vals = [random_datetime(start_dt, end_dt) for _ in range(len(self.entities))]
        # Test setting an invalid datetime
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}",
            {"attributes": {"Datetime Test": "asdfasdf"}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for idx, test_val in enumerate(test_vals):
            self.generic_attr_helper(idx, "Datetime Test", test_val)

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute=Datetime Test::{to_string(test_val)}&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        delta_dt = datetime.timedelta(days=365)
        for lbound, ubound in [
            (start_dt, end_dt),
            (start_dt + delta_dt, end_dt - delta_dt),
            (start_dt + delta_dt, end_dt - 2 * delta_dt),
            (start_dt + 2 * delta_dt, end_dt - delta_dt),
        ]:
            lbound_iso = to_string(lbound)
            ubound_iso = to_string(ubound)
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_gt=Datetime Test::{lbound_iso}&"
                f"attribute_lt=Datetime Test::{ubound_iso}&type={self.entity_type.pk}&"
                f"format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([(t > lbound) and (t < ubound) for t in test_vals])
            )
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_gte=Datetime Test::{lbound_iso}&"
                f"attribute_lte=Datetime Test::{ubound_iso}&type={self.entity_type.pk}&"
                f"format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(
                len(response.data), sum([(t >= lbound) and (t <= ubound) for t in test_vals])
            )
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_contains=Datetime Test::asdf&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_distance=Datetime Test::asdf&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        self.generic_reset_nullification("Datetime Test", None)

    def test_geoposition_attr(self):
        test_vals = [
            (40.712776, -74.005974),  # new york
            (42.360081, -71.058884),  # boston
            (51.507351, -0.127758),  # london
            (55.755825, 37.617298),  # moscow
            (-33.868820, 151.209290),  # sydney
        ]
        # Test setting invalid geopositions
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}",
            {"attributes": {"Geoposition Test": [0.0, -91.0]}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.patch(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}",
            {"attributes": {"Geoposition Test": [-181.0, 0.0]}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        for idx, test_val in enumerate(test_vals):
            lat, lon = test_val
            self.generic_attr_helper(idx, "Geoposition Test", [lon, lat])

        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute=Geoposition Test::10::{lat}::{lon}&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lt=Geoposition Test::10::{lat}::{lon}&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_lte=Geoposition Test::10::{lat}::{lon}&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gt=Geoposition Test::10::{lat}::{lon}&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_gte=Geoposition Test::10::{lat}::{lon}&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        response = self.client.get(
            f"/rest/{self.list_uri}/{self.project.pk}?attribute_contains=Geoposition Test::10::{lat}::{lon}&"
            f"type={self.entity_type.pk}&format=json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)
        test_lat, test_lon = (30.26759, -97.74299)  # Austin, TX
        for dist in [1.0, 100.0, 1000.0, 5000.0, 10000.0, 43000.0]:
            response = self.client.get(
                f"/rest/{self.list_uri}/{self.project.pk}?attribute_distance=Geoposition Test::"
                f"{dist}::{test_lat}::{test_lon}&"
                f"type={self.entity_type.pk}&format=json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            got = response.data
            self.assertEqual(
                len(response.data),
                sum(
                    [latlon_distance(test_lat, test_lon, lat, lon) < dist for lat, lon in test_vals]
                ),
            )

        self.generic_reset_nullification("Geoposition Test", [-179.0, -89.0], [-1.0, -1.0])


class FileMixin:
    def _test_methods(self, role):
        list_endpoint = f"/rest/{self.list_uri}/{self.media.pk}"
        detail_endpoint = f"/rest/{self.detail_uri}/{self.media.pk}"

        # Create media definition.
        response = self.client.post(f"{list_endpoint}?role={role}", self.create_json, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        # Patch the media definition.
        response = self.client.patch(
            f"{detail_endpoint}?role={role}&index=0", self.patch_json, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)

        # Get media definition list.
        response = self.client.get(f"{list_endpoint}?role={role}")
        assertResponse(self, response, status.HTTP_200_OK)
        for key in self.patch_json:
            self.assertEqual(response.data[0][key], self.patch_json[key])

        # Get media definition detail.
        response = self.client.get(f"{detail_endpoint}?role={role}&index=0")
        assertResponse(self, response, status.HTTP_200_OK)
        for key in self.patch_json:
            self.assertEqual(response.data[key], self.patch_json[key])

        # Delete media definition.
        response = self.client.delete(f"{detail_endpoint}?role={role}&index=0")
        assertResponse(self, response, status.HTTP_200_OK)

        # Check we have nothing.
        response = self.client.get(f"{list_endpoint}?role={role}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def _generate_key(self):
        return f"{self.organization.pk}/{self.project.pk}/{self.media.pk}/{uuid1()}"


class CurrentUserTestCase(TatorTransactionTest):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)

    def test_get(self):
        response = self.client.get("/rest/User/GetCurrent")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        response = self.client.get(f"/rest/Users?elemental_id={self.user.elemental_id}")
        self.assertEqual(len(response.data), 1)
        response = self.client.get(f"/rest/User/Exists?elemental_id={self.user.elemental_id}")
        self.assertEqual(response.data, True)
        random_uuid = uuid.uuid4()
        response = self.client.get(f"/rest/Users?elemental_id={random_uuid}")
        self.assertEqual(len(response.data), 0)

    def test_profile(self):
        response = self.client.get("/rest/User/GetCurrent")
        user_id = response.data["id"]
        response = self.client.patch(
            f"/rest/User/{user_id}",
            {"set_profile_keys": {"Test Key": 123, "Test Key 2": 345}},
            format="json",
        )
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get("/rest/User/GetCurrent")
        user_profile = response.data["profile"]
        assert user_profile["Test Key"] == 123
        assert user_profile["Test Key 2"] == 345

        response = self.client.patch(
            f"/rest/User/{user_id}", {"clear_profile_keys": ["Test Key 2"]}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get("/rest/User/GetCurrent")
        user_profile = response.data["profile"]
        assert user_profile["Test Key"] == 123
        assert user_profile.get("Test Key 2", None) == None

        response = self.client.patch(
            f"/rest/User/{user_id}", {"clear_profile_keys": ["Test Key 2"]}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get("/rest/User/GetCurrent")
        user_profile = response.data["profile"]
        assert user_profile["Test Key"] == 123
        assert user_profile.get("Test Key 2", None) == None

    def test_avatar(self):
        response = self.client.get("/rest/User/GetCurrent")
        has_avatar = "avatar" in response.data["profile"]
        self.assertEqual(has_avatar, False)
        ben_url = "https://tator-ci.s3.amazonaws.com/avatar_images/ben_franklin.jpg"
        white_house_url = "https://tator-ci.s3.amazonaws.com/avatar_images/white_house.jpg"
        video_url = "https://tator-ci.s3.amazonaws.com/AudioVideoSyncTest_BallastMedia.mp4"
        user_id = response.data["id"]

        # Verify Ben Franklin works
        fp = io.BytesIO()
        with requests.get(ben_url, stream=True) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    fp.write(chunk)
        fp.seek(0)
        encoded = base64.b64encode(fp.read())

        # .decode() is required to convert the bytes to a string for JSON.
        response = self.client.patch(
            f"/rest/User/{user_id}", {"new_avatar": encoded.decode()}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)

        # Verify white house image is rejected, because it is too big.
        fp = io.BytesIO()
        with requests.get(white_house_url, stream=True) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    fp.write(chunk)
        fp.seek(0)
        encoded = base64.b64encode(fp.read())

        response = self.client.patch(
            f"/rest/User/{user_id}", {"new_avatar": encoded.decode()}, format="json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        # Verify video image fails, because it is a bad mime type
        fp = io.BytesIO()
        with requests.get(video_url, stream=True) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    fp.write(chunk)
        fp.seek(0)
        encoded = base64.b64encode(fp.read(512 * 1024))

        response = self.client.patch(
            f"/rest/User/{user_id}", {"new_avatar": encoded.decode()}, format="json"
        )
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        # Verify we get a profile image now
        response = self.client.get("/rest/User/GetCurrent")
        has_avatar = "avatar" in response.data["profile"]
        self.assertEqual(has_avatar, True)

        # Verify it is true over the other access method as well
        response = self.client.get(f"/rest/User/{user_id}")
        has_avatar = "avatar" in response.data["profile"]
        self.assertEqual(has_avatar, True)

        response = self.client.patch(f"/rest/User/{user_id}", {"clear_avatar": 1}, format="json")
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get("/rest/User/GetCurrent")
        has_avatar = "avatar" in response.data["profile"]
        self.assertEqual(has_avatar, False)


class ProjectDeleteTestCase(TatorTransactionTest):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.project = create_test_project(self.user)
        self.video_type = MediaType.objects.create(
            name="video", dtype="video", project=self.project
        )
        self.box_type = LocalizationType.objects.create(
            name="boxes",
            dtype="box",
            project=self.project,
        )
        self.state_type = StateType.objects.create(
            name="state_type",
            dtype="state",
            project=self.project,
            association="Media",
        )
        self.videos = [
            create_test_video(self.user, f"asdf{idx}", self.video_type, self.project)
            for idx in range(random.randint(6, 10))
        ]
        self.boxes = [
            create_test_box(self.user, self.box_type, self.project, random.choice(self.videos), 0)
            for idx in range(random.randint(6, 10))
        ]
        self.states = [
            State.objects.create(
                type=self.state_type,
                project=self.project,
                version=self.project.version_set.all()[0],
            )
            for _ in range(random.randint(6, 10))
        ]
        for state in self.states:
            for media in random.choices(self.videos):
                state.media.add(media)

    def test_delete(self):
        self.client.delete(f"/rest/Project/{self.project.pk}")


""" Temporarily disabled on compose build
class AlgorithmLaunchTestCase(
        TatorTransactionTest,
        PermissionCreateTestMixin,
        PermissionListMembershipTestMixin):
    def setUp(self):
        print(f'\n{self.__class__.__name__}=', end='', flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.algorithm = create_test_algorithm(self.user, 'algtest', self.project)
        self.list_uri = 'Jobs'
        self.detail_uri = 'Job'
        self.create_json = {
            'algorithm_name': self.algorithm.name,
            'media_ids': [1,2,3],
        }
        self.edit_permission = Permission.CAN_EXECUTE
"""


class AlgorithmTestCase(TatorTransactionTest, PermissionListMembershipTestMixin):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.algorithm = create_test_algorithm(self.user, "algtest", self.project)
        self.list_uri = "Algorithms"
        self.entities = [
            create_test_algorithm(self.user, f"result{idx}", self.project)
            for idx in range(random.randint(6, 10))
        ]
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class AnonymousAccessTestCase(TatorTransactionTest):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.random_user = create_test_user()
        self.anonymous_user = create_test_user(username="anonymous")
        self.public_project = create_test_project(self.user)
        self.private_project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.private_project)
        self.membership = create_test_membership(self.user, self.private_project)
        self.membership = create_test_membership(self.anonymous_user, self.public_project)
        self.private_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.private_project,
        )
        self.public_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.public_project,
        )

        self.public_video = create_test_video(
            self.user, f"asdf_0", self.public_entity_type, self.public_project
        )
        self.private_video = create_test_video(
            self.user, f"asdf_0", self.private_entity_type, self.private_project
        )

        self.public_video.media_files = {
            "streaming": [{"path": "fake_key.txt", "resolution": [720, 1280]}]
        }
        self.public_video.save()
        self.private_video.media_files = {
            "streaming": [{"path": "fake_key.txt", "resolution": [720, 1280]}]
        }
        self.private_video.save()

        self.store = get_tator_store()
        self.test_bucket = create_test_bucket(None)
        resource = Resource(path="fake_key.txt", bucket=self.test_bucket)
        resource.save()
        resource.media.add(self.public_video)
        resource.media.add(self.private_video)
        resource.save()

    def test_random_user(self):
        """A random user should get access to public project but not the private project"""
        self.client.force_authenticate(self.random_user)
        response = self.client.get(f"/rest/Permalink/{self.public_video.pk}")
        assert response.status_code == 301
        response = self.client.get(f"/rest/Permalink/{self.private_video.pk}")
        assert response.status_code == 403

    def test_unauthenticated_user(self):
        """Users not logged in at all should get access to public, but not private"""
        response = self.client.get(f"/rest/Permalink/{self.public_video.pk}")
        assert response.status_code == 301
        response = self.client.get(f"/rest/Permalink/{self.private_video.pk}")
        # Unauthenticated access gets 400 vs. 403 because of django
        assert response.status_code == 400

    def test_authenticated_anonymous_user(self):
        """Users logged in as guest should get access to public, but not private"""
        self.client.force_authenticate(self.anonymous_user)
        response = self.client.get(f"/rest/Permalink/{self.public_video.pk}")
        assert response.status_code == 301
        response = self.client.get(f"/rest/Permalink/{self.private_video.pk}")
        assert response.status_code == 403

    def test_authenticated_primary_user(self):
        """The user with permission to both projects should get access to both"""
        self.client.force_authenticate(self.user)
        response = self.client.get(f"/rest/Permalink/{self.public_video.pk}")
        assert response.status_code == 301
        response = self.client.get(f"/rest/Permalink/{self.private_video.pk}")
        assert response.status_code == 301


class VideoTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    AttributeMediaTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entities = [
            create_test_video(
                self.user,
                f"asdf{idx}",
                self.entity_type,
                self.project,
                attributes={"Float Test": random.random() * 1000},
            )
            for idx in range(random.randint(6, 10))
        ]
        self.media_entities = self.entities
        self.list_uri = "Medias"
        self.detail_uri = "Media"
        self.create_entity = functools.partial(
            create_test_video, self.user, "asdfa", self.entity_type, self.project
        )
        self.edit_permission = Permission.CAN_EDIT
        self.patch_json = {"name": "video1", "last_edit_start": "2017-07-21T17:32:28Z"}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_search(self):
        box_type = LocalizationType.objects.create(
            name="boxes",
            dtype="box",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        box_type.media.add(self.entity_type)
        box_type.save()

        state_type = StateType.objects.create(
            name="states",
            dtype="state",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        state_type.media.add(self.entity_type)
        state_type.save()

        wait_for_indices(box_type)

        response = self.client.get(f"/rest/Medias/{self.project.pk}", format="json")
        assert response.data[0].get("incident", None) == None

        # Make a whole bunch of boxes to make sure indices get utilized
        boxes = []
        foo_val = {
            "String Test": "Foo",
            "Enum Test": "enum_val1",
            "Int Test": 1,
            "Float Test": 1.0,
            "Bool Test": True,
        }
        boxes.append(
            make_box_obj(
                self.user,
                box_type,
                self.project,
                self.entities[0],
                0,
                foo_val,
            )
        )
        boxes.append(
            make_box_obj(
                self.user,
                box_type,
                self.project,
                self.entities[0],
                0,
                foo_val,
            )
        )
        boxes.append(
            make_box_obj(
                self.user,
                box_type,
                self.project,
                self.entities[0],
                0,
                foo_val,
            )
        )
        boxes.append(
            make_box_obj(
                self.user,
                box_type,
                self.project,
                self.entities[1],
                0,
                foo_val,
            )
        )

        boxes.append(
            make_box_obj(
                self.user,
                box_type,
                self.project,
                self.entities[1],
                0,
                {
                    "String Test": "Bar",
                    "Enum Test": "enum_val2",
                    "Int Test": 2,
                    "Float Test": 2.0,
                    "Bool Test": False,
                },
            )
        )
        boxes.append(
            make_box_obj(
                self.user,
                box_type,
                self.project,
                self.entities[1],
                0,
                {
                    "String Test": "Baz",
                    "Enum Test": "enum_val3",
                    "Int Test": 3,
                    "Float Test": 3.0,
                    "Bool Test": False,
                },
            )
        )

        boxes.append(
            make_box_obj(
                self.user,
                box_type,
                self.project,
                self.entities[1],
                10,
                {
                    "String Test": "Zoo",
                    "Enum Test": "enum_val4",
                    "Int Test": 4,
                    "Float Test": 4.0,
                    "Bool Test": False,
                },
            )
        )
        Localization.objects.bulk_create(boxes)

        # Make a state object at frame 10 to make sure
        # we find Zoo/enum_val4 above.
        state = State.objects.create(
            created_by=self.user,
            modified_by=self.user,
            type=state_type,
            project=self.project,
            frame=10,
            version=self.project.version_set.all()[0],
        )
        state.media.add(self.entities[1])
        state.save()

        state_2 = State.objects.create(
            created_by=self.user,
            modified_by=self.user,
            type=state_type,
            project=self.project,
            frame=100,
            version=self.project.version_set.all()[0],
        )
        state_2.media.add(self.entities[1])
        state_2.save()

        # Do a frame_state lookup and find the localization at
        # frame 10
        response = self.client.put(
            f"/rest/Localizations/{self.project.pk}", {"frame_state_ids": [state.id]}, format="json"
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["attributes"]["String Test"], "Zoo")
        self.assertEqual(response.data[0]["attributes"]["Enum Test"], "enum_val4")

        response = self.client.put(
            f"/rest/Localizations/{self.project.pk}",
            {
                "object_search": {
                    "attribute": "$coincident_states",
                    "operation": "search",
                    "value": {"attribute": "$id", "operation": "in", "value": [state.id]},
                }
            },
            format="json",
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["attributes"]["String Test"], "Zoo")
        self.assertEqual(response.data[0]["attributes"]["Enum Test"], "enum_val4")

        response = self.client.put(
            f"/rest/Localizations/{self.project.pk}",
            {"frame_state_ids": [state_2.id]},
            format="json",
        )
        self.assertEqual(len(response.data), 0)

        response = self.client.put(
            f"/rest/Localizations/{self.project.pk}",
            {
                "object_search": {
                    "attribute": "$coincident_states",
                    "operation": "search",
                    "value": {"attribute": "$id", "operation": "in", "value": [state_2.id]},
                }
            },
            format="json",
        )
        self.assertEqual(len(response.data), 0)

        # Do attribute searches on localization data

        searches = [
            ["String Test", "Foo"],
            ["Int Test", 1],
            ["Float Test", 1.0],
            ["Bool Test", True],
        ]
        for key, value in searches:
            response = self.client.get(
                f"/rest/Localizations/{self.project.pk}?attribute={key}::{value}", format=json
            )
            self.assertEqual(len(response.data), 4)
            encoded_search = base64.b64encode(
                json.dumps({"attribute": key, "operation": "eq", "value": value}).encode()
            )
            response = self.client.get(
                f"/rest/Medias/{self.project.pk}?encoded_related_search={encoded_search.decode()}&sort_by=-$incident",
                format="json",
            )
            matches = len(response.data)
            self.assertEqual(matches, 2)

            first_hit = response.data[0]
            second_hit = response.data[1]
            self.assertEqual(first_hit.get("incident", None), 3)
            self.assertEqual(first_hit["id"], self.entities[0].pk)
            self.assertEqual(second_hit.get("incident", None), 1)
            self.assertEqual(second_hit["id"], self.entities[1].pk)

            # reverse it
            response = self.client.get(
                f"/rest/Medias/{self.project.pk}?encoded_related_search={encoded_search.decode()}&sort_by=$incident",
                format="json",
            )
            first_hit = response.data[0]
            second_hit = response.data[1]
            self.assertEqual(second_hit.get("incident", None), 3)
            self.assertEqual(second_hit["id"], self.entities[0].pk)
            self.assertEqual(first_hit.get("incident", None), 1)
            self.assertEqual(first_hit["id"], self.entities[1].pk)

            # Test the same thing with related_search in  object_search
            response = self.client.put(
                f"/rest/Medias/{self.project.pk}",
                {
                    "object_search": {
                        "attribute": "$related_localizations",
                        "operation": "search",
                        "value": {"attribute": key, "operation": "eq", "value": value},
                    }
                },
                format="json",
            )
            matches = len(response.data)
            self.assertEqual(matches, 2)

    def test_author_change(self):
        test_video = create_test_video(self.user, f"asdf_0", self.entity_type, self.project)
        response = self.client.get(f"/rest/Media/{test_video.pk}")
        assert response.data["created_by"] == self.user.pk
        response = self.client.patch(
            f"/rest/Media/{test_video.pk}",
            {"user_elemental_id": self.user_two.elemental_id},
            format="json",
        )
        assert response.status_code < 400
        response = self.client.get(f"/rest/Media/{test_video.pk}")
        assert response.data["created_by"] == self.user_two.pk

        response = self.client.post(
            f"/rest/Medias/{self.project.pk}",
            {
                "type": self.entity_type.pk,
                "section": "test cross author",
                "name": "test cross author",
                "md5": "b81e32eb9957ea4e965ca36680d4adfb",
                "user_elemental_id": self.user_two.elemental_id,
            },
            format="json",
        )
        new_id = response.data["id"]
        response = self.client.get(f"/rest/Media/{new_id}")
        assert response.data["created_by"] == self.user_two.pk

        # test bulk patch authorship change (back to original)
        response = self.client.patch(
            f"/rest/Medias/{self.project.pk}",
            {"ids": [new_id, test_video.id], "user_elemental_id": self.user.elemental_id},
            format="json",
        )
        response = self.client.get(f"/rest/Media/{new_id}")
        assert response.data["created_by"] == self.user.pk
        response = self.client.get(f"/rest/Media/{test_video.id}")
        assert response.data["created_by"] == self.user.pk

    def test_elemental_id(self):
        test_video = create_test_video(self.user, f"asdf_0", self.entity_type, self.project)
        existing_uuid = test_video.elemental_id
        new_uuid = uuid4()
        response = self.client.get(
            f"/rest/MediaCount/{self.project.pk}?elemental_id={existing_uuid}"
        )
        self.assertEqual(response.data, 1)
        response = self.client.patch(
            f"/rest/Media/{test_video.pk}", {"elemental_id": str(new_uuid)}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/MediaCount/{self.project.pk}?elemental_id={new_uuid}")
        self.assertEqual(response.data, 1)
        response = self.client.get(
            f"/rest/MediaCount/{self.project.pk}?elemental_id={existing_uuid}"
        )
        self.assertEqual(response.data, 0)

        project = test_video.project.id
        # Test on type object
        new_uuid = str(uuid4())
        response = self.client.get(f"/rest/MediaTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 0
        response = self.client.get(f"/rest/MediaType/{test_video.type.id}")
        assert str(response.data["elemental_id"]) == str(test_video.type.elemental_id)
        response = self.client.patch(
            f"/rest/MediaType/{test_video.type.id}", {"elemental_id": str(new_uuid)}, format="json"
        )
        response = self.client.get(f"/rest/MediaType/{test_video.type.id}")
        assert str(response.data["elemental_id"]) == new_uuid
        response = self.client.get(f"/rest/MediaTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 1

        # Test on Project object
        new_uuid = str(uuid4())
        response = self.client.get(f"/rest/Projects?elemental_id={new_uuid}")
        assert len(response.data) == 0
        response = self.client.get(f"/rest/Project/{test_video.project.id}")
        assert str(response.data["elemental_id"]) == str(test_video.project.elemental_id)
        response = self.client.patch(
            f"/rest/Project/{test_video.project.id}", {"elemental_id": str(new_uuid)}, format="json"
        )
        response = self.client.get(f"/rest/Project/{test_video.project.id}")
        assert str(response.data["elemental_id"]) == new_uuid
        response = self.client.get(f"/rest/Projects?elemental_id={new_uuid}")
        assert len(response.data) == 1

    def test_annotation_delete(self):
        medias = [
            create_test_video(self.user, f"asdf{idx}", self.entity_type, self.project)
            for idx in range(random.randint(6, 10))
        ]
        state_type = StateType.objects.create(
            project=self.project, name="track_type", association="Localization", attribute_types=[]
        )
        state_type.media.add(self.entity_type)
        loc_type = LocalizationType.objects.create(
            project=self.project, name="loc_type", dtype="box", attribute_types=[]
        )
        loc_type.media.add(self.entity_type)
        locs = [
            create_test_box(self.user, loc_type, self.project, medias[1], 0)
            for _ in range(random.randint(2, 5))
        ]
        state_specs = []
        for _ in range(random.randint(2, 5)):
            state_specs.append(
                {
                    "project": self.project.id,
                    "type": state_type.id,
                    "frame": 0,
                    "media_ids": [medias[0].id, medias[1].id],
                    "localization_ids": [loc.id for loc in locs],
                }
            )
        response = self.client.post(f"/rest/States/{self.project.pk}", state_specs, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        # Test detail delete
        response = self.client.get(
            f"/rest/LocalizationCount/{self.project.pk}?media_id={medias[1].id}"
        )
        self.assertNotEqual(response.data, 0)
        response = self.client.get(f"/rest/StateCount/{self.project.pk}?media_id={medias[1].id}")
        self.assertNotEqual(response.data, 0)
        num_states = response.data
        response = self.client.delete(f"/rest/Media/{medias[1].id}")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/LocalizationCount/{self.project.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data, 0)
        response = self.client.get(f"/rest/StateCount/{self.project.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data, num_states)
        response = self.client.delete(f"/rest/Media/{medias[0].id}")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/LocalizationCount/{self.project.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data, 0)
        response = self.client.get(f"/rest/StateCount/{self.project.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data, 0)
        locs = [
            create_test_box(self.user, loc_type, self.project, medias[2], 0)
            for _ in range(random.randint(2, 5))
        ]
        state_specs = []
        for _ in range(random.randint(2, 5)):
            state_specs.append(
                {
                    "project": self.project.id,
                    "type": state_type.id,
                    "frame": 0,
                    "media_ids": [medias[2].id, medias[3].id],
                    "localization_ids": [loc.id for loc in locs],
                }
            )
        response = self.client.post(f"/rest/States/{self.project.pk}", state_specs, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        # Test list delete
        response = self.client.get(
            f"/rest/LocalizationCount/{self.project.pk}?media_id={medias[2].id}"
        )
        self.assertNotEqual(response.data, 0)
        response = self.client.get(f"/rest/StateCount/{self.project.pk}?media_id={medias[2].id}")
        self.assertNotEqual(response.data, 0)
        num_states = response.data
        response = self.client.delete(f"/rest/Medias/{self.project.pk}?media_id={medias[2].id}")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/LocalizationCount/{self.project.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data, 0)
        response = self.client.get(f"/rest/StateCount/{self.project.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data, num_states)
        response = self.client.delete(f"/rest/Medias/{self.project.pk}?media_id={medias[3].id}")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/StateCount/{self.project.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(response.data, 0)


class ImageTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    AttributeMediaTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = MediaType.objects.create(
            name="images",
            dtype="image",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entities = [
            create_test_image(
                self.user,
                f"asdf{idx}",
                self.entity_type,
                self.project,
                attributes={"Float Test": random.random() * 1000},
            )
            for idx in range(random.randint(6, 10))
        ]
        self.media_entities = self.entities
        self.list_uri = "Medias"
        self.detail_uri = "Media"
        self.create_entity = functools.partial(
            create_test_image, self.user, "asdfa", self.entity_type, self.project
        )
        self.edit_permission = Permission.CAN_EDIT
        self.patch_json = {"name": "image1"}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class LocalizationBoxTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    AttributeMediaTestMixin,
    DefaultCreateTestMixin,
    PermissionCreateTestMixin,
    PermissionListTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
    EntityAuthorChangeMixin,
    ElementalIDChangeMixin,
    AttributeRenameMixin,
):
    def setUp(self):
        super().setUp()
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        # logging.disable(logging.CRITICAL)
        BurstableThrottle.apply_monkey_patching_for_test()
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        media_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.entity_type = LocalizationType.objects.create(
            name="boxes",
            dtype="box",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entity_type.media.add(media_entity_type)
        self.media_entities = [
            create_test_video(self.user, f"asdf{idx}", media_entity_type, self.project)
            for idx in range(random.randint(3, 10))
        ]
        self.entities = [
            create_test_box(
                self.user,
                self.entity_type,
                self.project,
                random.choice(self.media_entities),
                0,
                attributes={"Float Test": random.random() * 1000},
            )
            for idx in range(random.randint(6, 10))
        ]
        self.list_uri = "Localizations"
        self.detail_uri = "Localization"
        self.create_entity = functools.partial(
            create_test_box, self.user, self.entity_type, self.project, self.media_entities[0], 0
        )
        self.create_json = [
            {
                "type": self.entity_type.pk,
                "name": "asdf",
                "media_id": self.media_entities[0].pk,
                "frame": 0,
                "x": 0,
                "y": 0,
                "width": 0.5,
                "height": 0.5,
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": "asdf",
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [179.0, -89.0],
                    "Special Characters are %&<>:;,()@": "Shenanigan",
                },
            }
        ]
        self.edit_permission = Permission.CAN_EDIT
        self.patch_json = {"name": "box1", "in_place": 1}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class LocalizationLineTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    AttributeMediaTestMixin,
    DefaultCreateTestMixin,
    PermissionCreateTestMixin,
    PermissionListTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
    EntityAuthorChangeMixin,
    ElementalIDChangeMixin,
    AttributeRenameMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        BurstableThrottle.apply_monkey_patching_for_test()
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        media_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.entity_type = LocalizationType.objects.create(
            name="lines",
            dtype="line",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entity_type.media.add(media_entity_type)
        self.media_entities = [
            create_test_video(self.user, f"asdf{idx}", media_entity_type, self.project)
            for idx in range(random.randint(3, 10))
        ]
        self.entities = [
            create_test_line(
                self.user,
                self.entity_type,
                self.project,
                random.choice(self.media_entities),
                0,
                attributes={"Float Test": random.random() * 1000},
            )
            for idx in range(random.randint(6, 10))
        ]
        self.list_uri = "Localizations"
        self.detail_uri = "Localization"
        self.create_entity = functools.partial(
            create_test_line, self.user, self.entity_type, self.project, self.media_entities[0], 0
        )
        self.create_json = [
            {
                "type": self.entity_type.pk,
                "name": "asdf",
                "media_id": self.media_entities[0].pk,
                "frame": 0,
                "x0": 0,
                "y0": 0,
                "x1": 0.5,
                "y1": 0.5,
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": "asdf",
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                    "Special Characters are %&<>:;,()@": "Shenanigan",
                },
            }
        ]
        self.edit_permission = Permission.CAN_EDIT
        self.patch_json = {"name": "line1", "in_place": 1}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class LocalizationDotTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    AttributeMediaTestMixin,
    DefaultCreateTestMixin,
    PermissionCreateTestMixin,
    PermissionListTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
    EntityAuthorChangeMixin,
    ElementalIDChangeMixin,
    AttributeRenameMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        BurstableThrottle.apply_monkey_patching_for_test()
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        media_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.entity_type = LocalizationType.objects.create(
            name="dots",
            dtype="dot",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entity_type.media.add(media_entity_type)
        self.media_entities = [
            create_test_video(self.user, f"asdf{idx}", media_entity_type, self.project)
            for idx in range(random.randint(3, 10))
        ]
        self.entities = [
            create_test_dot(
                self.user,
                self.entity_type,
                self.project,
                random.choice(self.media_entities),
                0,
                attributes={"Float Test": random.random() * 1000},
            )
            for idx in range(random.randint(6, 10))
        ]
        self.list_uri = "Localizations"
        self.detail_uri = "Localization"
        self.create_entity = functools.partial(
            create_test_dot, self.user, self.entity_type, self.project, self.media_entities[0], 0
        )
        self.create_json = [
            {
                "type": self.entity_type.pk,
                "name": "asdf",
                "media_id": self.media_entities[0].pk,
                "frame": 0,
                "x": 0,
                "y": 0,
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": "asdf",
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                    "Special Characters are %&<>:;,()@": "Shenanigan",
                },
            }
        ]
        self.edit_permission = Permission.CAN_EDIT
        self.patch_json = {"name": "dot1", "in_place": 1}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class LocalizationPolyTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    AttributeMediaTestMixin,
    DefaultCreateTestMixin,
    PermissionCreateTestMixin,
    PermissionListTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
    EntityAuthorChangeMixin,
    ElementalIDChangeMixin,
    AttributeRenameMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        BurstableThrottle.apply_monkey_patching_for_test()
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        media_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.entity_type = LocalizationType.objects.create(
            name="polys",
            dtype="poly",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entity_type.media.add(media_entity_type)
        self.media_entities = [
            create_test_video(self.user, f"asdf{idx}", media_entity_type, self.project)
            for idx in range(random.randint(3, 10))
        ]
        self.entities = [
            create_test_box(
                self.user,
                self.entity_type,
                self.project,
                random.choice(self.media_entities),
                0,
                attributes={"Float Test": random.random() * 1000},
            )
            for idx in range(random.randint(6, 10))
        ]
        self.list_uri = "Localizations"
        self.detail_uri = "Localization"
        self.create_entity = functools.partial(
            create_test_box, self.user, self.entity_type, self.project, self.media_entities[0], 0
        )
        self.create_json = [
            {
                "type": self.entity_type.pk,
                "name": "asdf",
                "media_id": self.media_entities[0].pk,
                "frame": 0,
                "points": [[0.0, 0.1], [0.0, 0.2], [0.1, 0.2], [0.0, 0.1]],
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": "asdf",
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [179.0, -89.0],
                    "Special Characters are %&<>:;,()@": "Shenanigan",
                },
            }
        ]
        self.edit_permission = Permission.CAN_EDIT
        self.patch_json = {"name": "box1", "in_place": 1}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class StateTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    AttributeMediaTestMixin,
    DefaultCreateTestMixin,
    PermissionCreateTestMixin,
    PermissionListTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
    EntityAuthorChangeMixin,
    ElementalIDChangeMixin,
    AttributeRenameMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        # logging.disable(logging.CRITICAL)
        BurstableThrottle.apply_monkey_patching_for_test()
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.version = self.project.version_set.all()[0]
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        self.media_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.entity_type = StateType.objects.create(
            name="states",
            dtype="state",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entity_type.media.add(self.media_entity_type)
        self.media_entities = [
            create_test_video(self.user, f"asdf", self.media_entity_type, self.project)
            for idx in range(random.randint(3, 10))
        ]
        self.entities = []
        for _ in range(random.randint(6, 10)):
            state = State.objects.create(
                created_by=self.user,
                modified_by=self.user,
                type=self.entity_type,
                project=self.project,
                version=self.version,
                attributes={"Float Test": random.random() * 1000},
            )
            for media in random.choices(self.media_entities):
                state.media.add(media)
            self.entities.append(state)
        self.list_uri = "States"
        self.detail_uri = "State"
        self.create_entity = functools.partial(
            State.objects.create, type=self.entity_type, project=self.project, version=self.version
        )
        self.create_json = [
            {
                "type": self.entity_type.pk,
                "name": "asdf",
                "media_ids": [m.id for m in random.choices(self.media_entities)],
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": "asdf",
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                    "Special Characters are %&<>:;,()@": "Shenanigan",
                },
            }
        ]
        self.edit_permission = Permission.CAN_EDIT
        self.patch_json = {"name": "state1", "in_place": 1}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_elemental_id(self):
        # Test on type object
        new_uuid = str(uuid4())
        project = self.entity_type.project.id
        response = self.client.get(f"/rest/StateTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 0
        response = self.client.get(f"/rest/StateType/{self.entity_type.id}")
        assert str(response.data["elemental_id"]) == str(self.entity_type.elemental_id)
        response = self.client.patch(
            f"/rest/StateType/{self.entity_type.id}", {"elemental_id": str(new_uuid)}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/StateType/{self.entity_type.id}")
        assert str(response.data["elemental_id"]) == new_uuid
        response = self.client.get(f"/rest/StateTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 1

    def test_frame_association(self):
        media = self.media_entities[0]
        endpoint = f"/rest/{self.list_uri}/{self.project.pk}"
        create_json = [{"type": self.entity_type.pk, "name": "asdf", "media_ids": [media.id]}]

        # Test default state type with no frame association
        response = self.client.post(endpoint, create_json, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Test state type with frame association
        entity_type = StateType.objects.create(
            name="frame states",
            project=self.project,
            association="Frame",
        )
        entity_type.media.add(self.media_entity_type)
        create_json[0]["type"] = entity_type.pk

        # No frame value in `create_json` should return 400
        response = self.client.post(endpoint, create_json, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Frame value added, should return 201
        create_json[0]["frame"] = 1
        response = self.client.post(endpoint, create_json, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class LocalizationMediaDeleteCase(TatorTransactionTest):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.image_type = MediaType.objects.create(
            name="images",
            dtype="image",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.image_type)
        self.box_type = LocalizationType.objects.create(
            project=self.project,
            name="loc_box_type",
            dtype="box",
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.box_type)
        self.dot_type = LocalizationType.objects.create(
            project=self.project,
            name="loc_dot_type",
            dtype="dot",
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.dot_type)
        self.line_type = LocalizationType.objects.create(
            project=self.project,
            name="loc_line_type",
            dtype="line",
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.line_type)

        # Associate media type and localization type together
        self.box_type.media.add(self.image_type)
        self.box_type.save()
        self.line_type.media.add(self.image_type)
        self.line_type.save()
        self.dot_type.media.add(self.image_type)
        self.dot_type.save()
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_single_media_delete(self):
        # Tests deleting a localization's associated media (1). The corresponding
        # localization must also be deleted. Delete via the endpoint.
        unique_string_attr_val = "super_unique_string_to_search_for_1"
        attr_search = f"String Test::{unique_string_attr_val}"
        body = [
            {
                "type": self.image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
                "attributes": {"String Test": unique_string_attr_val},
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id1 = response.data["id"][0]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id2 = response.data["id"][0]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id3 = response.data["id"][0]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id4 = response.data["id"][0]

        create_json = [
            {
                "project": self.project.pk,
                "type": self.box_type.pk,
                "frame": 0,
                "media_id": media_id1,
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": unique_string_attr_val,
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                },
            }
        ]
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.line_type.pk
        create_json[0]["media_id"] = media_id2
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.line_type.pk
        create_json[0]["media_id"] = media_id4
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.dot_type.pk
        create_json[0]["media_id"] = media_id3
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.dot_type.pk
        create_json[0]["media_id"] = media_id4
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        response = self.client.delete(f"/rest/Media/{media_id1}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(f"/rest/Localizations/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 4)

        response = self.client.delete(f"/rest/Media/{media_id2}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(f"/rest/Localizations/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 3)

        response = self.client.delete(f"/rest/Media/{media_id3}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(f"/rest/Localizations/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 2)

        response = self.client.delete(f"/rest/Media/{media_id4}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(f"/rest/Localizations/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 0)

    def test_multiple_media_delete(self):
        # Tests deleting localizations where it's associated with multiple media.
        # The media is deleted and the subsequent localizations should also be deleted.
        unique_string_attr_val1 = "super_unique_string_to_search_for_1"
        unique_string_attr_val2 = "super_unique_string_to_search_for_2"
        unique_string_attr_val3 = "super_unique_string_to_search_for_3"
        body = [
            {
                "type": self.image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
                "attributes": {"String Test": unique_string_attr_val1},
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id1 = response.data["id"][0]

        body = [
            {
                "type": self.image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
                "attributes": {"String Test": unique_string_attr_val2},
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id2 = response.data["id"][0]

        create_json = [
            {
                "project": self.project.pk,
                "type": self.box_type.pk,
                "frame": 0,
                "media_id": media_id1,
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": unique_string_attr_val3,
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                },
            }
        ]
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.line_type.pk
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.dot_type.pk
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.box_type.pk
        create_json[0]["media_id"] = media_id2
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.line_type.pk
        create_json[0]["media_id"] = media_id2
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        create_json[0]["type"] = self.dot_type.pk
        create_json[0]["media_id"] = media_id2
        response = self.client.post(
            f"/rest/Localizations/{self.project.pk}", create_json, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        response = self.client.get(
            f"/rest/Localizations/{self.project.pk}?related_attribute=String Test::{unique_string_attr_val1}"
        )
        self.assertEqual(len(response.data), 3)

        response = self.client.get(
            f"/rest/Localizations/{self.project.pk}?related_attribute=String Test::{unique_string_attr_val2}"
        )
        self.assertEqual(len(response.data), 3)

        response = self.client.delete(
            f"/rest/Medias/{self.project.pk}?attribute=String Test::{unique_string_attr_val1}",
            format="json",
        )
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            f"/rest/Localizations/{self.project.pk}?related_attribute=String Test::{unique_string_attr_val1}"
        )
        self.assertEqual(len(response.data), 0)

        response = self.client.get(
            f"/rest/Localizations/{self.project.pk}?related_attribute=String Test::{unique_string_attr_val2}"
        )
        self.assertEqual(len(response.data), 3)

        response = self.client.delete(
            f"/rest/Medias/{self.project.pk}?attribute=String Test::{unique_string_attr_val2}",
            format="json",
        )
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            f"/rest/Localizations/{self.project.pk}?related_attribute=String Test::{unique_string_attr_val2}"
        )
        self.assertEqual(len(response.data), 0)

        response = self.client.get(f"/rest/Localizations/{self.project.pk}")
        self.assertEqual(len(response.data), 0)


class StateMediaDeleteCase(TatorTransactionTest):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.image_type = MediaType.objects.create(
            name="images",
            dtype="image",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.image_type)
        self.entity_type = StateType.objects.create(
            name="states",
            dtype="state",
            project=self.project,
            association="Media",
            interpolation="none",
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entity_type.media.add(self.image_type)
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_single_media_delete(self):
        # Tests deleting a state's associated media (1). The corresponding
        # state must also be deleted. Delete via the endpoint.

        unique_string_attr_val = "super_unique_string_to_search_for_1"
        attr_search = f"String Test::{unique_string_attr_val}"
        body = [
            {
                "type": self.image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
                "attributes": {"String Test": unique_string_attr_val},
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id = response.data["id"][0]

        create_json = [
            {
                "project": self.project.pk,
                "type": self.entity_type.pk,
                "frame": 0,
                "name": "asdf",
                "media_ids": [media_id],
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": unique_string_attr_val,
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                },
            }
        ]
        response = self.client.post(f"/rest/States/{self.project.pk}", create_json, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 1)

        response = self.client.get(f"/rest/States/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 1)

        response = self.client.delete(f"/rest/Media/{media_id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(f"/rest/States/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 0)

    def test_multiple_media_delete(self):
        # Tests deleting states where it's associated with multiple media.
        # The media is deleted and the subsequent states should also be deleted.

        unique_string_attr_val = "super_unique_string_to_search_for_2"
        attr_search = f"String Test::{unique_string_attr_val}"

        body = [
            {
                "type": self.image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
                "attributes": {"String Test": unique_string_attr_val},
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id1 = response.data["id"][0]

        body = [
            {
                "type": self.image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
                "attributes": {"String Test": unique_string_attr_val},
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id2 = response.data["id"][0]

        body = [
            {
                "type": self.image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
                "attributes": {"String Test": unique_string_attr_val},
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        media_id3 = response.data["id"][0]

        create_json = [
            {
                "project": self.project.pk,
                "type": self.entity_type.pk,
                "frame": 0,
                "name": "asdf",
                "media_ids": [media_id1],
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": unique_string_attr_val,
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                },
            },
            {
                "project": self.project.pk,
                "type": self.entity_type.pk,
                "frame": 0,
                "name": "asdf",
                "media_ids": [media_id2, media_id3],
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": unique_string_attr_val,
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                },
            },
        ]
        response = self.client.post(f"/rest/States/{self.project.pk}", create_json, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["id"]), 2)

        response = self.client.get(f"/rest/Medias/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 3)

        response = self.client.get(
            f"/rest/States/{self.project.pk}?related_attribute={attr_search}"
        )
        self.assertEqual(len(response.data), 2)

        not_deleted = State.objects.filter(
            project=self.project.pk, media__deleted=False
        ).values_list("id", flat=True)
        deleted = State.objects.filter(project=self.project.pk, media__deleted=True).values_list(
            "id", flat=True
        )

        response = self.client.delete(
            f"/rest/Medias/{self.project.pk}?attribute={attr_search}", format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(
            f"/rest/Medias/{self.project.pk}?attribute={attr_search}", format="json"
        )
        self.assertEqual(len(response.data), 0)

        not_deleted_medias = Media.objects.filter(
            project=self.project.pk, deleted=False
        ).values_list("id", flat=True)
        deleted_medias = Media.objects.filter(project=self.project.pk, deleted=True).values_list(
            "id", flat=True
        )
        not_deleted = State.objects.filter(
            project=self.project.pk, media__deleted=False
        ).values_list("id", flat=True)
        deleted = State.objects.filter(project=self.project.pk, media__deleted=True).values_list(
            "id", flat=True
        )

        response = self.client.get(f"/rest/States/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 0)

        response = self.client.get(f"/rest/States/{self.project.pk}?attribute={attr_search}")
        self.assertEqual(len(response.data), 0)

        response = self.client.get(
            f"/rest/States/{self.project.pk}?related_attribute={attr_search}"
        )
        self.assertEqual(len(response.data), 0)


class LeafTestCase(
    TatorTransactionTest,
    AttributeTestMixin,
    DefaultCreateTestMixin,
    PermissionCreateTestMixin,
    PermissionListTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = LeafType.objects.create(
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.entities = [
            create_test_leaf(
                f"leaf{idx}",
                self.entity_type,
                self.project,
                attributes={"Float Test": random.random() * 1000},
            )
            for idx in range(random.randint(6, 10))
        ]
        self.list_uri = "Leaves"
        self.detail_uri = "Leaf"
        self.create_entity = functools.partial(
            create_test_leaf, "leafasdf", self.entity_type, self.project
        )
        self.create_json = [
            {
                "type": self.entity_type.pk,
                "name": "asdf",
                "path": "asdf",
                "attributes": {
                    "Bool Test": True,
                    "Int Test": 1,
                    "Float Test": 0.0,
                    "Enum Test": "enum_val1",
                    "String Test": "asdf",
                    "Datetime Test": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "Geoposition Test": [0.0, 0.0],
                    "Special Characters are %&<>:;,()@": "Shenanigan",
                },
            }
        ]
        self.edit_permission = Permission.FULL_CONTROL
        self.patch_json = {"name": "leaf1"}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_elemental_id(self):
        project = self.entity_type.project.id
        new_uuid = str(uuid4())
        response = self.client.get(f"/rest/LeafTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 0
        # Test on type object
        response = self.client.get(f"/rest/LeafType/{self.entity_type.id}")
        assert str(response.data["elemental_id"]) == str(self.entity_type.elemental_id)
        response = self.client.patch(
            f"/rest/LeafType/{self.entity_type.id}", {"elemental_id": str(new_uuid)}, format="json"
        )
        response = self.client.get(f"/rest/LeafType/{self.entity_type.id}")
        assert str(response.data["elemental_id"]) == new_uuid
        response = self.client.get(f"/rest/LeafTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 1


class LeafTypeTestCase(
    TatorTransactionTest,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entities = [
            LeafType.objects.create(project=self.project) for _ in range(random.randint(6, 10))
        ]
        self.list_uri = "LeafTypes"
        self.detail_uri = "LeafType"
        self.create_json = {
            "name": "leaf type",
        }
        self.patch_json = {"name": "leaf asdf"}
        self.edit_permission = Permission.FULL_CONTROL
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class StateTypeTestCase(
    TatorTransactionTest,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.media_type = MediaType.objects.create(
            name="video",
            project=self.project,
        )
        self.entities = [
            StateType.objects.create(
                name="state1",
                project=self.project,
                association="Localization",
                attribute_types=create_test_attribute_types(),
            ),
            StateType.objects.create(
                name="state2",
                project=self.project,
                association="Media",
                attribute_types=create_test_attribute_types(),
            ),
        ]
        wait_for_indices(self.entities[0])
        wait_for_indices(self.entities[1])
        self.list_uri = "StateTypes"
        self.detail_uri = "StateType"
        self.create_json = {
            "name": "frame state type",
            "association": "Frame",
            "media_types": [self.media_type.pk],
            "attribute_types": create_test_attribute_types(),
        }
        self.patch_json = {"name": "state asdf"}
        self.edit_permission = Permission.FULL_CONTROL
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class MediaTypeTestCase(
    TatorTransactionTest,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.detail_uri = "MediaType"
        self.list_uri = "MediaTypes"
        self.entities = [
            MediaType.objects.create(
                name="videos",
                project=self.project,
                attribute_types=create_test_attribute_types(),
            ),
            MediaType.objects.create(
                name="images",
                project=self.project,
                attribute_types=create_test_attribute_types(),
            ),
        ]
        wait_for_indices(self.entities[0])
        wait_for_indices(self.entities[1])

        self.edit_permission = Permission.FULL_CONTROL
        self.patch_json = {
            "name": "asdf",
        }
        self.create_json = {
            "name": "videos",
            "dtype": "video",
            "attribute_types": create_test_attribute_types(),
        }
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class LocalizationTypeTestCase(
    TatorTransactionTest,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.media_type = MediaType.objects.create(
            name="video",
            project=self.project,
        )
        self.entities = [
            LocalizationType.objects.create(
                name="box",
                dtype="box",
                project=self.project,
                attribute_types=create_test_attribute_types(),
            ),
            LocalizationType.objects.create(
                name="line",
                dtype="line",
                project=self.project,
                attribute_types=create_test_attribute_types(),
            ),
            LocalizationType.objects.create(
                name="dot asdf",
                dtype="dot",
                project=self.project,
                attribute_types=create_test_attribute_types(),
            ),
        ]
        wait_for_indices(self.entities[0])
        wait_for_indices(self.entities[1])
        wait_for_indices(self.entities[2])
        self.list_uri = "LocalizationTypes"
        self.detail_uri = "LocalizationType"
        self.create_json = {
            "name": "box type",
            "dtype": "box",
            "media_types": [self.media_type.pk],
            "attribute_types": create_test_attribute_types(),
        }
        self.patch_json = {"name": "box asdf"}
        self.edit_permission = Permission.FULL_CONTROL
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_elemental_id(self):
        # Test on type object
        for entity_type in self.entities:
            project = entity_type.project.id
            new_uuid = str(uuid4())
            response = self.client.get(f"/rest/LocalizationTypes/{project}?elemental_id={new_uuid}")
            assert len(response.data) == 0
            response = self.client.get(f"/rest/LocalizationType/{entity_type.id}")
            assert str(response.data["elemental_id"]) == str(entity_type.elemental_id)
            response = self.client.patch(
                f"/rest/LocalizationType/{entity_type.id}",
                {"elemental_id": str(new_uuid)},
                format="json",
            )
            response = self.client.get(f"/rest/LocalizationType/{entity_type.id}")
            assert str(response.data["elemental_id"]) == new_uuid
            response = self.client.get(f"/rest/LocalizationTypes/{project}?elemental_id={new_uuid}")
            assert len(response.data) == 1


class MembershipTestCase(
    TatorTransactionTest, PermissionListMembershipTestMixin, PermissionDetailTestMixin
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entities = [
            self.membership,
        ]
        self.list_uri = "Memberships"
        self.detail_uri = "Membership"
        self.patch_json = {
            "permission": "Full Control",
        }
        self.create_json = {
            "user": self.user.pk,
            "permission": "Full Control",
        }
        self.edit_permission = Permission.FULL_CONTROL


class ProjectTestCase(TatorTransactionTest):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.entities = [create_test_project(self.user) for _ in range(random.randint(6, 10))]
        memberships = [create_test_membership(self.user, entity) for entity in self.entities]
        self.detail_uri = "Project"
        self.list_uri = "Projects"
        self.patch_json = {
            "name": "aaasdfasd",
        }
        self.create_json = {
            "name": "asdfasd",
            "summary": "asdfa summary",
            "organization": self.organization.pk,
        }
        self.edit_permission = Permission.FULL_CONTROL

        for entity in self.entities:
            memberships_to_rowp(entity.pk, force=False, verbose=False)

    def test_create_no_affiliation(self):
        endpoint = f"/rest/{self.list_uri}"
        self.affiliation.delete()
        response = self.client.post(endpoint, self.create_json, format="json")
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        self.affiliation.save()

    def test_create_permissions(self):
        endpoint = f"/rest/{self.list_uri}"
        permission_index = affiliation_levels.index("Admin")
        for index, level in enumerate(affiliation_levels):
            self.affiliation.permission = level
            self.affiliation.save()
            expected_status = (
                status.HTTP_201_CREATED if index >= permission_index else status.HTTP_403_FORBIDDEN
            )
            response = self.client.post(endpoint, self.create_json, format="json")
            assertResponse(self, response, expected_status)

    def test_detail_patch_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            from main._permission_util import shift_permission

            rp = RowProtection.objects.get(project=self.entities[0])
            orig_permission = rp.permission

            # iterate over all permission levels and change the underlying row protection object for this project
            # to a given permission level and verify that the delete endpoint respects this
            model = type(self.entities[0])
            for permission in [
                PermissionMask.OLD_READ,
                PermissionMask.OLD_WRITE,
                PermissionMask.OLD_TRANSFER,
                PermissionMask.OLD_EXECUTE,
                PermissionMask.OLD_FULL_CONTROL,
            ]:
                rp.permission = permission
                rp.save()
                if (
                    permission >> shift_permission(model, Project)
                ) & PermissionMask.MODIFY == PermissionMask.MODIFY:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                response = self.client.patch(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", self.patch_json, format="json"
                )
                assertResponse(self, response, expected_status)
            rp.permission = orig_permission
            rp.save()
        else:
            permission_index = permission_levels.index(self.edit_permission)
            for index, level in enumerate(permission_levels):
                obj = Membership.objects.filter(project=self.entities[0], user=self.user)[0]
                obj.permission = level
                obj.save()
                del obj
                if index >= permission_index:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                response = self.client.patch(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", self.patch_json, format="json"
                )
                assertResponse(self, response, expected_status)

    def test_detail_delete_permissions(self):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            from main._permission_util import shift_permission

            rp = RowProtection.objects.get(project=self.entities[0])
            orig_permission = rp.permission

            # iterate over all permission levels and change the underlying row protection object for this project
            # to a given permission level and verify that the delete endpoint respects this
            model = type(self.entities[0])
            for permission in [
                PermissionMask.OLD_READ,
                PermissionMask.OLD_WRITE,
                PermissionMask.OLD_TRANSFER,
                PermissionMask.OLD_EXECUTE,
                PermissionMask.OLD_FULL_CONTROL,
            ]:
                rp.permission = permission
                rp.save()
                if "name" in self.patch_json:
                    self.patch_json["name"] += f"_{hex(permission)}"
                if (
                    permission >> shift_permission(model, Project)
                ) & PermissionMask.MODIFY == PermissionMask.MODIFY:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                response = self.client.delete(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", format="json"
                )
                assertResponse(self, response, expected_status)
                if expected_status == status.HTTP_200_OK:
                    del self.entities[0]
            rp.delete()
        else:
            permission_index = permission_levels.index(self.edit_permission)
            for index, level in enumerate(permission_levels):
                obj = Membership.objects.filter(project=self.entities[0], user=self.user)[0]
                obj.permission = level
                obj.save()
                del obj
                if index >= permission_index:
                    expected_status = status.HTTP_200_OK
                else:
                    expected_status = status.HTTP_403_FORBIDDEN
                test_val = random.random() > 0.5
                print(f"{level} = {expected_status}")
                response = self.client.delete(
                    f"/rest/{self.detail_uri}/{self.entities[0].pk}", format="json"
                )
                assertResponse(self, response, expected_status)
                if expected_status == status.HTTP_200_OK:
                    del self.entities[0]

    def test_delete_non_creator(self):
        other_user = User.objects.create(
            username="other",
            password="user",
            first_name="other",
            last_name="user",
            email="other.user@gmail.com",
            middle_initial="A",
            initials="OAU",
        )
        create_test_membership(other_user, self.entities[0])
        self.client.force_authenticate(other_user)
        response = self.client.delete(
            f"/rest/{self.detail_uri}/{self.entities[0].pk}", format="json"
        )
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)


class TranscodeTestCase(TatorTransactionTest, PermissionCreateTestMixin):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.list_uri = "Transcodes"
        self.detail_uri = "Transcode"
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.create_json = {
            "type": self.entity_type.pk,
            "gid": str(uuid1()),
            "uid": str(uuid1()),
            "url": "http://asdf.com",
            "name": "asdf.mp4",
            "section": "asdf section",
            "md5": "",
            "size": 1,
        }
        self.edit_permission = Permission.CAN_TRANSFER
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class VersionTestCase(
    TatorTransactionTest,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.media = create_test_video(self.user, f"asdf", self.entity_type, self.project)
        self.entities = [
            create_test_version(f"asdf{idx}", f"desc{idx}", idx, self.project, self.media)
            for idx in range(random.randint(6, 10))
        ]
        self.list_uri = "Versions"
        self.detail_uri = "Version"
        self.create_json = {
            "project": self.project.pk,
            "name": "version_create_test",
            "media_id": self.media.pk,
            "description": "asdf",
        }
        self.patch_json = {
            "description": "asdf123",
        }
        self.edit_permission = Permission.CAN_EDIT
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_elemental_id(self):
        # Test on type object
        test_version = create_test_version(f"asdf", f"desc", 10, self.project, self.media)
        new_uuid = str(uuid4())
        response = self.client.get(f"/rest/Version/{test_version.pk}")
        response = self.client.patch(
            f"/rest/Version/{test_version.pk}", {"elemental_id": str(new_uuid)}, format="json"
        )
        response = self.client.get(f"/rest/Version/{test_version.pk}")
        assert str(response.data["elemental_id"]) == new_uuid

    def test_version_delete(self):
        # Verify we can delete an empty version
        test_version = create_test_version(f"My Version", f"desc", 10, self.project, self.media)
        response = self.client.get(f"/rest/Version/{test_version.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.delete(f"/rest/Version/{test_version.pk}")
        assertResponse(self, response, status.HTTP_200_OK)

        # Verify we can delete non-empty versions
        test_version = create_test_version(f"My Version", f"desc", 10, self.project, self.media)
        response = self.client.get(f"/rest/Version/{test_version.pk}")
        assertResponse(self, response, status.HTTP_200_OK)

        # Make some boxes on the version
        entity_type = LocalizationType.objects.create(
            name="boxes",
            dtype="box",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(entity_type)
        media_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        entity_type.media.add(media_entity_type)
        media = create_test_video(self.user, f"Test Video", media_entity_type, self.project)

        test_box = create_test_box(self.user, entity_type, self.project, media, 0)
        test_box.version = test_version
        test_box.save()

        # Verify we can't delete a version with a box
        response = self.client.delete(f"/rest/Version/{test_version.pk}")
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        # Delete the box and try again
        response = self.client.delete(f"/rest/Localization/{test_box.pk}")
        assertResponse(self, response, status.HTTP_200_OK)
        test_box = Localization.objects.get(pk=test_box.pk)

        # Verify we can now delete a version, as metadata is all cleared
        response = self.client.delete(f"/rest/Version/{test_version.pk}")
        assertResponse(self, response, status.HTTP_200_OK)


class FavoriteStateTestCase(
    TatorTransactionTest,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.list_uri = "Favorites"
        self.detail_uri = "Favorite"
        self.edit_permission = Permission.CAN_EDIT

        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.state_type = StateType.objects.create(
            name="states",
            dtype="state",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        wait_for_indices(self.state_type)
        self.entities = [
            create_test_favorite(
                f"Favorite {idx}", self.project, self.user, self.state_type, "State"
            )
            for idx in range(random.randint(6, 10))
        ]
        self.create_json = {
            "name": "My fave",
            "page": 1,
            "type": self.state_type.pk,
            "values": {"blah": "asdf"},
            "entity_type_name": "State",
        }
        self.patch_json = {
            "name": "New name",
        }
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class FavoriteLocalizationTestCase(
    TatorTransactionTest,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.list_uri = "Favorites"
        self.detail_uri = "Favorite"
        self.edit_permission = Permission.CAN_EDIT

        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.box_type = LocalizationType.objects.create(
            name="boxes",
            dtype="box",
            project=self.project,
        )
        self.entities = [
            create_test_favorite(
                f"Favorite {idx}", self.project, self.user, self.box_type, "Localization"
            )
            for idx in range(random.randint(6, 10))
        ]
        self.create_json = {
            "name": "My fave",
            "page": 1,
            "type": self.box_type.pk,
            "values": {"blah": "asdf"},
            "entity_type_name": "Localization",
        }
        self.patch_json = {
            "name": "New name",
        }
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class BookmarkTestCase(
    APITestCase,
    PermissionCreateTestMixin,
    PermissionListMembershipTestMixin,
    PermissionDetailMembershipTestMixin,
    PermissionDetailTestMixin,
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.entities = [
            create_test_bookmark(f"Bookmark {idx}", self.project, self.user)
            for idx in range(random.randint(6, 10))
        ]
        self.list_uri = "Bookmarks"
        self.detail_uri = "Bookmark"
        self.create_json = {
            "name": "My bookmark",
            "uri": "/projects",
        }
        self.patch_json = {
            "name": "New name",
        }
        self.edit_permission = Permission.CAN_EDIT
        memberships_to_rowp(self.project.pk, force=False, verbose=False)


class AffiliationTestCase(
    TatorTransactionTest, PermissionListAffiliationTestMixin, PermissionDetailAffiliationTestMixin
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entities = [
            create_test_affiliation(create_test_user(), self.organization) for _ in range(3)
        ]
        self.list_uri = "Affiliations"
        self.detail_uri = "Affiliation"
        self.patch_json = {
            "permission": "Member",
        }
        self.create_json = {
            "user": self.user.pk,
            "permission": "Admin",
        }
        self.edit_permission = "Admin"
        self.get_requires_admin = False

    def get_affiliation(self, organization, user):
        return Affiliation.objects.filter(organization=organization, user=user)[0]

    def get_organization(self):
        return self.organization


class OrganizationTestCase(TatorTransactionTest, PermissionDetailAffiliationTestMixin):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user(is_staff=True)
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.project = create_test_project(self.user, self.organization)
        self.membership = create_test_membership(self.user, self.project)
        self.entities = [create_test_organization() for _ in range(3)]
        affiliations = [create_test_affiliation(self.user, entity) for entity in self.entities]
        self.list_uri = "Organizations"
        self.detail_uri = "Organization"
        self.create_json = {"name": "My org"}
        self.patch_json = {"name": "My new org"}
        self.edit_permission = "Admin"
        self.get_requires_admin = False

    def get_affiliation(self, organization, user):
        return Affiliation.objects.filter(organization=organization, user=user)[0]

    def get_organization(self):
        return self.entities[0]

    def test_create(self):
        endpoint = f"/rest/{self.list_uri}"
        response = self.client.post(endpoint, self.create_json, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

    def test_default_membership(self):
        other_user = create_test_user(is_staff=False)
        other_affiliation = create_test_affiliation(other_user, self.organization)

        proj_spec = {
            "name": "Org test",
            "summary": "Auto project membership test",
            "organization": self.organization.pk,
        }
        response = self.client.post("/rest/Projects", proj_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project_id = response.data["id"]

        # Confirm project creator has full control
        self.assertEqual(
            Membership.objects.get(project=project_id, user=self.user).permission,
            Permission.FULL_CONTROL,
        )

        # Confirm `other_user` has no membership
        self.assertEqual(Membership.objects.filter(project=project_id, user=other_user).count(), 0)

        # Update default membership permission to `CAN_EXECUTE`
        patch_default_membership = {"default_membership_permission": "Can Execute"}
        endpoint = f"/rest/{self.detail_uri}/{self.organization.pk}"
        response = self.client.patch(endpoint, patch_default_membership, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Confirm project creator still has full control
        self.assertEqual(
            Membership.objects.get(project=project_id, user=self.user).permission,
            Permission.FULL_CONTROL,
        )

        # Confirm `other_user` still has no membership
        self.assertEqual(Membership.objects.filter(project=project_id, user=other_user).count(), 0)

        # Delete the test project to start over
        Project.objects.get(pk=project_id).delete()

        # Confirm project creator has full control
        response = self.client.post("/rest/Projects", proj_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project_id = response.data["id"]

        self.assertEqual(
            Membership.objects.get(project=project_id, user=self.user).permission,
            Permission.FULL_CONTROL,
        )

        # Confirm `other_user` has `CAN_EXECUTE` permission
        self.assertEqual(
            Membership.objects.get(project=project_id, user=other_user).permission,
            Permission.CAN_EXECUTE,
        )
        Project.objects.get(pk=project_id).delete()


class BucketTestCase(
    TatorTransactionTest, PermissionListAffiliationTestMixin, PermissionDetailAffiliationTestMixin
):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.entities = [create_test_bucket(self.organization) for _ in range(3)]
        self.list_uri = "Buckets"
        self.detail_uri = "Bucket"
        self.create_json = {
            "name": "my-bucket",
            "store_type": "AWS",
            "config": {
                "aws_access_key_id": "asdf",
                "aws_secret_access_key": "asdf",
                "endpoint_url": "https://asdf.com:8000",
                "region_name": "us-east-1",
            },
        }
        self.patch_json = {
            "name": "my-bucket1",
            "store_type": "AWS",
            "config": {
                "aws_access_key_id": "asdf1",
                "aws_secret_access_key": "asdf2",
                "endpoint_url": "https://asdf.com:8001",
                "region_name": "us-east-2",
            },
        }
        self.edit_permission = "Admin"
        self.get_requires_admin = True

    def get_affiliation(self, organization, user):
        return Affiliation.objects.filter(organization=organization, user=user)[0]

    def get_organization(self):
        return self.organization

    def test_create_no_affiliation(self):
        endpoint = f"/rest/{self.list_uri}/{self.organization.pk}"
        self.affiliation.delete()
        response = self.client.post(endpoint, self.create_json, format="json")
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        self.affiliation.save()


class ImageFileTestCase(TatorTransactionTest, FileMixin):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.project = create_test_project(self.user, self.organization)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.media = create_test_video(self.user, f"asdf", self.entity_type, self.project)
        self.list_uri = "ImageFiles"
        self.detail_uri = "ImageFile"
        self.create_json = {"path": self._generate_key(), "resolution": [1, 1]}
        self.patch_json = {"path": self._generate_key(), "resolution": [2, 2]}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_image(self):
        self._test_methods("image")

    def test_thumbnail(self):
        self._test_methods("thumbnail")

    def test_thumbnail_gif(self):
        self._test_methods("thumbnail_gif")


class VideoFileTestCase(TatorTransactionTest, FileMixin):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.project = create_test_project(self.user, self.organization)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.media = create_test_video(self.user, f"asdf", self.entity_type, self.project)
        self.list_uri = "VideoFiles"
        self.detail_uri = "VideoFile"
        self.create_json = {
            "path": self._generate_key(),
            "resolution": [1, 1],
            "codec": "h264",
            "segment_info": self._generate_key(),
        }
        self.patch_json = {
            "path": self._generate_key(),
            "resolution": [2, 2],
            "codec": "h264",
            "segment_info": self._generate_key(),
        }

    def test_streaming(self):
        self._test_methods("streaming")

    def test_archival(self):
        self._test_methods("archival")


class AudioFileTestCase(TatorTransactionTest, FileMixin):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.project = create_test_project(self.user, self.organization)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.media = create_test_video(self.user, f"asdf", self.entity_type, self.project)
        self.list_uri = "AudioFiles"
        self.detail_uri = "AudioFile"
        self.create_json = {"path": self._generate_key(), "codec": "h264"}
        self.patch_json = {"path": self._generate_key(), "codec": "h264"}
        memberships_to_rowp(self.project.pk, force=False, verbose=False)

    def test_audio(self):
        self._test_methods("audio")


class AuxiliaryFileTestCase(TatorTransactionTest, FileMixin):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.project = create_test_project(self.user, self.organization)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.media = create_test_video(self.user, f"asdf", self.entity_type, self.project)
        self.list_uri = "AuxiliaryFiles"
        self.detail_uri = "AuxiliaryFile"
        self.create_json = {"path": self._generate_key(), "name": "asdf1"}
        self.patch_json = {"path": self._generate_key(), "name": "asdf"}

    def test_attachment(self):
        self._test_methods("attachment")


class ResourceTestCase(TatorTransactionTest):
    MEDIA_ROLES = {
        "streaming": "VideoFiles",
        "archival": "VideoFiles",
        "audio": "AudioFiles",
        "image": "ImageFiles",
        "thumbnail": "ImageFiles",
        "thumbnail_gif": "ImageFiles",
        "attachment": "AuxiliaryFiles",
    }

    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.project = create_test_project(self.user, self.organization)
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.file_entity_type = FileType.objects.create(
            name="TestFileType",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.file_entity_type)
        self.store = get_tator_store()
        self.backup_bucket = None

    def test_elemental_id(self):
        # Test on type object
        project = self.file_entity_type.project.id
        new_uuid = str(uuid4())
        response = self.client.get(f"/rest/FileTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 0
        response = self.client.get(f"/rest/FileType/{self.file_entity_type.id}")
        assert str(response.data["elemental_id"]) == str(self.file_entity_type.elemental_id)
        response = self.client.patch(
            f"/rest/FileType/{self.file_entity_type.id}",
            {"elemental_id": str(new_uuid)},
            format="json",
        )
        response = self.client.get(f"/rest/FileType/{self.file_entity_type.id}")
        assert str(response.data["elemental_id"]) == new_uuid
        response = self.client.get(f"/rest/FileTypes/{project}?elemental_id={new_uuid}")
        assert len(response.data) == 1

    def _random_store_obj(self, media):
        """Creates an store file with random key. Simulates an upload."""
        key = f"{self.organization.pk}/{self.project.pk}/{media.pk}/{str(uuid1())}"
        self.store.put_string(key, b"\x00" + os.urandom(16) + b"\x00")
        return key

    def _random_file_store_obj(self, file):
        """Creates a store file with random key for a generic file. Simulates an upload."""
        key = f"{self.organization.pk}/{self.project.pk}/files/{file.pk}/{str(uuid1())}"
        self.store.put_string(key, b"\x00" + os.urandom(16) + b"\x00")
        return key

    def _store_obj_exists(self, key):
        """Checks whether an object in store exists."""
        return bool(self.store.head_object(key))

    def _generate_keys(self, media):
        keys = {role: self._random_store_obj(media) for role in ResourceTestCase.MEDIA_ROLES}
        segment_key = self._random_store_obj(media)
        return keys, segment_key

    def _get_media_def(self, role, keys, segment_key):
        media_def = {"path": keys[role]}
        if role == "streaming":
            media_def["resolution"] = [1, 1]
            media_def["segment_info"] = segment_key
            media_def["codec"] = "h264"
        elif role == "archival":
            media_def["resolution"] = [1, 1]
            media_def["codec"] = "h264"
        elif role == "audio":
            media_def["codec"] = "aac"
        else:
            media_def["resolution"] = [1, 1]
        return media_def

    def _prune_media(self):
        """Emulates a prunemedia operation that clears out media with null project
        IDs.
        """
        media = Media.objects.filter(deleted=True)
        for m in media:
            m.delete()

    def test_generic_files(self):
        """
        Test procedure:
        - Create File1 and patch with key1
        - Assert key1 exists
        - Create File2 and patch with key2
        - Assert key2 exists
        - Patch File1 with key3
        - Assert key3 exists.
        - Assert key1 does not exist.
        - Delete File1
        - Assert key3 does not exist.
        - Delete File2
        - Assert key2 does not exist.
        """

        file1 = create_test_file(
            name="File1", entity_type=self.file_entity_type, project=self.project, user=self.user
        )
        file2 = create_test_file(
            name="File2", entity_type=self.file_entity_type, project=self.project, user=self.user
        )

        key1 = self._random_file_store_obj(file1)
        file_patch_spec = {"path": key1}
        response = self.client.patch(f"/rest/File/{file1.id}", file_patch_spec, format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/File/{file1.id}")
        self.assertTrue(self._store_obj_exists(response.data["path"]))

        # verify retrieval via elemental_id
        response = self.client.get(
            f"/rest/Files/{file1.project.id}?elemental_id={file1.elemental_id}"
        )
        assert len(response.data) == 1
        new_uuid = uuid4()
        response = self.client.patch(
            f"/rest/File/{file1.id}", {"elemental_id": str(new_uuid)}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/Files/{file1.project.id}?elemental_id={new_uuid}")
        assert len(response.data) == 1

        key2 = self._random_file_store_obj(file2)
        file_patch_spec = {"path": key2}
        response = self.client.patch(f"/rest/File/{file2.id}", file_patch_spec, format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/File/{file2.id}")
        self.assertTrue(self._store_obj_exists(response.data["path"]))

        key3 = self._random_file_store_obj(file1)
        file_patch_spec = {"path": key3}
        response = self.client.patch(f"/rest/File/{file1.id}", file_patch_spec, format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"/rest/File/{file1.id}")
        self.assertEqual(key3, response.data["path"])
        self.assertTrue(self._store_obj_exists(response.data["path"]))
        self.assertFalse(self._store_obj_exists(key1))

        response = self.client.delete(f"/rest/File/{file1.id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertFalse(self._store_obj_exists(key3))

        response = self.client.delete(f"/rest/File/{file2.id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertFalse(self._store_obj_exists(key2))

    def test_author_change(self):
        test_file = create_test_file(
            name="File1", entity_type=self.file_entity_type, project=self.project, user=self.user
        )
        response = self.client.get(f"/rest/File/{test_file.pk}")
        assert response.data["created_by"] == self.user.pk
        response = self.client.patch(
            f"/rest/File/{test_file.pk}",
            {"user_elemental_id": self.user_two.elemental_id},
            format="json",
        )
        assert response.status_code < 400
        response = self.client.get(f"/rest/File/{test_file.pk}")
        assert response.data["created_by"] == self.user_two.pk

        response = self.client.post(
            f"/rest/Files/{self.project.pk}",
            {
                "type": self.file_entity_type.pk,
                "name": "test cross author",
                "description": "Testing changing authorship on files.",
                "attributes": {},
                "user_elemental_id": self.user_two.elemental_id,
            },
            format="json",
        )
        new_id = response.data["id"]
        response = self.client.get(f"/rest/File/{new_id}")
        assert response.data["created_by"] == self.user_two.pk

    def test_files(self):
        media = create_test_video(self.user, f"asdf", self.entity_type, self.project)

        # Post one file of each role.
        keys, segment_key = self._generate_keys(media)
        for role, endpoint in ResourceTestCase.MEDIA_ROLES.items():
            media_def = self._get_media_def(role, keys, segment_key)
            response = self.client.post(
                f"/rest/{endpoint}/{media.id}?role={role}", media_def, format="json"
            )
            assertResponse(self, response, status.HTTP_201_CREATED)

        # Patch in a new value for each role.
        patch_keys, patch_segment_key = self._generate_keys(media)
        for role, endpoint in ResourceTestCase.MEDIA_ROLES.items():
            media_def = self._get_media_def(role, patch_keys, patch_segment_key)
            response = self.client.patch(
                f"/rest/{endpoint[:-1]}/{media.id}?index=0&role={role}", media_def, format="json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertFalse(self._store_obj_exists(keys[role]))
            self.assertTrue(self._store_obj_exists(patch_keys[role]))
        self.assertFalse(self._store_obj_exists(segment_key))
        self.assertTrue(self._store_obj_exists(patch_segment_key))

        # Delete the files.
        for role, endpoint in ResourceTestCase.MEDIA_ROLES.items():
            response = self.client.delete(
                f"/rest/{endpoint[:-1]}/{media.id}?index=0&role={role}", format="json"
            )
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertFalse(self._store_obj_exists(patch_keys[role]))
        self.assertFalse(self._store_obj_exists(patch_segment_key))

    def test_clones(self):
        media = create_test_video(self.user, f"asdf", self.entity_type, self.project)

        # Post one file of each role.
        keys, segment_key = self._generate_keys(media)
        for role in ResourceTestCase.MEDIA_ROLES:
            endpoint = ResourceTestCase.MEDIA_ROLES[role]
            media_def = self._get_media_def(role, keys, segment_key)
            response = self.client.post(
                f"/rest/{endpoint}/{media.id}?role={role}", media_def, format="json"
            )
            assertResponse(self, response, status.HTTP_201_CREATED)

        # Clone the media.
        body = {
            "dest_project": self.project.pk,
            "dest_type": self.entity_type.pk,
            "dest_section": "asdf",
        }
        response = self.client.post(
            f"/rest/CloneMedia/{self.project.pk}?media_id={media.id}", body, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        clone_id = response.data["id"][0]

        # Check the list of clones matches
        response = self.client.get(f"/rest/GetClonedMedia/{media.id}")
        clone_ids = response.data["ids"]
        self.assertTrue(media.id in clone_ids)
        self.assertTrue(clone_id in clone_ids)
        self.assertEqual(len(clone_ids), 2)

        # Delete the clone.
        response = self.client.delete(f"/rest/Media/{clone_id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self._prune_media()
        for role in ResourceTestCase.MEDIA_ROLES:
            self.assertTrue(self._store_obj_exists(keys[role]))

        # Check the list of clones matches
        response = self.client.get(f"/rest/GetClonedMedia/{media.id}")
        clone_ids = response.data["ids"]
        self.assertTrue(media.id in clone_ids)
        self.assertFalse(clone_id in clone_ids)
        self.assertEqual(len(clone_ids), 1)

        # Clone the media.
        body = {
            "dest_project": self.project.pk,
            "dest_type": self.entity_type.pk,
            "dest_section": "asdf1",
        }
        response = self.client.post(
            f"/rest/CloneMedia/{self.project.pk}?media_id={media.id}", body, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        clone_id = response.data["id"][0]

        # Delete the original.
        response = self.client.delete(f"/rest/Media/{media.id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self._prune_media()
        for role in ResourceTestCase.MEDIA_ROLES:
            self.assertTrue(self._store_obj_exists(keys[role]))

        # Clone the clone.
        body = {
            "dest_project": self.project.pk,
            "dest_type": self.entity_type.pk,
            "dest_section": "asdf2",
        }
        response = self.client.post(
            f"/rest/CloneMedia/{self.project.pk}?media_id={clone_id}", body, format="json"
        )
        assertResponse(self, response, status.HTTP_201_CREATED)
        new_clone_id = response.data["id"][0]

        # Delete the first clone.
        response = self.client.delete(f"/rest/Media/{clone_id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self._prune_media()
        for role in ResourceTestCase.MEDIA_ROLES:
            self.assertTrue(self._store_obj_exists(keys[role]))

        # Delete the second clone.
        response = self.client.delete(f"/rest/Media/{new_clone_id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self._prune_media()
        for role in ResourceTestCase.MEDIA_ROLES:
            self.assertFalse(self._store_obj_exists(keys[role]))

    def test_thumbnails(self):
        # Create an image in which thumbnail is autocreated.
        image_type = MediaType.objects.create(
            name="images",
            dtype="image",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(image_type)
        body = [
            {
                "url": TEST_IMAGE,
                "type": image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        image_id = response.data["id"][0]

        # Make sure we have an image and thumbnail key.
        image = Media.objects.get(pk=image_id)
        image_key = image.media_files["image"][0]["path"]
        thumb_key = image.media_files["thumbnail"][0]["path"]

        self.assertTrue(self._store_obj_exists(image_key))
        self.assertTrue(self._store_obj_exists(thumb_key))
        self.assertEqual(Resource.objects.get(path=image_key).media.all()[0].pk, image_id)
        self.assertEqual(Resource.objects.get(path=thumb_key).media.all()[0].pk, image_id)

        # Delete the media and verify the files are gone.
        response = self.client.delete(f"/rest/Media/{image_id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self._prune_media()
        self.assertFalse(self._store_obj_exists(image_key))
        self.assertFalse(self._store_obj_exists(thumb_key))

        # Create an image with thumbnail_url included.
        body = [
            {
                "url": TEST_IMAGE,
                "thumbnail_url": TEST_IMAGE,
                "type": image_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        image_id = response.data["id"][0]

        # Make sure we have an image and thumbnail key.
        image = Media.objects.get(pk=image_id)
        image_key = image.media_files["image"][0]["path"]
        thumb_key = image.media_files["thumbnail"][0]["path"]

        self.assertTrue(self._store_obj_exists(image_key))
        self.assertTrue(self._store_obj_exists(thumb_key))
        self.assertEqual(Resource.objects.get(path=image_key).media.all()[0].pk, image_id)
        self.assertEqual(Resource.objects.get(path=thumb_key).media.all()[0].pk, image_id)

        # Delete the media and verify the files are gone.
        response = self.client.delete(f"/rest/Media/{image_id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self._prune_media()
        self.assertFalse(self._store_obj_exists(image_key))
        self.assertFalse(self._store_obj_exists(thumb_key))

        # Create a video that has thumbnails.
        body = [
            {
                "thumbnail_url": TEST_IMAGE,
                "thumbnail_gif_url": TEST_IMAGE,
                "type": self.entity_type.pk,
                "section": "asdf",
                "name": "asdf",
                "md5": "asdf",
            }
        ]
        response = self.client.post(f"/rest/Medias/{self.project.pk}", body, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)
        video_id = response.data["id"][0]

        # Make sure we have an video and thumbnail key.
        video = Media.objects.get(pk=video_id)
        thumb_key = video.media_files["thumbnail"][0]["path"]
        gif_key = video.media_files["thumbnail_gif"][0]["path"]
        self.assertTrue(self._store_obj_exists(thumb_key))
        self.assertTrue(self._store_obj_exists(gif_key))
        self.assertEqual(Resource.objects.get(path=thumb_key).media.all()[0].pk, video_id)
        self.assertEqual(Resource.objects.get(path=gif_key).media.all()[0].pk, video_id)

        # Delete the media and verify the files are gone.
        response = self.client.delete(f"/rest/Media/{video_id}", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self._prune_media()
        self.assertFalse(self._store_obj_exists(thumb_key))
        self.assertFalse(self._store_obj_exists(gif_key))

    def test_backed_up_flag(self):
        media = create_test_video(self.user, f"asdf", self.entity_type, self.project)

        # Post one file of each role.
        keys, segment_key = self._generate_keys(media)
        for role, endpoint in ResourceTestCase.MEDIA_ROLES.items():
            media_def = self._get_media_def(role, keys, segment_key)
            response = self.client.post(
                f"/rest/{endpoint}/{media.id}?role={role}", media_def, format="json"
            )
            assertResponse(self, response, status.HTTP_201_CREATED)

        # Check the value of each resource's `backed_up` flag
        for role, endpoint in ResourceTestCase.MEDIA_ROLES.items():
            media_def = self._get_media_def(role, keys, segment_key)
            self.assertFalse(Resource.objects.get(path=media_def["path"]).backed_up)

    def test_archive_state_lifecycle(self):
        media = create_test_video(self.user, f"asdf", self.entity_type, self.project)
        media_id = media.id

        # Post one file of each role.
        keys, segment_key = self._generate_keys(media)
        all_keys = list(keys.values()) + [segment_key]
        for role, endpoint in ResourceTestCase.MEDIA_ROLES.items():
            media_def = self._get_media_def(role, keys, segment_key)
            response = self.client.post(
                f"/rest/{endpoint}/{media_id}?role={role}", media_def, format="json"
            )
            assertResponse(self, response, status.HTTP_201_CREATED)

        if self.project.backup_bucket:
            # Back up the resource
            n_successful_backups = 0
            resource_qs = Resource.objects.filter(path__in=all_keys)
            projects = Project.objects.filter(backup_bucket__isnull=False)
            if self.backup_bucket:
                projects = projects.union(Projects.objects.filter(bucket__isnull=True))
            for success, resource in TatorBackupManager().backup_resources(
                projects, resource_qs, "DOMAIN"
            ):
                if success:
                    n_successful_backups += 1

            self.assertEqual(n_successful_backups, len(all_keys))

        # Check the value of the media's `archive_state` flag
        media = Media.objects.get(pk=media_id)
        self.assertEqual(media.archive_state, "live")

        # Check that none of the objects are tagged for archive yet
        for path in media.path_iterator(keys=PATH_KEYS):
            self.assertFalse(self.store.object_tagged_for_archive(path))

        # Patch the media object and put it in the `to_archive` state
        response = self.client.patch(
            f"/rest/Media/{media_id}", {"archive_state": "to_archive"}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        media = Media.objects.get(pk=media_id)
        self.assertEqual(media.archive_state, "to_archive")

        # Archive the media object
        target_state = {"archive_state": "archived", "restoration_requested": False}
        media_qs = Media.objects.filter(pk=media_id)
        update_queryset_archive_state(media_qs, target_state)
        media = Media.objects.get(pk=media_id)
        self.assertEqual(media.archive_state, "archived")
        for path in media.path_iterator(keys=PATH_KEYS):
            self.assertTrue(self.store.object_tagged_for_archive(path))

        # Patch the media object and put it in the `to_live` state
        response = self.client.patch(
            f"/rest/Media/{media_id}", {"archive_state": "to_live"}, format="json"
        )
        assertResponse(self, response, status.HTTP_200_OK)
        media = Media.objects.get(pk=media_id)
        self.assertEqual(media.archive_state, "to_live")

        # Request restoration
        target_state = {
            "archive_state": "to_live",
            "restoration_requested": True,
            "min_exp_days": 7,
        }
        media_qs = Media.objects.filter(pk=media_id)
        update_queryset_archive_state(media_qs, target_state)
        media = Media.objects.get(pk=media_id)
        self.assertEqual(media.archive_state, "to_live")
        self.assertTrue(media.restoration_requested)

        # Finish restoration
        target_state = {
            "archive_state": "live",
            "restoration_requested": False,
            "domain": "DOMAIN",
        }
        media_qs = Media.objects.filter(pk=media_id)
        update_queryset_archive_state(media_qs, target_state)
        media = Media.objects.get(pk=media_id)
        self.assertEqual(media.archive_state, "live")
        self.assertFalse(media.restoration_requested)
        for path in media.path_iterator(keys=PATH_KEYS):
            self.assertFalse(self.store.object_tagged_for_archive(path))

    def test_backup_lifecycle(self):
        media = create_test_video(self.user, f"asdf", self.entity_type, self.project)
        media_id = media.id

        # Post one file of each role.
        keys, segment_key = self._generate_keys(media)
        all_keys = list(keys.values()) + [segment_key]
        for role, endpoint in ResourceTestCase.MEDIA_ROLES.items():
            media_def = self._get_media_def(role, keys, segment_key)
            response = self.client.post(
                f"/rest/{endpoint}/{media_id}?role={role}", media_def, format="json"
            )
            assertResponse(self, response, status.HTTP_201_CREATED)

        # Check the value of each resource's `backed_up` flag is `False`
        resource_qs = Resource.objects.filter(path__in=all_keys, backed_up=False)
        self.assertEqual(resource_qs.count(), len(all_keys))

        # Back up the resource
        n_successful_backups = 0
        projects = Project.objects.filter(backup_bucket__isnull=False)
        if self.backup_bucket:
            projects = projects.union(Projects.objects.filter(bucket__isnull=True))
        for success, resource in TatorBackupManager().backup_resources(
            projects, resource_qs, "DOMAIN"
        ):
            if success:
                n_successful_backups += 1

        self.assertEqual(n_successful_backups, len(all_keys) if self.backup_bucket else 0)

        # Check the value of each resource's `backed_up` flag is `True`
        resource_qs = Resource.objects.filter(path__in=all_keys, backed_up=True)
        self.assertEqual(resource_qs.count(), len(all_keys) if self.backup_bucket else 0)

        # Check that each resource was copied to the backup bucket
        if self.backup_bucket:
            success, store_info = TatorBackupManager().get_store_info(self.project)
            self.assertTrue(success)
            success, store = TatorBackupManager.get_backup_store(store_info)
            self.assertTrue(success)
            for resource in resource_qs.iterator():
                self.assertTrue(store.check_key(resource.path))


class ResourceWithBackupTestCase(ResourceTestCase):
    """This runs the same tests as `ResourceTestCase` but adds project-specific buckets"""

    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.user_two = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.store = get_tator_store()
        self.backup_bucket = self.store.bucket
        self.project = create_test_project(
            self.user, self.organization, bucket=self.store.bucket, backup_bucket=self.store.bucket
        )
        self.membership = create_test_membership(self.user, self.project)
        self.membership_two = create_test_membership(self.user_two, self.project)
        self.entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        self.file_entity_type = FileType.objects.create(
            name="TestFileType",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.file_entity_type)


class AttributeTestCase(TatorTransactionTest):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)
        self.entity_type = LocalizationType.objects.create(
            name="boxes",
            dtype="box",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(self.entity_type)
        media_entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
        )
        self.entity_type.media.add(media_entity_type)
        self.media_entities = [
            create_test_video(self.user, f"asdf{idx}", media_entity_type, self.project)
            for idx in range(random.randint(3, 10))
        ]
        self.entities = [
            create_test_box_with_attributes(
                self.user,
                self.entity_type,
                self.project,
                random.choice(self.media_entities),
                0,
                {"Int Test": random.randint(-100, 100)},
            )
            for _ in range(random.randint(6, 10))
        ]
        self.list_uri = "AttributeType"
        self.edit_permission = Permission.FULL_CONTROL
        self.patch_json = {
            "entity_type": "LocalizationType",
            "current_name": "Int Test",
            "attribute_type_update": {
                "name": "Renamed Int Test",
                "dtype": "float",
            },
        }
        self.post_json = {
            "entity_type": "LocalizationType",
            "addition": {
                "name": "added integer",
                "dtype": "int",
                "default": 0,
                "minimum": -1,
                "maximum": 1,
            },
        }
        self.delete_json = {
            "entity_type": "LocalizationType",
            "name": "Int Test",
        }

    def test_patch_permissions(self):
        permission_index = permission_levels.index(self.edit_permission)
        for index, level in enumerate(permission_levels):
            self.membership.permission = level
            self.membership.save()
            if index >= permission_index:
                expected_status = status.HTTP_200_OK
            else:
                expected_status = status.HTTP_403_FORBIDDEN
            response = self.client.patch(
                f"/rest/{self.list_uri}/{self.entity_type.pk}", self.patch_json, format="json"
            )
            with self.subTest(i=index):
                assertResponse(self, response, expected_status)
        self.membership.permission = Permission.FULL_CONTROL
        self.membership.save()

    def test_post_permissions(self):
        permission_index = permission_levels.index(self.edit_permission)
        for index, level in enumerate(permission_levels):
            self.membership.permission = level
            self.membership.save()
            if index >= permission_index:
                expected_status = status.HTTP_201_CREATED
            else:
                expected_status = status.HTTP_403_FORBIDDEN
            response = self.client.post(
                f"/rest/{self.list_uri}/{self.entity_type.pk}", self.post_json, format="json"
            )
            with self.subTest(i=index):
                assertResponse(self, response, expected_status)
        self.membership.permission = Permission.FULL_CONTROL
        self.membership.save()

    def test_delete_permissions(self):
        permission_index = permission_levels.index(self.edit_permission)
        for index, level in enumerate(permission_levels):
            self.membership.permission = level
            self.membership.save()
            if index >= permission_index:
                expected_status = status.HTTP_200_OK
            else:
                expected_status = status.HTTP_403_FORBIDDEN
            response = self.client.delete(
                f"/rest/{self.list_uri}/{self.entity_type.pk}", self.delete_json, format="json"
            )
            with self.subTest(i=index):
                assertResponse(self, response, expected_status)
        self.membership.permission = Permission.FULL_CONTROL
        self.membership.save()


class MutateAliasTestCase(TatorTransactionTest):
    """Tests alias mutation."""

    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.search = TatorSearch()

    def _setup(self):
        project = create_test_project(self.user)
        entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(entity_type)
        entity = create_test_video(self.user, "test.mp4", entity_type, project)
        return project, entity_type, entity

    def _convert_value(self, dtype, value):
        if dtype == "bool":
            converted = str(bool(value)).lower()
        elif dtype == "int":
            converted = int(value)
            if converted < 0:
                converted = f"\\{converted}"
            else:
                converted = str(converted)
        elif dtype == "float":
            converted = f"[{float(value) - 0.0001} TO {float(value) + 0.0001}]"
        elif dtype == "datetime":
            converted = f'"{value.isoformat()}"'
        else:
            converted = str(value)
            if isinstance(value, bool):
                converted = converted.lower()
            elif isinstance(value, datetime.datetime):
                converted = f'"{value.isoformat()}"'
            elif isinstance(value, int):
                converted = re.sub("^-", "\\-", converted)
        return converted

    def _test_mutation(self, from_dtype, to_dtype, attr_name, search_name, value):
        project, entity_type, entity = self._setup()
        transaction.commit()  # clear prior lives from transaction locks
        attribute = None
        for attribute_obj in entity_type.attribute_types:
            if attribute_obj["name"] == attr_name:
                attribute = {**attribute_obj}

        found_it = False
        for i in range(300):
            if TatorSearch().is_index_present(entity_type, attribute) == True:
                found_it = True
                break
            time.sleep(1)

        assert found_it

        entity_type = self.search.mutate_alias(
            entity_type, attr_name, {"name": attr_name, "dtype": to_dtype}, "update"
        )
        entity_type.save()
        time.sleep(1)
        element = None
        for attribute_obj in entity_type.attribute_types:
            if attribute_obj["name"] == attr_name:
                element = {**attribute_obj}

        found_it = False
        for i in range(300):
            transaction.commit()
            if TatorSearch().is_index_present(entity_type, element) == True:
                found_it = True
                break
            time.sleep(1)

        assert found_it
        project.delete()
        logger.info(f"Conversion of {from_dtype} to {to_dtype} success!")

    def test_all_mutations(self):
        for index, new_dtype in enumerate(ALLOWED_MUTATIONS["bool"]):
            value = random.choice([True, False])
            with self.subTest(i=index):
                self._test_mutation("bool", new_dtype, "Bool Test", "Bool\\ Test", value)

        for index, new_dtype in enumerate(ALLOWED_MUTATIONS["int"]):
            value = random.randint(-100, 100)
            with self.subTest(i=index):
                self._test_mutation("int", new_dtype, "Int Test", "Int\\ Test", value)

        for index, new_dtype in enumerate(ALLOWED_MUTATIONS["float"]):
            value = random.uniform(0, 1000)
            with self.subTest(i=index):
                self._test_mutation("float", new_dtype, "Float Test", "Float\\ Test", value)

        for index, new_dtype in enumerate(ALLOWED_MUTATIONS["enum"]):
            value = random_string(10)
            with self.subTest(i=index):
                self._test_mutation("enum", new_dtype, "Enum Test", "Enum\\ Test", value)

        for index, new_dtype in enumerate(ALLOWED_MUTATIONS["string"]):
            value = random_string(10)
            with self.subTest(i=index):
                self._test_mutation("string", new_dtype, "String Test", "String\\ Test", value)

        for index, new_dtype in enumerate(ALLOWED_MUTATIONS["datetime"]):
            value = datetime.datetime.now()
            with self.subTest(i=index):
                self._test_mutation(
                    "datetime", new_dtype, "Datetime Test", "Datetime\\ Test", value
                )

    def test_update_replace_behavior(self):
        project, entity_type, entity = self._setup()
        entity_type_id = entity_type.id

        # Copy the attribute type definitions before modification
        attribute_types = [(at["name"], at.copy()) for at in entity_type.attribute_types]

        for attr_name, attr_type in attribute_types:
            # Make a copy of the attribute type and remove a random field that isn't required
            attribute_type_update = attr_type.copy()
            fields = [
                key
                for key in attribute_type_update.keys()
                if key not in ["name", "dtype", "choices"]
            ]
            key_to_remove = random.choice(fields)
            attribute_type_update.pop(key_to_remove)

            # Perform an update, check that no fields were removed
            self.search.mutate_alias(entity_type, attr_name, attribute_type_update, "update").save()
            entity_type = MediaType.objects.get(pk=entity_type_id)

            key_found = False
            def_found = None
            for at in entity_type.attribute_types:
                if at["name"] == attr_name:
                    key_found = key_to_remove in at
                    def_found = at
                    break

            self.assertTrue(key_found)
            self.assertEqual(def_found, attr_type)

            # Perform a replace, check that no fields were removed
            self.search.mutate_alias(
                entity_type, attr_name, attribute_type_update, "replace"
            ).save()
            entity_type = MediaType.objects.get(pk=entity_type_id)

            key_found = True
            def_found = None
            for at in entity_type.attribute_types:
                if at["name"] == attr_name:
                    key_found = key_to_remove in at
                    break

            self.assertFalse(key_found)

    # TODO: write totally different test for geopos mutations (not supported in query string queries)


class JobClusterTestCase(TatorTransactionTest):
    @staticmethod
    def _random_job_cluster_spec():
        uid = str(uuid1())
        return {
            "name": f"Job Cluster {uid}",
            "host": "test-host",
            "port": random.randint(4000, 6000),
            "token": uid,
            "cert": f"{uid}.cert",
        }

    def get_affiliation(self, organization, user):
        return Affiliation.objects.filter(organization=organization, user=user)[0]

    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.list_uri = "JobClusters"
        self.detail_uri = "JobCluster"
        self.create_json = self._random_job_cluster_spec()
        self.entity = JobCluster(organization=self.organization, **self.create_json)
        self.entity.save()

    def test_list_is_an_admin_permissions(self):
        url = f"/rest/{self.list_uri}/{self.organization.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_200_OK)

    def test_list_no_affiliation_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        affiliation.delete()
        url = f"/rest/{self.list_uri}/{self.organization.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.save()

    def test_list_is_a_member_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        old_permission = affiliation.permission
        affiliation.permission = "Member"
        affiliation.save()
        url = f"/rest/{self.list_uri}/{self.organization.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.permission = old_permission
        affiliation.save()

    def test_detail_is_an_admin_permissions(self):
        url = f"/rest/{self.detail_uri}/{self.entity.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_200_OK)

    def test_detail_no_affiliation_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        affiliation.delete()
        url = f"/rest/{self.detail_uri}/{self.entity.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.save()

    def test_detail_is_a_member_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        old_permission = affiliation.permission
        affiliation.permission = "Member"
        affiliation.save()
        url = f"/rest/{self.detail_uri}/{self.entity.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.permission = old_permission
        affiliation.save()


class HostedTemplateTestCase(TatorTransactionTest):
    @staticmethod
    def _hosted_template_spec():
        uid = str(uuid1())
        return {
            "name": f"Hosted template {uid}",
            "url": "https://raw.githubusercontent.com/cvisionai/tator/main/doc/examples/workflow_template/echo.yaml",
            "headers": {},
            "tparams": {"message": "This is a test."},
        }

    def get_affiliation(self, organization, user):
        return Affiliation.objects.filter(organization=organization, user=user)[0]

    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.organization = create_test_organization()
        self.affiliation = create_test_affiliation(self.user, self.organization)
        self.list_uri = "HostedTemplates"
        self.detail_uri = "HostedTemplate"
        self.create_json = self._hosted_template_spec()
        self.entity = HostedTemplate(organization=self.organization, **self.create_json)
        self.entity.save()

    def test_list_is_an_admin_permissions(self):
        url = f"/rest/{self.list_uri}/{self.organization.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_200_OK)

    def test_list_no_affiliation_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        affiliation.delete()
        url = f"/rest/{self.list_uri}/{self.organization.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.save()

    def test_list_is_a_member_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        old_permission = affiliation.permission
        affiliation.permission = "Member"
        affiliation.save()
        url = f"/rest/{self.list_uri}/{self.organization.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.permission = old_permission
        affiliation.save()

    def test_detail_is_an_admin_permissions(self):
        url = f"/rest/{self.detail_uri}/{self.entity.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_200_OK)

    def test_detail_no_affiliation_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        affiliation.delete()
        url = f"/rest/{self.detail_uri}/{self.entity.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.save()

    def test_detail_is_a_member_permissions(self):
        affiliation = self.get_affiliation(self.organization, self.user)
        old_permission = affiliation.permission
        affiliation.permission = "Member"
        affiliation.save()
        url = f"/rest/{self.detail_uri}/{self.entity.pk}"
        response = self.client.get(url)
        assertResponse(self, response, status.HTTP_403_FORBIDDEN)
        affiliation.permission = old_permission
        affiliation.save()


class UsernameTestCase(TatorTransactionTest):
    def setUp(self):
        self.list_uri = "Users"
        self.detail_uri = "User"

    def test_strip_whitespace_on_creation(self):
        username = "   Hodor     "
        user = create_test_user(username=username)

        # The stored username should not have surrounding whitespace
        self.assertEqual(user.username, username.strip())

    def test_list_case_insensitive_username(self):
        username = "HoDoR"
        user = create_test_user(username=username)
        self.client.force_authenticate(user)

        # The stored username should match the original capitalization
        self.assertEqual(user.username, username)

        for name in ["HoDoR", "hodor", "HODOR", "hOdOr"]:
            url = f"/rest/{self.list_uri}?username={name}"
            response = self.client.get(url)
            assertResponse(self, response, status.HTTP_200_OK)
            self.assertEqual(len(response.data), 1)
            self.assertEqual(response.data[0]["username"], username)

    def test_create_case_insensitive_username(self):
        username = "TYRION"
        user = create_test_user(username=username)
        user_spec = {
            "username": username.lower(),
            "first_name": "Tyrion",
            "last_name": "Lannister",
            "email": "tl@cvisionai.com",
            "password": "idrinkandiknowthings",
        }
        url = f"/rest/{self.list_uri}"
        response = self.client.post(url, user_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SectionTestCase(TatorTransactionTest):
    def setUp(self):
        print(f"\n{self.__class__.__name__}=", end="", flush=True)
        logging.disable(logging.CRITICAL)
        self.user = create_test_user()
        self.client.force_authenticate(self.user)
        self.project = create_test_project(self.user)
        self.membership = create_test_membership(self.user, self.project)

    def test_unique_section_name(self):
        section_spec = {
            "name": "Winterfell summer vacation photos",
            "tator_user_sections": uuid.uuid4(),
        }
        url = f"/rest/Sections/{self.project.pk}"
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        # Verify section with the same name can't be created.
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

        section_spec = {
            "name": "Twin Pines Mall",
            "tator_user_sections": uuid.uuid4(),
            "path": "California.Hill_Valley",
        }
        url = f"/rest/Sections/{self.project.pk}"
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        section_spec = {
            "name": "Lone Pine Mall",
            "tator_user_sections": uuid.uuid4(),
            "path": "California.Hill_Valley",
        }
        # Verify section with the same path can't be created.
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_400_BAD_REQUEST)

    def test_section_lookup(self):
        section_spec = {
            "name": "Honda Civic EX-L",
            "tator_user_sections": uuid.uuid4(),
            "path": "Honda.Civic.EX-L",
        }
        url = f"/rest/Sections/{self.project.pk}"
        response = self.client.post(url, section_spec, format="json")

        assertResponse(self, response, status.HTTP_201_CREATED)

        ###################################################################
        # Make a bunch of test data
        ###################################################################
        # Honda
        #   - Accord
        #       + Sport
        #       + EX-L
        #   - Civic
        #       + Sport
        #       + EX-L
        #   - CR-V
        #       + Sport-L
        # Ford
        #   - Mustang
        ###################################################################

        section_spec = {
            "name": "Honda Accord EX-L",
            "tator_user_sections": uuid.uuid4(),
            "path": "Honda.Accord.EX-L",
        }
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        section_spec = {
            "name": "Honda Civic Sport",
            "tator_user_sections": uuid.uuid4(),
            "path": "Honda.Civic.Sport",
        }
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        section_spec = {
            "name": "Honda Accord Sport",
            "tator_user_sections": uuid.uuid4(),
            "path": "Honda.Accord.Sport",
        }
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        section_spec = {
            "name": "Honda CR-V Sport-L",
            "tator_user_sections": uuid.uuid4(),
            "path": "Honda.CR-V.Sport-L",
        }
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        section_spec = {
            "name": "Ford Mustang",
            "tator_user_sections": uuid.uuid4(),
            "path": "Ford.Mustang",
        }
        response = self.client.post(url, section_spec, format="json")
        assertResponse(self, response, status.HTTP_201_CREATED)

        #####################################
        ## Query the test data
        ######################################

        section_spec = {
            "name": "Ford Mustang",
            "tator_user_sections": uuid.uuid4(),
            "path": "Ford.Mustang",
        }
        response = self.client.get(f"{url}?match=Ford.Mustang", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        response = self.client.get(f"{url}?match=Tesla.Model3", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Match all Hondas
        response = self.client.get(f"{url}?match=Honda.*", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 5)

        # Match all Hondas with EX-L trims
        response = self.client.get(f"{url}?match=Honda.*.EX_L", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        response = self.client.get(f"{url}?ancestors=Honda.Accord", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        response = self.client.get(f"{url}?descendants=Honda.Accord", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Move sections (Honda.Accord.*) to (Honda.Prologue.*)
        response = self.client.get(f"{url}?descendants=Honda.Prologue", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        move_spec = {"path_substitution": {"old": "Honda.Accord", "new": "Honda.Prologue"}}
        response = self.client.patch(f"{url}?descendants=Honda.Accord", move_spec, format="json")
        assertResponse(self, response, status.HTTP_200_OK)

        response = self.client.get(f"{url}?descendants=Honda.Accord", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        response = self.client.get(f"{url}?descendants=Honda.Prologue", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Delete section by path
        response = self.client.delete(f"{url}?descendants=Honda.Prologue", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        response = self.client.get(f"{url}?descendants=Honda.Prologue", format="json")
        assertResponse(self, response, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_adv_sections(self):
        """
        Test case for performing advanced section operations.

        This test creates a media type, a section, and performs various operations on the section.
        It verifies the creation, retrieval, modification, and search functionality of sections.
        """
        entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )
        wait_for_indices(entity_type)
        media = create_test_video(self.user, "test.mp4", entity_type, self.project)
        section_spec = {
            "name": "Test",
            "path": "Foo.Test",
            "explicit_listing": True,
            "media": [media.pk],
        }
        url = f"/rest/Sections/{self.project.pk}"
        response = self.client.post(url, section_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        section_id = response.data["id"]
        url = f"/rest/Section/{section_id}"

        def check_it(section, section_spec):
            self.assertEqual(section["name"], section_spec["name"])
            self.assertEqual(section["path"], section_spec["path"])
            self.assertEqual(section["explicit_listing"], section_spec["explicit_listing"])
            self.assertEqual(section["media"], section_spec["media"])
            self.assertEqual(section["created_by"], self.user.pk)

        # Test that the section is returned as it was setup
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        check_it(response.data, section_spec)

        # Test it out via list accessor too
        url = f"/rest/Sections/{self.project.pk}"
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        section_match = [s for s in response.data if s["id"] == section_id]
        check_it(section_match[0], section_spec)

        # Verify adding a section with bad attributes fails
        section_spec = {
            "name": "Test",
            "path": "Foo.Test",
            "explicit_listing": True,
            "media": [],
            "attributes": {"abcdef": False},
        }
        url = f"/rest/Sections/{self.project.pk}"
        response = self.client.post(url, section_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify patching a section with bad attributes fails
        update_spec = {"attributes": {"abcdef": False}}
        url = f"/rest/Section/{section_id}"
        response = self.client.patch(url, update_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Add a string attribute to the section
        add_string_spec = {
            "entity_type": "Section",
            "addition": {"name": "String Attribute", "dtype": "string"},
        }
        url = f"/rest/AttributeType/{self.project.pk}"
        response = self.client.post(url, add_string_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check project response has attribute_type return
        url = f"/rest/Project/{self.project.pk}"
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["attribute_types"]), 1)
        serv_resp = response.data["attribute_types"][0]
        self.assertEqual(serv_resp["name"], "String Attribute")
        self.assertEqual(serv_resp["dtype"], "string")

        # Verify we can post a string to the section
        update_spec = {"attributes": {"String Attribute": "foo"}}
        url = f"/rest/Section/{section_id}"
        response = self.client.patch(url, update_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        search_blob = base64.b64encode(
            json.dumps(
                {"attribute": "String Attribute", "operation": "eq", "value": "zoo"}
            ).encode()
        )

        url = f"/rest/Sections/{self.project.pk}?encoded_search={search_blob.decode()}"
        response = self.client.get(url, format="json")
        self.assertEqual(len(response.data), 0)

        search_blob = base64.b64encode(
            json.dumps(
                {"attribute": "String Attribute", "operation": "eq", "value": "foo"}
            ).encode()
        )

        url = f"/rest/Sections/{self.project.pk}?encoded_search={search_blob.decode()}"
        response = self.client.get(url, format="json")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], section_id)

        search_blob = base64.b64encode(
            json.dumps(
                {"attribute": "String Attribute", "operation": "in", "value": ["foo", "zoo", "abc"]}
            ).encode()
        )

        url = f"/rest/Sections/{self.project.pk}?encoded_search={search_blob.decode()}"
        response = self.client.get(url, format="json")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], section_id)

        # Verify deletion of the section attribute
        delete_string_spec = {"entity_type": "Section", "name": "String Attribute"}
        url = f"/rest/AttributeType/{self.project.pk}"
        response = self.client.delete(url, delete_string_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify resultset on old search is now 0
        url = f"/rest/Sections/{self.project.pk}?encoded_search={search_blob.decode()}"
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # Verify search by blob
        add_blob_spec = {
            "entity_type": "Section",
            "addition": {"name": "Blob Attribute", "dtype": "blob"},
        }
        url = f"/rest/AttributeType/{self.project.pk}"
        response = self.client.post(url, add_blob_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Here is >2kb of  public domain text. It's a story about a delightful bear named Winnie The Pooh,  written in 1926 by A.A. Milne.
        winnie_the_pooh = """
        If you happen to have read another book about Christopher Robin, you may remember that he once had a swan (or the swan had Christopher Robin, I don't know which) and that he used to call this swan Pooh. That was a long time ago, and when we said good-bye, we took the name with us, as we didn't think the swan would want it any more. Well, when Edward Bear said that he would like an exciting name all to himself, Christopher Robin said at once, without stopping to think, that he was Winnie-the-Pooh. And he was. So, as I have explained the Pooh part, I will now explain the rest of it.

        You can't be in London for long without going to the Zoo. There are some people who begin the Zoo at the beginning, called WAYIN, and walk as quickly as they can past every cage until they get to the one called WAYOUT, but the nicest people go straight to the animal they love the most, and stay there. So when Christopher Robin goes to the Zoo, he goes to where the Polar Bears are, and he whispers something to the third keeper from the left, and doors are unlocked, and we wander through dark passages and up steep stairs, until at last we come to the special cage, and the cage is opened, and out trots something brown and furry, and with a happy cry of "Oh, Bear!" Christopher Robin rushes into its arms. Now this bear's name is Winnie, which shows what a good name for bears it is, but the funny thing is that we can't remember whether Winnie is called after Pooh, or Pooh after Winnie. We did know once, but we have forgotten....

        I had written as far as this when Piglet looked up and said in his squeaky voice, "What about Me?" "My dear Piglet," I said, "the whole book is about you." "So it is about Pooh," he squeaked. You see what it is. He is jealous because he thinks Pooh is having a Grand Introduction all to himself. Pooh is the favourite, of course, there's no denying it, but Piglet comes in for a good many things which Pooh misses; because you can't take Pooh to school without everybody knowing it, but Piglet is so small that he slips into a pocket, where it is very comforting to feel him when you are not quite sure whether twice seven is twelve or twenty-two. Sometimes he slips out and has a good look in the ink-pot, and in this way he has got more education than Pooh, but Pooh doesn't mind. Some have brains, and some haven't, he says, and there it is.

        And now all the others are saying, "What about Us?" So perhaps the best thing to do is to stop writing Introductions and get on with the book.

        Here is Edward Bear, coming downstairs now, bump, bump, bump, on the back of his head, behind Christopher Robin. It is, as far as he knows, the only way of coming downstairs, but sometimes he feels that there really is another way, if only he could stop bumping for a moment and think of it. And then he feels that perhaps there isn't. Anyhow, here he is at the bottom, and ready to be introduced to you. Winnie-the-Pooh.

        When I first heard his name, I said, just as you are going to say, "But I thought he was a boy?"

        "So did I," said Christopher Robin.

        "Then you can't call him Winnie?"

        "I don't."

        "But you said——"

        "He's Winnie-ther-Pooh. Don't you know what 'ther' means?"

        "Ah, yes, now I do," I said quickly; and I hope you do too, because it is all the explanation you are going to get.

        Sometimes Winnie-the-Pooh likes a game of some sort when he comes downstairs, and sometimes he likes to sit quietly in front of the fire and listen to a story. This evening——

        "What about a story?" said Christopher Robin.

        "What about a story?" I said.

        "Could you very sweetly tell Winnie-the-Pooh one?"

        "I suppose I could," I said. "What sort of stories does he like?"

        "About himself. Because he's that sort of Bear."

        "Oh, I see."

        "So could you very sweetly?"

        "I'll try," I said.

        So I tried.

        Once upon a time, a very long time ago now, about last Friday, Winnie-the-Pooh lived in a forest all by himself under the name of Sanders.

        ("What does 'under the name' mean?" asked Christopher Robin.

        "It means he had the name over the door in gold letters, and lived under it."

        "Winnie-the-Pooh wasn't quite sure," said Christopher Robin.

        "Now I am," said a growly voice.

        "Then I will go on," said I.)

        One day when he was out walking, he came to an open place in the middle of the forest, and in the middle of this place was a large oak-tree, and, from the top of the tree, there came a loud buzzing-noise.
        """

        update_spec = {"attributes": {"Blob Attribute": winnie_the_pooh}}
        url = f"/rest/Section/{section_id}"
        response = self.client.patch(url, update_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        url = f"/rest/Sections/{self.project.pk}"
        search_blob = base64.b64encode(
            json.dumps(
                {"attribute": "Blob Attribute", "operation": "icontains", "value": "6c821fd7bb25"}
            ).encode()
        )
        response = self.client.get(f"{url}?encoded_search={search_blob.decode()}", format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        search_blob = base64.b64encode(
            json.dumps(
                {
                    "attribute": "Blob Attribute",
                    "operation": "icontains",
                    "value": "Winnie-The-Pooh",
                }
            ).encode()
        )
        response = self.client.get(f"{url}?encoded_search={search_blob.decode()}", format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_multi_section_lookup(self):
        """
        Test case for performing a multi-section lookup.

        This test creates a media type, multiple sections, and multiple media objects.
        It then performs a multi-section lookup and asserts that the response contains
        the expected number of media objects.
        """
        entity_type = MediaType.objects.create(
            name="video",
            dtype="video",
            project=self.project,
            attribute_types=[
                *create_test_attribute_types(),
                dict(
                    name="Test Blob",
                    dtype="blob",
                    default="",
                ),
            ],
        )
        wait_for_indices(entity_type)

        lms = []
        for r in range(5):
            media = create_test_video(self.user, f"test{r}.mp4", entity_type, self.project)
            lms.append(media)

        sect_ids = []
        for r in range(5):
            section_spec = {
                "name": f"Test{r}",
                "path": f"Foo.Test{r}",
                "explicit_listing": True,
                "media": [lms[r].id],
            }
            url = f"/rest/Sections/{self.project.pk}"
            response = self.client.post(url, section_spec, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            sect_ids.append(response.data["id"])

        sect_id_strs = [str(i) for i in sect_ids]
        for x in range(4):
            sect_ids_str = ",".join(sect_id_strs[x:])
            url = f"/rest/Medias/{self.project.pk}?multi_section={sect_ids_str}"
            response = self.client.get(url, format="json")
            self.assertEqual(len(response.data), 5 - x)

        # Test a blob attribute
        url = f"/rest/Media/{lms[0].id}"
        update_spec = {"attributes": {"Test Blob": "foo"}}
        response = self.client.patch(url, update_spec, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["attributes"]["Test Blob"], "foo")


class AdvancedPermissionTestCase(TatorTransactionTest):
    def setUp(self):
        # Add 9 users
        names = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Hank", "Ivy"]
        self.users = [create_test_user(is_staff=False, username=name) for name in names]

        self.random_user = create_test_user(is_staff=False, username="Outsider")

        groups = ["Admin", "Member", "Guest"]
        self.groups = [create_test_group(name) for name in groups]

        self.organization = create_test_organization()
        print(f"Organization is {self.organization.pk}")

        # Add the users to the organization
        for user in self.users:
            Affiliation.objects.create(
                user=user, organization=self.organization, permission="Member"
            )

        self.admin_users = [u.pk for u in self.users[:3]]
        self.member_users = [u.pk for u in self.users[3:6]]
        self.guest_users = [u.pk for u in self.users[6:]]

        # Add the first 3 users to the Admin group
        for user in self.admin_users:
            gm = GroupMembership.objects.create(
                user=User.objects.get(pk=user), group=self.groups[0]
            )

        # Add the middle 3 users to the Member group
        for user in self.member_users:
            gm = GroupMembership.objects.create(
                user=User.objects.get(pk=user), group=self.groups[1]
            )

        # Add the last 3 users to the Guest group
        for user in self.guest_users:
            gm = GroupMembership.objects.create(
                user=User.objects.get(pk=user), group=self.groups[2]
            )

        self.project = create_test_project(self.users[0])

        # Make a bunch of test data (media + localizations)
        self.video_type = MediaType.objects.create(
            name="video", dtype="video", project=self.project
        )

        self.box_type = LocalizationType.objects.create(
            name="boxes",
            dtype="box",
            project=self.project,
        )

        self.file_entity_type = FileType.objects.create(
            name="TestFileType",
            project=self.project,
            attribute_types=create_test_attribute_types(),
        )

        self.baseline_version = create_test_version("baseline", "", 0, self.project, None)
        self.readonly_version = create_test_version("readonly", "", 0, self.project, None)

        # create test videos
        self.videos = [
            create_test_video(self.users[0], f"test{idx}.mp4", self.video_type, self.project)
            for idx in range(20)
        ]

        # create a 2 sections
        self.public_section = Section.objects.create(
            name="Public",
            path="Public",
            explicit_listing=True,
            project=self.project,
        )

        self.private_section = Section.objects.create(
            name="Private",
            path="Private",
            explicit_listing=True,
            project=self.project,
        )

        self.total_media = [v.pk for v in self.videos]
        self.public_media = [v.pk for v in self.videos[:3]]
        self.private_media = [v.pk for v in self.videos[3:6]]

        for media in self.videos[:3]:
            self.public_section.media.add(media)
            self.public_section.save()
            media.primary_section = self.public_section
            media.save()

        for media in self.videos[3:6]:
            self.private_section.media.add(media)
            self.private_section.save()
            media.primary_section = self.private_section
            media.save()

        # create a bunch of boxes
        for video in self.videos:
            version = self.baseline_version
            for idx in range(10):
                # Add every other box in the public section to the read-only version
                if (
                    video.primary_section
                    and video.primary_section.pk == self.public_section.pk
                    and idx % 2 == 0
                ):
                    version = self.readonly_version
                create_test_box(self.users[0], self.box_type, self.project, video, idx)

        # Make some files
        self.files = [
            create_test_file(f"test_{idx}.txt", self.file_entity_type, self.project, self.users[0])
            for idx in range(20)
        ]

        self.public_algo = create_test_algorithm(self.users[0], "public_algo", self.project)
        self.private_algo = create_test_algorithm(self.users[0], "private_algo", self.project)
        self.unspecified_algo = create_test_algorithm(
            self.users[0], "unspecified_algo", self.project
        )

    def test_permission_augmentation(self):
        from main._permission_util import augment_permission

        """This test will verify permissions get augmented correctly using the augment routine"""

        # Add exist permission to all members of the organization for the project for project,section+media
        rp = RowProtection.objects.create(
            organization=self.organization, project=self.project, permission=0x00010101
        )

        # Add full permissions to the Admin group (project-wide)
        rp = RowProtection.objects.create(
            group=self.groups[0], project=self.project, permission=0xFFFFFFFF
        )

        # Add read/write permissions to the member group to public/private but not whole project
        # They can modify media / localizations but not the sections themselves
        rp = RowProtection.objects.create(
            group=self.groups[1], section=self.public_section, permission=0x0F0F03
        )
        rp = RowProtection.objects.create(
            group=self.groups[1], section=self.private_section, permission=0x0F0F03
        )

        # Add read-only permissions to the guest group for the public section
        rp = RowProtection.objects.create(
            group=self.groups[2], section=self.public_section, permission=0x030303
        )

        # Add read-only permissions to members to the read-only version
        rp = RowProtection.objects.create(
            group=self.groups[1], version=self.readonly_version, permission=0x0303
        )

        # Give member group read/write permissions to all files
        for f in self.files:
            rp = RowProtection.objects.create(group=self.groups[1], file=f, permission=0xFF)

        # Add some algo permissions
        # Allow anyone in the org to see + use the public algo
        rp = RowProtection.objects.create(
            algorithm=self.public_algo, organization=self.organization, permission=0xFF
        )
        # Allow admin + member users to see + use the private algo
        rp = RowProtection.objects.create(
            algorithm=self.private_algo, group=self.groups[1], permission=0xFF
        )
        rp = RowProtection.objects.create(
            algorithm=self.private_algo, group=self.groups[0], permission=0xFF
        )

        # Check random user has no permissions
        media_qs = Media.objects.filter(pk__in=[media.pk for media in self.videos])
        media_qs = augment_permission(self.random_user, media_qs)
        assert media_qs.filter(effective_permission__gte=0x1).exists() == False

        section_qs = Section.objects.filter(
            pk__in=[self.public_section.pk, self.private_section.pk]
        )
        section_qs = augment_permission(self.random_user, section_qs)
        assert section_qs.filter(effective_permission__gte=0x1).exists() == False

        localization_qs = Localization.objects.filter(project=self.project)
        localization_qs = augment_permission(self.random_user, localization_qs)
        assert localization_qs.filter(effective_permission__gte=0x1).exists() == False

        file_qs = File.objects.filter(pk__in=[file.pk for file in self.files])
        file_qs = augment_permission(self.random_user, file_qs)
        assert file_qs.filter(effective_permission__gte=0x1).exists() == False

        algorithm_qs = Algorithm.objects.filter(
            pk__in=[
                algo.pk for algo in [self.public_algo, self.private_algo, self.unspecified_algo]
            ]
        )
        algorithm_qs = augment_permission(self.random_user, algorithm_qs)
        assert algorithm_qs.filter(effective_permission__gte=0x1).exists() == False

        # Verify project permissions are correct
        project_qs = Project.objects.filter(pk=self.project.pk)
        project_qs = augment_permission(self.random_user, project_qs)
        assert project_qs[0].effective_permission == 0x0

        # Augment the permissions for each user, and test each media, section, localization, and version
        for user in self.users:
            project_qs = Project.objects.filter(pk=self.project.pk)
            project_qs = augment_permission(user, project_qs)
            if user.pk in self.admin_users:
                assert project_qs[0].effective_permission == 0xFFFFFFFF
            else:
                assert project_qs[0].effective_permission == 0x010101

            public_algo_qs = Algorithm.objects.filter(pk=self.public_algo.pk)
            public_algo_qs = augment_permission(user, public_algo_qs)
            assert public_algo_qs[0].effective_permission == 0xFF

            private_algo_qs = Algorithm.objects.filter(pk=self.private_algo.pk)
            private_algo_qs = augment_permission(user, private_algo_qs)
            if user.pk in self.admin_users:
                assert private_algo_qs[0].effective_permission == 0xFF
            elif user.pk in self.member_users:
                assert private_algo_qs[0].effective_permission == 0xFF
            else:
                assert private_algo_qs[0].effective_permission == 0x0101  # project permissions

            unspecified_algo_qs = Algorithm.objects.filter(pk=self.unspecified_algo.pk)
            unspecified_algo_qs = augment_permission(user, unspecified_algo_qs)
            if user.pk in self.admin_users:
                assert unspecified_algo_qs[0].effective_permission == 0xFFFFFF
            else:
                assert unspecified_algo_qs[0].effective_permission == 0x0101

            # Check all files have the proper permission (exist only)
            file_qs = File.objects.filter(pk__in=[file.pk for file in self.files])
            file_qs = augment_permission(user, file_qs)
            for f in file_qs:
                if user.pk in self.admin_users:
                    assert f.effective_permission == 0xFFFFFF
                elif user.pk in self.member_users:
                    assert f.effective_permission == 0xFF
                else:
                    assert f.effective_permission == 0x0101
            # Check version objects for the proper permission
            version_qs = Version.objects.filter(
                pk__in=[self.baseline_version.pk, self.readonly_version.pk]
            )
            version_qs = augment_permission(user, version_qs)

            for version in version_qs:
                if user.pk in self.admin_users:
                    assert version.effective_permission == 0xFFFFFF
                elif user.pk in self.member_users:
                    if version.pk == self.readonly_version.pk:
                        assert version.effective_permission == 0x0303
                    else:
                        assert version.effective_permission == 0x0101

            media_qs = Media.objects.filter(pk__in=[media.pk for media in self.videos])
            media_qs = augment_permission(user, media_qs)

            # Check permission is at least 0x1 for all media because we are in the organization
            for media in media_qs:
                assert media.effective_permission >= 0x1

                if user.pk in self.admin_users:
                    # Admins should have full permissions
                    assert media.effective_permission == 0xFFFF
                elif user.pk in self.member_users:
                    if media.pk in self.public_media:
                        # Members should have read/write permissions to public media
                        assert media.effective_permission == 0x0F0F
                    elif media.pk in self.private_media:
                        # Members should have read/write permissions to private media
                        assert media.effective_permission == 0x0F0F
                    else:
                        # Members have exist permission from being in the org, but can't see metadata
                        assert media.effective_permission == 0x0001
                elif user.pk in self.guest_users:
                    if media.pk in self.public_media:
                        # Guests should have read-only permissions to public media
                        assert media.effective_permission == 0x0303
                    else:
                        # Guests should have exist permission because they are in the organization
                        assert media.effective_permission == 0x01

            section_qs = Section.objects.filter(
                pk__in=[self.public_section.pk, self.private_section.pk]
            )
            section_qs = augment_permission(user, section_qs)
            for section in section_qs:
                if user.pk in self.admin_users:
                    assert section.effective_permission == 0xFFFFFF
                elif user.pk in self.member_users:
                    assert section.effective_permission == 0x0F0F03
                else:
                    if section.pk == self.public_section.pk:
                        assert section.effective_permission == 0x030303
                    else:
                        assert section.effective_permission == 0x000101

            # Test effective permission for boxes in media match expected result
            for media in media_qs:
                localization_qs = Localization.objects.filter(project=self.project, media=media)
                localization_qs = augment_permission(user, localization_qs)
                if media.primary_section:
                    media_primary_section_pk = media.primary_section.pk
                else:
                    media_primary_section_pk = None
                for localization in localization_qs:
                    if user.pk in self.admin_users:
                        assert localization.effective_permission == 0xFF
                    elif user.pk in self.member_users:
                        if media_primary_section_pk == self.public_section.pk:
                            if localization.version.pk == self.readonly_version.pk:
                                assert localization.effective_permission == 0x03
                            else:
                                assert localization.effective_permission == 0x0F
                        elif media_primary_section_pk == self.private_section.pk:
                            assert localization.effective_permission == 0x0F
                    else:
                        if media_primary_section_pk == self.public_section.pk:
                            assert localization.effective_permission == 0x03
                        else:
                            assert localization.effective_permission == 0x00
