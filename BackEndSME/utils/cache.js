// Phase 3: 2026-04-02 | In-memory cache using node-cache
// Use for read-heavy, low-volatility endpoints (dashboard, stock summary).
// Keys are namespaced by module to simplify targeted invalidation.

import NodeCache from "node-cache";

// Default TTL: 60 s. Check-period: 120 s (sweep expired entries).
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });

/**
 * Get a value from cache.
 * @param {string} key
 * @returns {any | undefined}
 */
export function cacheGet(key) {
  return cache.get(key);
}

/**
 * Set a value in cache.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl] - override default TTL in seconds
 */
export function cacheSet(key, value, ttl) {
  if (ttl !== undefined) {
    cache.set(key, value, ttl);
  } else {
    cache.set(key, value);
  }
}

/**
 * Delete one or more cache entries by key prefix.
 * @param {string} prefix
 */
export function cacheInvalidate(prefix) {
  const keys = cache.keys().filter(k => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
}

/**
 * Wrap an async data-fetcher with cache-aside logic.
 * @param {string} key
 * @param {() => Promise<any>} fetcher
 * @param {number} [ttl]
 * @returns {Promise<any>}
 */
export async function withCache(key, fetcher, ttl) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = await fetcher();
  cacheSet(key, value, ttl);
  return value;
}

export default cache;
