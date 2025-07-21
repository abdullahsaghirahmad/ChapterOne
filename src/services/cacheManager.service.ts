import { Book } from '../types';

// Cache configuration
export interface CacheConfig {
  searchResults: {
    prefix: 'search_';
    ttl: number; // 24 hours in milliseconds
    storage: 'localStorage';
  };
  bookMetadata: {
    prefix: 'book_meta_';
    ttl: number; // 7 days in milliseconds
    storage: 'indexedDB';
  };
  userPreferences: {
    prefix: 'user_prefs_';
    ttl: number; // 30 days in milliseconds
    storage: 'localStorage';
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  userId?: string;
  version: string;
}

export interface SearchCacheKey {
  query: string;
  searchType: string;
  includeExternal: boolean;
  userId?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalQueries: number;
  averageResponseTime: number;
  lastCleanup: number;
}

export class CacheManager {
  private config: CacheConfig;
  private dbName = 'ChapterOneCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private stats: CacheStats;
  private readonly CACHE_VERSION = '2.0.0';

  constructor() {
    this.config = {
      searchResults: {
        prefix: 'search_',
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        storage: 'localStorage'
      },
      bookMetadata: {
        prefix: 'book_meta_',
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        storage: 'indexedDB'
      },
      userPreferences: {
        prefix: 'user_prefs_',
        ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
        storage: 'localStorage'
      }
    };

    this.stats = this.loadStats();
    this.initializeIndexedDB();
    this.scheduleCleanup();
  }

  /**
   * Initialize IndexedDB for metadata caching
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for book metadata
        if (!db.objectStoreNames.contains('bookMetadata')) {
          const store = db.createObjectStore('bookMetadata', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  /**
   * Generate cache key from search parameters
   */
  private generateSearchKey(searchParams: SearchCacheKey): string {
    const { query, searchType, includeExternal, userId } = searchParams;
    const baseKey = `${query}_${searchType}_${includeExternal}`;
    return userId ? `${this.config.searchResults.prefix}${userId}_${baseKey}` : `${this.config.searchResults.prefix}${baseKey}`;
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(searchParams: SearchCacheKey, results: Book[]): Promise<void> {
    const key = this.generateSearchKey(searchParams);
    const entry: CacheEntry<Book[]> = {
      data: results,
      timestamp: Date.now(),
      ttl: this.config.searchResults.ttl,
      userId: searchParams.userId,
      version: this.CACHE_VERSION
    };

    try {
      localStorage.setItem(key, JSON.stringify(entry));
      console.log(`[CacheManager] Cached search results: ${key} (${results.length} books)`);
    } catch (error) {
      console.warn('[CacheManager] Failed to cache search results:', error);
      // Handle localStorage quota exceeded
      this.cleanupOldEntries('localStorage');
    }
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(searchParams: SearchCacheKey): Promise<Book[] | null> {
    const startTime = Date.now();
    const key = this.generateSearchKey(searchParams);

    try {
      const cached = localStorage.getItem(key);
      if (!cached) {
        this.updateStats('miss', Date.now() - startTime);
        return null;
      }

      const entry: CacheEntry<Book[]> = JSON.parse(cached);
      
      // Check if entry is expired
      if (this.isExpired(entry)) {
        localStorage.removeItem(key);
        this.updateStats('miss', Date.now() - startTime);
        return null;
      }

      // Check version compatibility
      if (entry.version !== this.CACHE_VERSION) {
        localStorage.removeItem(key);
        this.updateStats('miss', Date.now() - startTime);
        return null;
      }

      this.updateStats('hit', Date.now() - startTime);
      console.log(`[CacheManager] Cache hit: ${key} (${entry.data.length} books)`);
      return entry.data;
    } catch (error) {
      console.warn('[CacheManager] Failed to get cached search results:', error);
      this.updateStats('miss', Date.now() - startTime);
      return null;
    }
  }

  /**
   * Cache book metadata in IndexedDB
   */
  async cacheBookMetadata(bookId: string, metadata: any, userId?: string): Promise<void> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    const entry = {
      id: `${this.config.bookMetadata.prefix}${bookId}`,
      data: metadata,
      timestamp: Date.now(),
      ttl: this.config.bookMetadata.ttl,
      userId,
      version: this.CACHE_VERSION
    };

    try {
      const transaction = this.db!.transaction(['bookMetadata'], 'readwrite');
      const store = transaction.objectStore('bookMetadata');
      await store.put(entry);
      console.log(`[CacheManager] Cached book metadata: ${bookId}`);
    } catch (error) {
      console.warn('[CacheManager] Failed to cache book metadata:', error);
    }
  }

  /**
   * Get cached book metadata from IndexedDB
   */
  async getCachedBookMetadata(bookId: string): Promise<any | null> {
    if (!this.db) {
      await this.initializeIndexedDB();
    }

    try {
      const transaction = this.db!.transaction(['bookMetadata'], 'readonly');
      const store = transaction.objectStore('bookMetadata');
      const key = `${this.config.bookMetadata.prefix}${bookId}`;
      
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const entry = request.result;
          if (!entry || this.isExpired(entry) || entry.version !== this.CACHE_VERSION) {
            if (entry) {
              // Remove expired entry
              const deleteTransaction = this.db!.transaction(['bookMetadata'], 'readwrite');
              deleteTransaction.objectStore('bookMetadata').delete(key);
            }
            resolve(null);
          } else {
            resolve(entry.data);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('[CacheManager] Failed to get cached book metadata:', error);
      return null;
    }
  }

  /**
   * Cache user preferences
   */
  async cacheUserPreferences(userId: string, preferences: any): Promise<void> {
    const key = `${this.config.userPreferences.prefix}${userId}`;
    const entry: CacheEntry<any> = {
      data: preferences,
      timestamp: Date.now(),
      ttl: this.config.userPreferences.ttl,
      userId,
      version: this.CACHE_VERSION
    };

    try {
      localStorage.setItem(key, JSON.stringify(entry));
      console.log(`[CacheManager] Cached user preferences: ${userId}`);
    } catch (error) {
      console.warn('[CacheManager] Failed to cache user preferences:', error);
    }
  }

  /**
   * Get cached user preferences
   */
  async getCachedUserPreferences(userId: string): Promise<any | null> {
    const key = `${this.config.userPreferences.prefix}${userId}`;

    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<any> = JSON.parse(cached);
      
      if (this.isExpired(entry) || entry.version !== this.CACHE_VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('[CacheManager] Failed to get cached user preferences:', error);
      return null;
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Update cache statistics
   */
  private updateStats(type: 'hit' | 'miss', responseTime: number): void {
    this.stats.totalQueries++;
    
    if (type === 'hit') {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    this.stats.hitRate = (this.stats.hits / this.stats.totalQueries) * 100;
    
    // Update average response time (weighted average)
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalQueries - 1) + responseTime) / this.stats.totalQueries;

    this.saveStats();
  }

  /**
   * Load cache statistics from localStorage
   */
  private loadStats(): CacheStats {
    try {
      const saved = localStorage.getItem('cache_stats');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[CacheManager] Failed to load stats:', error);
    }

    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalQueries: 0,
      averageResponseTime: 0,
      lastCleanup: Date.now()
    };
  }

  /**
   * Save cache statistics to localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem('cache_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.warn('[CacheManager] Failed to save stats:', error);
    }
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clean up expired entries
   */
  private cleanupOldEntries(storageType: 'localStorage' | 'indexedDB'): void {
    if (storageType === 'localStorage') {
      // Cleanup localStorage entries
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(this.config.searchResults.prefix) || key.startsWith(this.config.userPreferences.prefix))) {
          try {
            const entry = JSON.parse(localStorage.getItem(key)!);
            if (this.isExpired(entry) || entry.version !== this.CACHE_VERSION) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[CacheManager] Cleaned up ${keysToRemove.length} localStorage entries`);
    }

    this.stats.lastCleanup = Date.now();
    this.saveStats();
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupOldEntries('localStorage');
    }, 60 * 60 * 1000);

    // Run initial cleanup if it's been more than 24 hours
    if (Date.now() - this.stats.lastCleanup > 24 * 60 * 60 * 1000) {
      this.cleanupOldEntries('localStorage');
    }
  }

  /**
   * Clear all cache for a specific user
   */
  async clearUserCache(userId: string): Promise<void> {
    // Clear localStorage entries for this user
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const entry = JSON.parse(localStorage.getItem(key)!);
          if (entry.userId === userId) {
            keysToRemove.push(key);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear IndexedDB entries for this user
    if (this.db) {
      const transaction = this.db.transaction(['bookMetadata'], 'readwrite');
      const store = transaction.objectStore('bookMetadata');
      const index = store.index('userId');
      const request = index.openCursor(IDBKeyRange.only(userId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }

    console.log(`[CacheManager] Cleared cache for user: ${userId}`);
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    // Clear localStorage
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith(this.config.searchResults.prefix) ||
        key.startsWith(this.config.userPreferences.prefix) ||
        key.startsWith(this.config.bookMetadata.prefix)
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['bookMetadata'], 'readwrite');
      const store = transaction.objectStore('bookMetadata');
      await store.clear();
    }

    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalQueries: 0,
      averageResponseTime: 0,
      lastCleanup: Date.now()
    };
    this.saveStats();

    console.log('[CacheManager] Cleared all cache');
  }
}

// Create singleton instance
export const cacheManager = new CacheManager(); 