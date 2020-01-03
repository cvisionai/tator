import redis
import datetime
import time
import json
import os
import logging
from dateutil.parser import parse
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from main.util import waitForMigrations
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

    @classmethod
    def setup_redis(cls):
        cls.rds = redis.Redis(
            host=os.getenv('REDIS_HOST'),
            health_check_interval=30,
        )

    def handle(self, *args, **options):
        # Max time with no updates.
        max_time = datetime.timedelta(seconds=300)

        waitForMigrations()

        while True:
            for project in Project.objects.all():
                latest_grp = 'upload_latest_' + str(project.id)
                messages = upload_messages_by_swid(self.rds, latest_grp)
                for swid in messages:
                    last = parse(self.rds.hget('sw_latest', swid))
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
                        self.rds.hdel('sw_latest', swid)
            time.sleep(5)

Command.setup_redis()
