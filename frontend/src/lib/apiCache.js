const CACHE_PREFIX = "api-cache:";
const pendingRequests = new Map();

const getStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getCacheStorageKey = (key) => `${CACHE_PREFIX}${key}`;

const readCacheEntry = (key) => {
  const storage = getStorage();
  if (!storage) return null;

  const rawValue = storage.getItem(getCacheStorageKey(key));
  if (!rawValue) return null;

  try {
    const entry = JSON.parse(rawValue);
    if (!entry?.expiresAt || Date.now() > entry.expiresAt) {
      storage.removeItem(getCacheStorageKey(key));
      return null;
    }

    return entry.value;
  } catch {
    storage.removeItem(getCacheStorageKey(key));
    return null;
  }
};

const writeCacheEntry = (key, value, ttlMs) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(
    getCacheStorageKey(key),
    JSON.stringify({
      expiresAt: Date.now() + ttlMs,
      value,
    })
  );
};

export const fetchWithCache = async (
  key,
  fetcher,
  { ttlMs = 30_000, force = false } = {}
) => {
  if (!force) {
    const cachedValue = readCacheEntry(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const request = Promise.resolve(fetcher())
    .then((value) => {
      writeCacheEntry(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
};

export const invalidateApiCache = (keyOrPrefix) => {
  const storage = getStorage();
  if (!storage) return;

  const fullPrefix = getCacheStorageKey(keyOrPrefix);
  const keysToDelete = [];

  for (let index = 0; index < storage.length; index += 1) {
    const storageKey = storage.key(index);
    if (storageKey?.startsWith(fullPrefix)) {
      keysToDelete.push(storageKey);
    }
  }

  keysToDelete.forEach((storageKey) => storage.removeItem(storageKey));

  for (const pendingKey of pendingRequests.keys()) {
    if (pendingKey.startsWith(keyOrPrefix)) {
      pendingRequests.delete(pendingKey);
    }
  }
};

export const clearApiCache = () => invalidateApiCache("");
