from datetime import datetime, timedelta
import redis
import json
import os
import logging
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

EXPIRE_TIME=60*60*24*30

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

    def get_keycloak_public_key(self):
        public_key = self.rds.get('keycloak_public_key')
        return public_key

    def set_keycloak_public_key(self, public_key):
        pem_public_key = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        self.rds.set('keycloak_public_key', pem_public_key)

    def set_job(self, job, hkey):
        """ Stores a job for cancellation or authentication. Job is a dict including
            uid, gid, user id, project id, algorithm id (-1 if not an algorithm), 
            and time created.
        """
        val = json.dumps(job)
        uid = job['uid']
        gid = job['gid']
        project = job['project']

        # Set the job data by UID.
        self.rds.set(uid, val, ex=EXPIRE_TIME)

        # Store list of UIDs under GID key.
        if self.rds.exists(gid):
            self.rds.append(gid, f',{uid}')
        else:
            self.rds.set(gid, uid, ex=EXPIRE_TIME)

        # Store list of UIDs under project key.
        project_key = f'{hkey}_{project}'
        if self.rds.exists(project_key):
            self.rds.append(project_key, f',{uid}')
        else:
            self.rds.set(project_key, uid, ex=EXPIRE_TIME)

    def get_jobs_by_uid(self, uid):
        """ Retrieves job using UID.
        """
        val = None
        if self.rds.exists(uid):
            val = [json.loads(self.rds.get(uid).decode())]
        return val

    def get_jobs_by_gid(self, gid, first_only=False):
        """ Retrieves jobs using GID. Set first_only=True to only retrieve first job.
        """
        uids = self.rds.get(gid)
        if uids:
            uids = uids.decode().split(',')
            if first_only:
                jobs = [json.loads(self.rds.get(uids[0]).decode())]
            else:
                jobs = [json.loads(self.rds.get(uid).decode()) for uid in uids]
        else:
            jobs = []
        return jobs

    def get_jobs_by_project(self, project, hkey, first_only=False):
        """ Retrieves jobs using project ID. Set first_only=True to only retrieve first job.
        """
        project_key = f'{hkey}_{project}'
        uids = self.rds.get(project_key)
        if uids:
            uids = uids.decode().split(',')
            if first_only:
                jobs = [json.loads(self.rds.get(uids[0]).decode())]
            else:
                jobs = [json.loads(self.rds.get(uid).decode()) for uid in uids]
        else:
            jobs = []
        return jobs

    def set_presigned(self, user, key, url, ttl=3600):
        """ Stores presigned url. """
        self.rds.set(f"{user}__{key}", url, ex=ttl)

    def get_presigned(self, user, key, ttl=3600):
        """ Retrieves presigned url. """
        url_key = f"{user}__{key}"
        url = self.rds.get(url_key)
        if url is not None:
            url = url.decode()
            cached_ttl = self.rds.ttl(url_key)
            current_dt = datetime.now()
            cached_exp = current_dt + timedelta(seconds=cached_ttl)
            desired_exp = current_dt + timedelta(seconds=ttl)
            if desired_exp < cached_exp:
                self.rds.delete(url_key)
                url = None
        return url
            
    def invalidate_all(self):
        """Invalidates all caches.
        """
        for prefix in ['creds_']:
            for key in self.rds.scan_iter(match=prefix + '*'):
                logger.info(f"Deleting cache key {key}...")
                self.rds.delete(key)
        self.rds.delete('keycloak_public_key')
        logger.info("Cache cleared!")

TatorCache.setup_redis()
