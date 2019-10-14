import redis
import json
import logging

logger = logging.getLogger(__name__)

def get_media_list_hash(project_id, query_params):
    group = f"media_{project_id}"
    key = json.dumps(query_params, sort_keys=True)
    return (group, key)

class TatorCache:
    """Interface for caching responses.
    """
    @classmethod
    def setup_redis(cls):
        cls.rds = redis.Redis(host='redis-svc', health_check_interval=30)

    def get_media_list_cache(self, project_id, query_params):
        """Returns media list cache or None if it is not cached.
        """
        group, key = get_media_list_hash(project_id, query_params)
        val = None
        if self.rds.hexists(group, key):
            val = self.rds.hget(group, key)
        return val

    def set_media_list_cache(self, project_id, query_params, val):
        """Caches a media list response.
        """
        group, key = get_media_list_hash(project_id, query_params)
        self.rds.hset(group, key, json.dumps(val))

    def invalidate_media_list_cache(self, project_id):
        """Clears media list cache.
        """
        group, _ = get_media_list_hash(project_id, {})
        self.rds.delete(group)

TatorCache.setup_redis()
