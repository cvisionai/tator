import redis
import json
import os
import logging

logger = logging.getLogger(__name__)

class TatorCache:
    """Interface for caching responses.
    """
    @classmethod
    def setup_redis(cls):
        cls.rds = redis.Redis(
            host=os.getenv('REDIS_HOST'),
            health_check_interval=30,
        )

    def get_cred_cache(self, user_id, project_id):
        group = f'creds_{project_id}'
        key = f'creds_{project_id}_{user_id}'
        val = None
        if self.rds.hexists(group, key):
            val = self.rds.hget(group, key)
            if val == 'True':
                val = True
            else:
                val = False
        return val

    def set_cred_cache(self, user_id, project_id, val):
        group = f'creds_{project_id}'
        key = f'creds_{project_id}_{user_id}'
        self.rds.hset(group, key, str(val))

    def invalidate_cred_cache(self, project_id):
        group = f'creds_{project_id}'
        self.rds.delete(group)

    def set_upload_permission_cache(self, upload_uid, token):
        self.rds.hset('uploads', upload_uid, token)

    def get_upload_permission_cache(self, upload_uid, token):
        granted = False
        if self.rds.hexists('uploads', upload_uid):
            granted = self.rds.hget('uploads', upload_uid).decode() == token
        return granted

    def set_upload_uid_cache(self, upload_url, upload_uid):
        if not self.rds.hexists('upload_uids', upload_url):
            self.rds.hset('upload_uids', upload_url, upload_uid)

    def get_upload_uid_cache(self, upload_url):
        uid = self.rds.hget('upload_uids', upload_url)
        if uid is not None:
            uid = uid.decode()
        return uid

    def set_job(self, job):
        """ Stores a job for cancellation or authentication. Job is a dict including
            uid, gid, user id, project id, algorithm id (-1 if not an algorithm), 
            and time created.
        """
        val = json.dumps(job)
        uid = job['uid']
        gid = job['gid']
        project = job['project']

        # Set the job data by UID.
        self.rds.hset('jobs', uid, val)

        # Store list of UIDs under GID key.
        if self.rds.exists(gid):
            self.rds.append(gid, f',{uid}')
        else:
            self.rds.set(gid, uid)

        # Store list of UIDs under project key.
        project_key = f'jobs_{project}'
        if self.rds.exists(project_key):
            self.rds.append(project_key, f',{uid}')
        else:
            self.rds.set(project_key, uid)

    def get_jobs_by_uid(self, uid):
        """ Retrieves job using UID.
        """
        val = self.rds.hget('jobs', uid).decode()
        return [json.loads(val)]

    def get_jobs_by_gid(self, gid, first_only=False):
        """ Retrieves jobs using GID. Set first_only=True to only retrieve first job.
        """
        uids = self.rds.get(gid).decode().split(',')
        if first_only:
            jobs = [json.loads(self.rds.hget('jobs', uids[0]).decode())]
        else:
            jobs = [json.loads(self.rds.hget('jobs', uid).decode()) for uid in uids]
        return jobs

    def get_jobs_by_project(self, project, first_only=False):
        """ Retrieves jobs using project ID. Set first_only=True to only retrieve first job.
        """
        project_key = f'jobs_{project}'
        uids = self.rds.get(project_key).decode().split(',')
        if first_only:
            jobs = [json.loads(self.rds.hget('jobs', uids[0]).decode())]
        else:
            jobs = [json.loads(self.rds.hget('jobs', uid).decode()) for uid in uids]
        return jobs
            
    def invalidate_all(self):
        """Invalidates all caches.
        """
        for prefix in ['creds_']:
            for key in self.rds.scan_iter(match=prefix + '*'):
                logger.info(f"Deleting cache key {key}...")
                self.rds.delete(key)
        logger.info("Cache cleared!")

TatorCache.setup_redis()
