import logging
import datetime

from ..consumers import ProgressProducer
from ..schema import ProgressSchema

from ._base_views import BaseListView

logger = logging.getLogger(__name__)

class ProgressAPI(BaseListView):
    """ Broadcast progress update.

        Progress messages are sent in the web UI via WebSocket, and are displayed as progress
        bars associated with individual media files and as a summary in the webpage header. All
        members of a project can see progress bars from uploads and background jobs initiated
        by other users within the project. This endpoint accepts an array of messages, allowing
        for progress messages to be batched into a single request.
    """
    schema = ProgressSchema()
    http_method_names = ['post']

    def _post(self, params):
        for reqObject in params['body']:
            aux = {}
            if reqObject['job_type'] == 'upload':
                if 'swid' in reqObject:
                    aux['swid'] = str(reqObject['swid'])

                if 'section' in reqObject:
                    aux['section'] = reqObject['section']

                aux['updated'] = str(datetime.datetime.now(datetime.timezone.utc))

            if reqObject['job_type'] == 'algorithm':
                if 'sections' in reqObject:
                    aux['sections'] = reqObject['sections']
                if 'media_ids' in reqObject:
                    aux['media_ids'] = reqObject['media_ids']

            prog = ProgressProducer(
                reqObject['job_type'],
                params['project'],
                str(reqObject['gid']),
                reqObject['uid'],
                reqObject['name'],
                self.request.user,
                aux,
            )

            if reqObject['state'] == 'failed':
                prog.failed(reqObject['message'])
            elif reqObject['state'] == 'queued':
                prog.queued(reqObject['message'])
            elif reqObject['state'] == 'started':
                prog.progress(reqObject['message'], float(reqObject['progress']))
            elif reqObject['state'] == 'finished':
                prog.finished(reqObject['message'])
            else:
                logger.info(f"Received invalid progress state {reqObject['state']}")
                raise Exception(f"Invalid progress state {reqObject['state']}")

        return {'message': "Progress sent successfully!"}
