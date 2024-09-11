from redis.backoff import ExponentialBackoff
from redis.retry import Retry
from redis.client import Redis
from redis.exceptions import (
    BusyLoadingError,
    ConnectionError,
    TimeoutError,
)
import json
import os
import logging
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

EXPIRE_TIME = 60 * 60 * 24 * 30
REDIS_USE_SSL = os.getenv("REDIS_USE_SSL", "FALSE").lower() == "true"


class TatorCache:
    """Interface for caching responses."""

    @classmethod
    def setup_redis(cls):
        retry = Retry(ExponentialBackoff(), 3)
        cls.rds = Redis(
            host=os.getenv("REDIS_HOST"),
            retry=retry,
            retry_on_error=[BusyLoadingError, ConnectionError, TimeoutError],
            health_check_interval=30,
            ssl=REDIS_USE_SSL,
        )

    def get_cred_cache(self, user_id, project_id):
        group = f"creds_{project_id}"
        key = f"creds_{project_id}_{user_id}"
        val = None
        if self.rds.hexists(group, key):
            val = self.rds.hget(group, key)
            if val == "True":
                val = True
            else:
                val = False
        return val

    def set_cred_cache(self, user_id, project_id, val):
        group = f"creds_{project_id}"
        key = f"creds_{project_id}_{user_id}"
        self.rds.hset(group, key, str(val))

    def invalidate_cred_cache(self, project_id):
        group = f"creds_{project_id}"
        self.rds.delete(group)

    def get_keycloak_public_key(self):
        public_key = self.rds.get("keycloak_public_key")
        return public_key

    def set_keycloak_public_key(self, public_key):
        pem_public_key = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        self.rds.set("keycloak_public_key", pem_public_key)

    def set_job(self, job, hkey):
        """Stores a job for cancellation or authentication. Job is a dict including
        uid, gid, user id, project id, algorithm id (-1 if not an algorithm),
        and time created.
        """
        val = json.dumps(job)
        uid = job["uid"]
        gid = job["gid"]
        project = job["project"]

        # Set the job data by UID.
        self.rds.set(uid, val, ex=EXPIRE_TIME)

        # Store list of UIDs under GID key.
        if self.rds.exists(gid):
            self.rds.append(gid, f",{uid}")
        else:
            self.rds.set(gid, uid, ex=EXPIRE_TIME)

        media_id_str = job.get("media_ids", "")
        media_ids = [int(x) for x in media_id_str.split(",") if x != ""]
        for media_id in media_ids:
            media_key = f"{hkey}_{project}_{media_id}"
            if self.rds.exists(media_key):
                self.rds.append(media_key, f",{uid}")
            else:
                self.rds.set(media_key, uid, ex=EXPIRE_TIME)

        # Store list of UIDs under project key.
        project_key = f"{hkey}_{project}"
        if self.rds.exists(project_key):
            self.rds.append(project_key, f",{uid}")
        else:
            self.rds.set(project_key, uid, ex=EXPIRE_TIME)

    def get_jobs_by_uid(self, uid):
        """Retrieves job using UID."""
        val = None
        if self.rds.exists(uid):
            val = [json.loads(self.rds.get(uid).decode())]
        return val

    def get_jobs_by_gid(self, gid, first_only=False):
        """Retrieves jobs using GID. Set first_only=True to only retrieve first job."""
        uids = self.rds.get(gid)
        if uids:
            uids = uids.decode().split(",")
            if first_only:
                jobs = [json.loads(self.rds.get(uids[0]).decode())]
            else:
                jobs = [json.loads(self.rds.get(uid).decode()) for uid in uids]
        else:
            jobs = []
        return jobs

    def get_jobs_by_project(self, project, hkey, first_only=False):
        """Retrieves jobs using project ID. Set first_only=True to only retrieve first job."""
        project_key = f"{hkey}_{project}"
        uids = self.rds.get(project_key)
        if uids:
            uids = uids.decode().split(",")
            if first_only:
                jobs = [json.loads(self.rds.get(uids[0]).decode())]
            else:
                jobs = [json.loads(self.rds.get(uid).decode()) for uid in uids]
        else:
            jobs = []
        return jobs

    def get_jobs_by_media_id(self, project, media_ids, hkey):
        """Retrieves jobs using project ID. Set first_only=True to only retrieve first job."""
        jobs = []
        for media_id in media_ids:
            media_key = f"{hkey}_{project}_{media_id}"
            logger.info(f"media_key={media_key}")
            uids = self.rds.get(media_key)
            if uids:
                uids = uids.decode().split(",")
                logger.info(f"uids={uids}")
                jobs.extend([json.loads(self.rds.get(uid).decode()) for uid in uids])

        return jobs

    def set_presigned(self, user, key, url, ttl=3600):
        """Stores presigned url."""
        self.rds.set(f"{user}__{key}", url, ex=ttl)

    def get_presigned(self, user, key):
        """Retrieves presigned url."""
        url = self.rds.get(f"{user}__{key}")
        if url is not None:
            url = url.decode()
        return url

    def set_last_modified(self, path, last_modified):
        """Stores last modified time for a row."""
        timestamp = str(last_modified.timestamp())
        self.rds.set(f"last_modified__{path}", timestamp, ex=EXPIRE_TIME)

    def get_last_modified(self, path):
        """Retrieves last modified time for a row."""
        timestamp = self.rds.get(f"last_modified__{path}")
        if timestamp is not None:
            last_modified = datetime.fromtimestamp(float(timestamp))
        return last_modified

    def clear_last_modified(self, path):
        """Clears last modified time for a row."""
        self.rds.delete(f"last_modified__{path}")

    def invalidate_all(self):
        """Invalidates all caches."""
        for prefix in ["creds_"]:
            for key in self.rds.scan_iter(match=prefix + "*"):
                logger.info(f"Deleting cache key {key}...")
                self.rds.delete(key)
        self.rds.delete("keycloak_public_key")
        logger.info("Cache cleared!")


TatorCache.setup_redis()
