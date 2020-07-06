import logging
import os

from django.conf import settings

from ..schema import SaveAlgorithmManifestSchema
from ._base_views import BaseListView
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)

class SaveAlgorithmManifestAPI(BaseListView):
    """ Saves an algorithm workflow manifest .yaml file

        File is uploaded via tus, a separate mechanism from the REST API. Once the file
        upload is complete, the manifest file must be saved to the database using this endpoint.

    """

    schema = SaveAlgorithmManifestSchema()
    permission_clases = [ProjectExecutePermission]
    http_method_names = ['post']

    def _post(self, params: dict) -> dict:
        """ Overridden method. Please refer to parent's documentation.
        """    

        # Verify the provided file has been uploaded
        url = params['url']
        basename = os.path.basename(url)
        upload_path = os.path.join(settings.UPLOAD_ROOT, basename)

        if not os.path.exists(upload_path):
            log_msg = f"Upload file does not exist"
            raise RuntimeError(log_msg)

        # Move the file to the right location using the provided name
        project_id = params['project']
        basename = os.path.basename(params['name'])
        filename, extension = os.path.splitext(basename)
        new_filename = filename + extension
        final_path = os.path.join(settings.MEDIA_ROOT, project_id, new_filename)

        file_index = -1
        while not os.path.exists(final_path):
            file_index += 1
            new_filename = f'{filename}_{file_index}{extension}'
            final_path = os.path.join(settings.MEDIA_ROOT, project_id, new_filename)

        shutil.move(src=upload_path, dst=final_path)

        # Create the response back to the user
        new_url = os.path.join(project_id, new_filename)
        response = {'message': f'Algorithm manifest saved. URL: {new_url}'}
        return response