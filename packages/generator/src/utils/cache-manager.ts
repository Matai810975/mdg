/**
 * Cache Manager for MikroNestForge
 * Provides memoization utilities for expensive operations
 */

// WeakMap-based cache for ClassDeclaration-based operations (automatically cleaned up)
const classBasedCache = new WeakMap<any, Map<string, any>>();

// Map-based cache for string-based operations with size limits
const stringBasedCache = new Map<string, { value: any; timestamp: number }>();
const MAX_STRING_CACHE_SIZE = 1000;
const CACHE_CLEANUP_INTERVAL = 100; // Clean up every 100 operations
let operationCount = 0;

/**
 * Get or create a cache map for a specific ClassDeclaration
 * @param key The ClassDeclaration to use as a key
 * @param cacheType The type of cache to access
 * @returns A Map for caching values related to this class
 */
export function getClassCache(key: any, cacheType: string): Map<string, any> {
  if (!classBasedCache.has(key)) {
    classBasedCache.set(key, new Map());
  }
  const classCache = classBasedCache.get(key)!;

  if (!classCache.has(cacheType)) {
    classCache.set(cacheType, new Map<string, any>());
  }

  return classCache.get(cacheType);
}

/**
 * Get a value from string-based cache
 * @param key The cache key
 * @returns The cached value or undefined if not found
 */
export function getStringCache(key: string): any {
  const entry = stringBasedCache.get(key);
  if (entry) {
    return entry.value;
  }
  return undefined;
}

/**
 * Set a value in string-based cache
 * @param key The cache key
 * @param value The value to cache
 */
export function setStringCache(key: string, value: any): void {
  // Clean up cache periodically to prevent memory leaks
  operationCount++;
  if (operationCount % CACHE_CLEANUP_INTERVAL === 0) {
    cleanupStringCache();
  }

  // Evict oldest entries if cache is too large
  if (stringBasedCache.size >= MAX_STRING_CACHE_SIZE) {
    const oldestKey = getOldestCacheEntryKey();
    if (oldestKey) {
      stringBasedCache.delete(oldestKey);
    }
  }

  stringBasedCache.set(key, { value, timestamp: Date.now() });
}

/**
 * Clean up old entries from string-based cache
 */
function cleanupStringCache(): void {
  const now = Date.now();
  const expirationTime = 5 * 60 * 1000; // 5 minutes

  for (const [key, entry] of stringBasedCache.entries()) {
    if (now - entry.timestamp > expirationTime) {
      stringBasedCache.delete(key);
    }
  }
}

/**
 * Get the key of the oldest entry in the string-based cache
 * @returns The key of the oldest entry or undefined if cache is empty
 */
function getOldestCacheEntryKey(): string | undefined {
  let oldestKey: string | undefined;
  let oldestTimestamp = Number.MAX_SAFE_INTEGER;

  for (const [key, entry] of stringBasedCache.entries()) {
    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
      oldestKey = key;
    }
  }

  return oldestKey;
}

/**
 * Clear all caches (useful for testing)
 */
export function clearAllCaches(): void {
  // Note: WeakMap doesn't have a clear() method, so we can't clear it directly
  // The WeakMap will be cleaned up automatically when objects are garbage collected
  stringBasedCache.clear();
  operationCount = 0;
}

/**
 * Get cache statistics (useful for debugging and performance monitoring)
 * @returns Object with cache statistics
 */
export function getCacheStats(): { classCacheEntries: number; stringCacheEntries: number; operationCount: number } {
  // Note: WeakMap doesn't have a forEach method, so we can't count entries in the classBasedCache
  // Just return the string-based cache count
  return {
    classCacheEntries: 0, // Cannot count WeakMap entries
    stringCacheEntries: stringBasedCache.size,
    operationCount
  };
}