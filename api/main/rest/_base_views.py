"""TODO: add documentation for this"""

import traceback
import sys
import logging

from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied as DrfPermissionDenied
from django.core.exceptions import PermissionDenied
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.http import response
from django.conf import settings
from django.db.models import F, Value

from ..schema import parse

from ..rest import _base_views
from .._permission_util import augment_permission, ColBitAnd, PermissionMask
from ._permissions import *
from main.models import *

from ._attribute_query import supplied_name_to_field

logger = logging.getLogger(__name__)


import os
import subprocess
import select
import time


def process_exception(exc):
    """TODO: add documentation for this"""
    logger.error(f"Handling Exception! \n {type(exc)}\nTrace:\n{traceback.format_exc()}")
    if isinstance(exc, response.Http404):
        resp = Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    elif isinstance(exc, ObjectDoesNotExist):
        logger.error(f"Not found in GET request: {str(exc)}")
        resp = Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    elif type(exc) == PermissionDenied or type(exc) == DrfPermissionDenied:
        logger.error(f"Permission denied error: {str(exc)}")
        resp = Response({"message": str(exc)}, status=status.HTTP_403_FORBIDDEN)
    else:
        logger.error(f"Unhandled exception: {type(exc)}")
        resp = Response(
            {"message": str(exc), "details": str(exc.__cause__)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return resp


class TatorAPIView(APIView):
    def initial(self, request, *args, **kwargs):
        """
        Runs anything that needs to occur prior to calling the method handler.
        """
        self.format_kwarg = self.get_format_suffix(**kwargs)

        # Perform content negotiation and store the accepted info on the request
        neg = self.perform_content_negotiation(request)
        request.accepted_renderer, request.accepted_media_type = neg

        # Determine the API version, if versioning is in use.
        version, scheme = self.determine_version(request, *args, **kwargs)
        request.version, request.versioning_scheme = version, scheme

        # Check throttles before permissions check which can be expensive
        self.perform_authentication(request)
        self.check_throttles(request)

        # parse the request and store the validated schema as a member
        self.params = parse(request)
        # Ensure that the incoming request is permitted

        try:
            self.check_permissions(request)
        except DrfPermissionDenied as e:
            self.permission_denied(request)

    def get_model(self):
        # this works for most views, but not States, Media, or Localization
        return self.get_queryset().model

    def get_parent_objects(self):
        # Default to project as parents as that is usually the case
        project_id = self.params.get("project", None)
        model = self.get_queryset().model
        if model == Project:
            projects = self.get_queryset()
        elif not project_id:
            projects = Project.objects.filter(pk__in=self.get_queryset().values("project"))
        else:
            projects = Project.objects.filter(pk=project_id)
        return {
            "project": projects,
            "version": Version.objects.filter(pk=-1),
            "section": Section.objects.filter(pk=-1),
        }

    def filter_only_viewables(self, qs, required_mask=PermissionMask.EXIST | PermissionMask.READ):
        # Convenience function for filtering out objects for most views
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION", None) == "true":
            user = self.request.user
            if isinstance(self.request.user, AnonymousUser):
                anonymous_qs = User.objects.filter(username="anonymous")
                if anonymous_qs.exists():
                    user = anonymous_qs[0]
                else:
                    return qs.none()
            exists = qs.only("pk").exists()
            low_mark = None
            high_mark = None
            if qs.query.low_mark != 0 or qs.query.high_mark is not None:
                low_mark = qs.query.low_mark
                high_mark = qs.query.high_mark
                # Clear the slice from the query so that we can augment the permissions
                qs.query.low_mark = 0
                qs.query.high_mark = None
            qs = augment_permission(user, qs, exists=exists)
            if exists:
                qs = qs.annotate(is_viewable=ColBitAnd(F("effective_permission"), required_mask))
                qs = qs.filter(is_viewable__exact=required_mask)
                if self.params.get("float_array", None) == None and self.request.method in [
                    "GET",
                    "PUT",
                ]:
                    if self.params.get("sort_by", None):
                        sortables = [supplied_name_to_field(x) for x in self.params.get("sort_by")]
                        qs = qs.order_by(*sortables)
                    elif qs.model == Media:
                        qs = qs.order_by("name", "id")
                    else:
                        qs = qs.order_by("id")
                if low_mark is not None and high_mark is not None:
                    qs = qs[low_mark:high_mark]
                elif low_mark is not None:
                    qs = qs[low_mark:]
                elif high_mark is not None:
                    qs = qs[:high_mark]
        else:
            qs = qs.annotate(effective_permission=Value(0))
        return qs


class GetMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def get(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        resp = Response({})
        response_data = self._get(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class StreamingGetMixIn:
    def get(self, request, format=None, **kwargs):
        # If fine-grain is turned off, we have to do a count here to get the right error code response
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION", "false") == "false":
            # This operation should be cheap enough and cause an exception if there was something wrong
            # before the streaming response has sent a 200 OK response.
            qs = self.get_queryset()
            count = qs.count()
        media_list_generator = self._get(self.params)
        stream = self._gzip_json_stream(media_list_generator)
        response = StreamingHttpResponse(stream, content_type="application/json")
        response["Content-Encoding"] = "gzip"
        return response

    def _gzip_json_stream(self, json_generator, batch_size=8192, read_timeout=5):
        def stream():
            # Create the pigz subprocess
            pigz = subprocess.Popen(
                [
                    "pigz",
                    "-c",
                    "-p",
                    "2",
                    "-b",
                    "64",
                    "-f",
                    "-6",
                ],  # Added -f to force compression output immediately
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,  # Capture stderr for debugging
                bufsize=0,  # unbuffered
            )
            start = time.time()

            try:
                # Use a buffer to accumulate data and send it to pigz's stdin
                buffer = bytearray()

                # Write data to pigz's stdin and read from stdout
                line_count=0
                for line in json_generator:
                    line_count += 1
                    encoded = line.encode("utf-8")
                    buffer.extend(encoded)
                    #logger.info(f"Processing line #{line_count} buffer size: {len(buffer)}")  # Debug log

                    if len(buffer) >= batch_size:
                        pigz.stdin.write(buffer)
                        pigz.stdin.flush()  # Ensure pigz gets the data immediately
                        buffer.clear()

                        # Capture output immediately after writing
                        rlist, _, _ = select.select([pigz.stdout], [], [], 0)
                        if rlist:
                            chunk = pigz.stdout.read(16384)
                            if chunk:
                                yield chunk

                # Write remaining data if any
                if buffer:
                    pigz.stdin.write(buffer)
                    pigz.stdin.flush()
                    buffer.clear()
                    pigz.stdin.close()

                # Close stdin and finalize reading output

                # Only read the final output if it's available
                while True:
                    # Use select to add a timeout on reading from stdout
                    rlist, _, _ = select.select([pigz.stdout], [], [], read_timeout)
                    if rlist:
                        chunk = pigz.stdout.read(16384)
                        if chunk:
                            yield chunk
                        else:
                            break
                    else:
                        logger.error(
                            f"Timeout after {read_timeout} seconds waiting for data."
                        )  # Debug log
                        break

                # Ensure the process terminates and check for any errors
                pigz.wait()
                if pigz.returncode != 0:
                    err_msg = pigz.stderr.read().decode("utf-8")
                    logger.error(
                        f"Error from pigz: Return Code = {pigz.returncode} {err_msg}"
                    )  # Debug log

            except Exception as e:
                logger.error(f"Error in pigz streaming: {str(e)}")
                logger.error(traceback.format_exc())
            finally:
                pigz.terminate()
            # logger.info(f"PIGZ time = {time.time()-start}")

        return stream()


class StreamingPutMixIn:
    def put(self, request, format=None, **kwargs):
        resp = StreamingHttpResponse(self._put(self.params), content_type="application/json")
        resp["Content-Type"] = "application/json"
        return resp


class PostMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def post(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        resp = Response({})
        response_data = self._post(self.params)
        resp = Response(response_data, status=status.HTTP_201_CREATED)
        return resp


class PatchMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def patch(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        response_data = self._patch(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class DeleteMixin:
    # pylint: disable=redefined-builtin,unused-argument
    """TODO: add documentation for this"""

    def delete(self, request, format=None, **kwargs):
        """TODO: add documentation for this"""
        response_data = self._delete(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class PutMixin:
    def put(self, request, format=None, **kwargs):
        response_data = self._put(self.params)
        resp = Response(response_data, status=status.HTTP_200_OK)
        return resp


class BaseListView(TatorAPIView, GetMixin, PostMixin, PatchMixin, DeleteMixin, PutMixin):
    """Base class for list views."""

    http_method_names = ["get", "post", "patch", "delete", "put"]

    def handle_exception(self, exc):
        return process_exception(exc)


class StreamingListView(
    TatorAPIView, StreamingGetMixIn, PostMixin, PatchMixin, DeleteMixin, StreamingPutMixIn
):
    """Base class for list views."""

    http_method_names = ["get", "post", "patch", "delete", "put"]

    def handle_exception(self, exc):
        return process_exception(exc)


class BaseDetailView(TatorAPIView, GetMixin, PatchMixin, DeleteMixin):
    """Base class for detail views."""

    http_method_names = ["get", "patch", "delete"]

    def handle_exception(self, exc):
        return process_exception(exc)
