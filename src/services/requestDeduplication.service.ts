/**
 * Request Deduplication Service
 * Prevents duplicate API requests by caching in-flight requests
 */

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
  key: string;
}

class RequestDeduplicationService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5000; // 5 seconds for in-flight requests
  private readonly RESULT_CACHE_TTL = 30000; // 30 seconds for results

  /**
   * Execute a request with deduplication
   * If the same request is already in-flight, return the existing promise
   */
  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Clean expired entries
    this.cleanup();

    const existing = this.cache.get(key);
    if (existing) {
      console.log('[REQUEST_DEDUP] Using cached request:', key);
      return existing.promise;
    }

    console.log('[REQUEST_DEDUP] New request:', key);
    const promise = requestFn().finally(() => {
      // Remove from cache after completion
      setTimeout(() => {
        this.cache.delete(key);
      }, this.RESULT_CACHE_TTL);
    });

    this.cache.set(key, {
      promise,
      timestamp: Date.now(),
      key
    });

    return promise;
  }

  /**
   * Generate a cache key from request parameters
   */
  createKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params, Object.keys(params).sort()) : '';
    return `${endpoint}:${paramString}`;
  }

  /**
   * Clear all cached requests
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const requestDeduplicationService = new RequestDeduplicationService();