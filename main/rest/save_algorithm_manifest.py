import logging
import os
import shutil

from django.conf import settings

from ..schema import SaveAlgorithmManifestSchema
from ..schema.components.algorithm import manifest_fields as fields
from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class SaveAlgorithmManifestAPI(BaseListView):
    """ Saves an algorithm workflow manifest .yaml file

        File is uploaded via tus, a separate mechanism from the REST API. Once the file
        upload is complete, the manifest file must be saved to the database using this endpoint.

    """

    schema = SaveAlgorithmManifestSchema()
    permission_clases = [ProjectTransferPermission]
    http_method_names = ['post']

    def _post(self, params: dict) -> dict:
        """ Saves the manifest file into the corresponding project file

        It's expected that the file provided is in the upload directory, and then is
        moved into the project media folder. After this is done, this final URL can
        be used for algorithm registration

        Args:
            params: Parameters with request that contains the info for the manifest file save

        Returns:
            Response with saved manifest file info
        """

        # Verify the provided file has been uploaded
        upload_url = params[fields.upload_url]
        basename = os.path.basename(upload_url)
        upload_path = os.path.join(settings.UPLOAD_ROOT, basename)

        if not os.path.exists(upload_path):
            log_msg = f"Upload file does not exist {upload_path}"
            logger.error(log_msg)
            raise RuntimeError(log_msg)

        # Move the file to the right location using the provided name
        project_id = str(params[fields.project])
        basename = os.path.basename(params[fields.name])
        filename, extension = os.path.splitext(basename)
        new_filename = filename + extension
        final_path = os.path.join(settings.MEDIA_ROOT, project_id, new_filename)

        file_index = -1
        while os.path.exists(final_path):
            file_index += 1
            new_filename = f'{filename}_{file_index}{extension}'
            final_path = os.path.join(settings.MEDIA_ROOT, project_id, new_filename)

        project_folder = os.path.dirname(final_path)
        if not os.path.exists(project_folder):
            os.makedirs(project_folder, exist_ok=True)

        log_msg = f'Moving {upload_path} to {final_path}'
        logger.info(log_msg)
        shutil.move(src=upload_path, dst=final_path)

        # Create the response back to the user
        new_url = os.path.join(project_id, new_filename)
        response = {fields.url: new_url}
        return response