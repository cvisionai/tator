import os
import logging
from uuid import uuid1
from urllib.parse import urlsplit, urlunsplit

from ..schema import OrganizationUploadInfoSchema
from ..store import get_tator_store

from ._base_views import BaseDetailView
from ._permissions import OrganizationEditPermission

logger = logging.getLogger(__name__)


class OrganizationUploadInfoAPI(BaseDetailView):
    """Retrieve info needed to upload a file to organization prefix."""

    schema = OrganizationUploadInfoSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get"]

    def _get(self, params):
        # Parse parameters.
        expiration = params["expiration"]
        num_parts = params["num_parts"]
        organization = params["organization"]
        if os.getenv("REQUIRE_HTTPS") == "TRUE":
            PROTO = "https"
        else:
            PROTO = "http"

        # Generate an object name
        name = str(uuid1())
        key = f"{organization}/{name}"

        # Generate presigned urls.
        tator_store = get_tator_store()
        urls, upload_id = tator_store.get_upload_urls(
            key, expiration, num_parts, self.request.build_absolute_uri("/")[:-1]
        )

        # Replace host if external host is given.
        if tator_store.external_host:
            external = urlsplit(tator_store.external_host, scheme=PROTO)
            urls = [
                urlunsplit(
                    urlsplit(url)._replace(
                        netloc=external.netloc + external.path, scheme=external.scheme
                    )
                )
                for url in urls
            ]

        return {"urls": urls, "key": key, "upload_id": upload_id}
