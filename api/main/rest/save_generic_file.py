import logging
import os
import shutil

from django.conf import settings

from ..schema import SaveGenericFileSchema
from ..schema.components.generic_file import generic_file_fields as fields
from ..download import download_file

from ._base_views import BaseListView
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)


class SaveGenericFileAPI(BaseListView):
    """Saves a generic non-media file used for reports and applets"""

    schema = SaveGenericFileSchema()
    permission_clases = [ProjectExecutePermission]
    http_method_names = ["post"]

    def _post(self, params: dict) -> dict:
        """Saves the uploaded report file into the project's permanent storage"""

        # Verify the provided file has been uploaded
        upload_url = params[fields.upload_url]

        # Move the file to the right location using the provided name
        project_id = str(params[fields.project])
        basename = os.path.basename(params[fields.name])
        filename, extension = os.path.splitext(basename)
        new_filename = filename + extension
        final_path = os.path.join(settings.MEDIA_ROOT, project_id, new_filename)

        # Make sure there's not a duplicate of this file.
        file_index = -1
        while os.path.exists(final_path):
            file_index += 1
            new_filename = f"{filename}_{file_index}{extension}"
            final_path = os.path.join(settings.MEDIA_ROOT, project_id, new_filename)

        project_folder = os.path.dirname(final_path)
        os.makedirs(project_folder, exist_ok=True)

        # Download the file to the final path.
        download_file(upload_url, final_path)

        # Create the response back to the user
        new_url = os.path.join(project_id, new_filename)
        response = {
            fields.name: params[fields.name],
            fields.project: project_id,
            fields.upload_url: upload_url,
            fields.url: new_url,
        }
        return response
