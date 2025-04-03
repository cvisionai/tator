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
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)


class TatorCache:
    """Interface for caching responses."""

    @classmethod
    def setup_redis(cls):
        retry = Retry(ExponentialBackoff(), 3)
        cls.rds = Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
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

    def set_presigned(self, user, key, url, ttl=3600):
        """Stores presigned url."""
        self.rds.set(f"{user}__{key}", url, ex=ttl)

    def get_presigned(self, user, key):
        """Retrieves presigned url."""
        url = self.rds.get(f"{user}__{key}")
        if url is not None:
            url = url.decode()
        return url

    def get_presigned_multi(self, user, keys):
        matches = self.rds.mget([f"{user}__{key}" for key in keys])
        return {key: (match.decode() if match else None) for key, match in zip(keys, matches)}

    def set_presigned_multi(self, user, keys, urls, ttl=3600):
        """Stores presigned urls."""
        assert len(keys) == len(urls)

        # Need to use a pipeline here because redis-py does not support
        # multi-set with expiration
        with self.rds.pipeline() as pipe:
            for key, url in zip(keys, urls):
                pipe.set(f"{user}__{key}", url, ex=ttl)
            pipe.execute()

    def invalidate_all(self):
        """Invalidates all caches."""
        for prefix in ["creds_"]:
            for key in self.rds.scan_iter(match=prefix + "*"):
                logger.info(f"Deleting cache key {key}...")
                self.rds.delete(key)
        self.rds.delete("keycloak_public_key")
        logger.info("Cache cleared!")


TatorCache.setup_redis()
