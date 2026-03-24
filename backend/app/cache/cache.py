"""
Simple in-memory TTL cache using cachetools.
Single process — no Redis needed for MVP.
"""

from cachetools import TTLCache
from functools import wraps
import asyncio
import hashlib
import json

_stores: dict[str, TTLCache] = {}


def _get_store(name: str, ttl: int, maxsize: int = 256) -> TTLCache:
    if name not in _stores:
        _stores[name] = TTLCache(maxsize=maxsize, ttl=ttl)
    return _stores[name]


def cache_async(store_name: str, ttl: int, key_fn=None):
    """Decorator that caches async function results by a TTL store."""
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            store = _get_store(store_name, ttl)
            if key_fn:
                cache_key = key_fn(*args, **kwargs)
            else:
                raw = json.dumps([str(a) for a in args] + sorted(kwargs.items()))
                cache_key = hashlib.md5(raw.encode()).hexdigest()

            if cache_key in store:
                return store[cache_key]

            result = await fn(*args, **kwargs)
            if result is not None:
                store[cache_key] = result
            return result
        return wrapper
    return decorator
