from functools import wraps
import time
from typing import Any, Dict

class SimpleCache:
    """Simple in-memory cache"""
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Set cache value with TTL (seconds)"""
        self._cache[key] = {
            'value': value,
            'expires': time.time() + ttl
        }
    
    def get(self, key: str) -> Any:
        """Get cache value if not expired"""
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry['expires']:
                return entry['value']
            else:
                del self._cache[key]
        return None
    
    def clear(self) -> None:
        """Clear all cache"""
        self._cache.clear()

# Global cache instance
cache = SimpleCache()

def cache_result(ttl: int = 300):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            key = ":".join(key_parts)
            
            # Try to get from cache
            cached = cache.get(key)
            if cached is not None:
                return cached
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(key, result, ttl)
            return result
        return wrapper
    return decorator