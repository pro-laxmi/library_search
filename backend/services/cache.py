import time

CACHE = {}
CACHE_TTL = 1800
MAX_CACHE_SIZE = 100

def cleanup_cache():
    current = time.time()
    expired = []
    for key, value in CACHE.items():
        if current - value["timestamp"] > CACHE_TTL:
            expired.append(key)
    for key in expired:
        del CACHE[key]

def get(query):
    cleanup_cache()
    if query in CACHE:
        return CACHE[query]["data"]
    return None

def put(query, data):
    cleanup_cache()
    if len(CACHE) >= MAX_CACHE_SIZE:
        oldest = min(
            CACHE.items(),
            key=lambda x: x[1]["timestamp"]
        )[0]
        del CACHE[oldest]
    CACHE[query] = {
        "data": data,
        "timestamp": time.time()
    }