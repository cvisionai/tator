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
            val = self.rds.hget(group,key)
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

    def invalidate_all(self):
        """Invalidates all caches.
        """
        for prefix in ['creds_']:
            for key in self.rds.scan_iter(match=prefix + '*'):
                logger.info(f"Deleting cache key {key}...")
                self.rds.delete(key)
        logger.info("Cache cleared!")

TatorCache.setup_redis()
