import redis
import datetime
import time
import json
import logging
from dateutil.parser import parse
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from main.models import Project
from main.consumers import ProgressProducer

logger = logging.getLogger(__name__)

def upload_messages_by_swid(rds, grp):
    messages = defaultdict(list)
    for uid, msg in rds.hgetall(grp).items():
        msg = json.loads(msg)
        have_swid = 'swid' in msg
        have_updated = 'updated' in msg
        have_msg = 'message' in msg
        if have_swid and have_updated and have_msg:
            swid = msg['swid']

            # Uploaded... means the upload completed and the processing 
            # is all server side
            if msg['message'] != 'Uploaded...': 
                messages[swid].append(msg)
    return messages

class Command(BaseCommand):
    help = "Prunes stored redis messages from dead service workers."

    def handle(self, *args, **options):
        # Set up redis.
        rds = redis.Redis(host='redis-svc')

        # Max time with no updates.
        max_time = datetime.timedelta(seconds=30)

        while True:
            for project in Project.objects.all():
                latest_grp = 'upload_latest_' + str(project.id)
                messages = upload_messages_by_swid(rds, latest_grp)
                for swid in messages:
                    last = parse(rds.hget('sw_latest', swid))
                    now = datetime.datetime.now(datetime.timezone.utc)
                    if (now - last) > max_time:
                        logger.info(
                            f"Service worker with ID {swid} timed out! "
                            "Clearing its status messages..."
                        )
                        for msg in messages[swid]:
                            prog = ProgressProducer(
                                'upload',
                                project.id,
                                msg['uid_gid'],
                                msg['uid'],
                                msg['name'],
                                msg['user'],
                                {'section': msg['section']},
                            )
                            prog.failed("Timed out!")
                            time.sleep(0.01)
                        rds.hdel('sw_latest', swid)
            time.sleep(5)
