// Phase 3: 2026-04-02 | In-memory TTL cache (zero external dependencies)
// Upgraded: in-flight promise deduplication (anti-thundering herd) + scoped report invalidation
// + bounded max keys + unref() sweep timer so unit tests/CLI exit cleanly.

const DEFAULT_TTL_SEC = 60;
const MAX_ENTRIES = 1000;

/** @type {Map<string, { value: any, expiresAt: number }>} */
const store = new Map();

// Tracks concurrent fetches for the same cache key to coalesce DB load.
const inFlight = new Map();

// Periodic expired-entry sweep (unref'd so it never keeps Node process alive)
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(k);
    }
  }
}, 120_000);
if (typeof sweepTimer.unref === "function") {
  sweepTimer.unref();
}

export const REPORT_CACHE_PREFIXES = {
  DASHBOARD: "dashboard:",
  FINANCIAL: "financial:",
  PLANNING: "planning:",
  AI: "ai:",
  CRM: "crm:",
  RECOMMENDATIONS: "rec:",
};

/**
 * Get a value from cache.
 * @param {string} key
 * @returns {any | undefined}
 */
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Set a value in cache.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl] - override default TTL in seconds
 */
export function cacheSet(key, value, ttl = DEFAULT_TTL_SEC) {
  const ttlSec = Number.isFinite(Number(ttl)) && Number(ttl) > 0 ? Number(ttl) : DEFAULT_TTL_SEC;
  // Evict oldest entry when approaching cap
  if (!store.has(key) && store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSec * 1000,
  });
}

/**
 * Delete one or more cache entries by key prefix.
 * @param {string} prefix
 * @returns {number} number of keys invalidated
 */
export function cacheInvalidate(prefix) {
  let removed = 0;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      removed += 1;
    }
  }
  return removed;
}

/**
 * Xóa đồng loạt cache của các nhóm báo cáo bị ảnh hưởng sau thao tác ghi dữ liệu.
 * @param {string[]} [prefixes]
 * @returns {number}
 */
export function invalidateReportCaches(
  prefixes = [
    REPORT_CACHE_PREFIXES.DASHBOARD,
    REPORT_CACHE_PREFIXES.FINANCIAL,
    REPORT_CACHE_PREFIXES.PLANNING,
    REPORT_CACHE_PREFIXES.AI,
    REPORT_CACHE_PREFIXES.CRM,
    REPORT_CACHE_PREFIXES.RECOMMENDATIONS,
  ]
) {
  let removed = 0;
  for (const prefix of prefixes) {
    removed += cacheInvalidate(prefix);
  }
  return removed;
}

/**
 * Wrap an async data-fetcher with cache-aside + in-flight deduplication.
 * Errors are never cached; failed calls clean up inFlight immediately.
 * @param {string} key
 * @param {() => Promise<any>} fetcher
 * @param {number} [ttl]
 * @returns {Promise<any>}
 */
export async function withCache(key, fetcher, ttl) {
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(() => fetcher())
    .then((value) => {
      // Do not cache error payload objects ({ error: ... })
      if (value !== undefined && !(value && typeof value === "object" && value.error)) {
        cacheSet(key, value, ttl);
      }
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

const cacheAdapter = {
  get: cacheGet,
  set: cacheSet,
  del: (keys) => {
    const arr = Array.isArray(keys) ? keys : [keys];
    for (const k of arr) store.delete(k);
  },
  keys: () => Array.from(store.keys()),
  flushAll: () => store.clear(),
};

export default cacheAdapter;
