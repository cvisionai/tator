import concurrent.futures
import logging
from pprint import pformat

logger = logging.getLogger(__name__)


class TatorThreadPool:
    @classmethod
    def setup_threadpool(cls):
        cls.executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

    @classmethod
    def submit(cls, fn, *args, **kwargs):
        try:
            cls.executor.submit(fn, *args, **kwargs)
        except Exception:
            logger.error(f"Could not submit function '{fn.__qualname__}' with positional arguments '{args}' and keyword arguments '{kwargs}'", exc_info=True)
            return False
        return True


TatorThreadPool.setup_threadpool()
