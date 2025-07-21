import { useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import { cacheManager, SearchCacheKey, CacheStats } from '../services/cacheManager.service';
import { useAuth } from '../contexts/AuthContext';

export interface CachedSearchResult {
  books: Book[];
  cached: boolean;
  responseTime: number;
  hitRate?: number;
}

export interface UseBookCacheReturn {
  // Core caching functions
  getCachedSearch: (searchParams: Omit<SearchCacheKey, 'userId'>) => Promise<Book[] | null>;
  cacheSearch: (searchParams: Omit<SearchCacheKey, 'userId'>, results: Book[]) => Promise<void>;
  
  // Analytics and performance
  getCacheStats: () => CacheStats;
  clearCache: () => Promise<void>;
  clearUserCache: () => Promise<void>;
  
  // Cache status
  isCacheReady: boolean;
  lastCacheTime: number | null;
}

export const useBookCache = (): UseBookCacheReturn => {
  const { user } = useAuth();
  const [isCacheReady, setIsCacheReady] = useState(false);
  const [lastCacheTime, setLastCacheTime] = useState<number | null>(null);

  // Initialize cache when hook mounts
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Cache manager initializes itself, we just need to wait a tick
        await new Promise(resolve => setTimeout(resolve, 0));
        setIsCacheReady(true);
        console.log('[useBookCache] Cache initialized');
      } catch (error) {
        console.error('[useBookCache] Failed to initialize cache:', error);
        setIsCacheReady(true); // Still mark as ready to allow fallback behavior
      }
    };

    initializeCache();
  }, []);

  // Get cached search results
  const getCachedSearch = useCallback(async (
    searchParams: Omit<SearchCacheKey, 'userId'>
  ): Promise<Book[] | null> => {
    if (!isCacheReady) {
      console.warn('[useBookCache] Cache not ready, skipping cache lookup');
      return null;
    }

    try {
      const fullSearchParams: SearchCacheKey = {
        ...searchParams,
        userId: user?.id // Include user ID for personalized caching
      };

      const cachedResults = await cacheManager.getCachedSearchResults(fullSearchParams);
      
      if (cachedResults) {
        console.log(`[useBookCache] Cache hit for search: ${searchParams.query} (${cachedResults.length} books)`);
        setLastCacheTime(Date.now());
      }
      
      return cachedResults;
    } catch (error) {
      console.error('[useBookCache] Error getting cached search:', error);
      return null;
    }
  }, [isCacheReady, user?.id]);

  // Cache search results
  const cacheSearch = useCallback(async (
    searchParams: Omit<SearchCacheKey, 'userId'>, 
    results: Book[]
  ): Promise<void> => {
    if (!isCacheReady) {
      console.warn('[useBookCache] Cache not ready, skipping cache storage');
      return;
    }

    try {
      const fullSearchParams: SearchCacheKey = {
        ...searchParams,
        userId: user?.id
      };

      await cacheManager.cacheSearchResults(fullSearchParams, results);
      setLastCacheTime(Date.now());
      
      console.log(`[useBookCache] Cached search results: ${searchParams.query} (${results.length} books)`);
      
      // Cache user preferences if user is logged in
      if (user?.id) {
        const preferences = {
          lastSearchType: searchParams.searchType,
          includeExternalPreference: searchParams.includeExternal,
          lastSearchTime: Date.now()
        };
        
        await cacheManager.cacheUserPreferences(user.id, preferences);
      }
    } catch (error) {
      console.error('[useBookCache] Error caching search:', error);
    }
  }, [isCacheReady, user?.id]);

  // Get cache statistics
  const getCacheStats = useCallback((): CacheStats => {
    return cacheManager.getStats();
  }, []);

  // Clear all cache
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await cacheManager.clearAllCache();
      setLastCacheTime(null);
      console.log('[useBookCache] All cache cleared');
    } catch (error) {
      console.error('[useBookCache] Error clearing cache:', error);
    }
  }, []);

  // Clear cache for current user
  const clearUserCache = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      console.warn('[useBookCache] No user logged in, cannot clear user cache');
      return;
    }

    try {
      await cacheManager.clearUserCache(user.id);
      setLastCacheTime(null);
      console.log(`[useBookCache] User cache cleared for: ${user.id}`);
    } catch (error) {
      console.error('[useBookCache] Error clearing user cache:', error);
    }
  }, [user?.id]);

  // Auto-clear cache when user logs out
  useEffect(() => {
    if (!user && lastCacheTime) {
      // User logged out, clear their specific cache
      console.log('[useBookCache] User logged out, clearing user-specific cache');
      // Note: We can't clear user-specific cache without user ID, 
      // but this will be handled by the cache expiration
    }
  }, [user, lastCacheTime]);

  return {
    getCachedSearch,
    cacheSearch,
    getCacheStats,
    clearCache,
    clearUserCache,
    isCacheReady,
    lastCacheTime
  };
};

// Enhanced search function that automatically handles caching
export const useCachedBookSearch = () => {
  const cache = useBookCache();
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState<number>(0);

  const searchWithCache = useCallback(async (
    searchParams: Omit<SearchCacheKey, 'userId'>,
    searchFunction: () => Promise<Book[]>
  ): Promise<CachedSearchResult> => {
    const startTime = Date.now();
    
    try {
      setIsSearching(true);
      
      // Try to get from cache first
      const cachedResults = await cache.getCachedSearch(searchParams);
      
      if (cachedResults) {
        const responseTime = Date.now() - startTime;
        console.log(`[useCachedBookSearch] Cache hit in ${responseTime}ms`);
        
        return {
          books: cachedResults,
          cached: true,
          responseTime,
          hitRate: cache.getCacheStats().hitRate
        };
      }

      // Cache miss - perform actual search
      console.log('[useCachedBookSearch] Cache miss, performing search');
      const searchResults = await searchFunction();
      
      // Cache the results
      await cache.cacheSearch(searchParams, searchResults);
      
      const responseTime = Date.now() - startTime;
      setLastSearchTime(responseTime);
      
      console.log(`[useCachedBookSearch] Search completed in ${responseTime}ms (${searchResults.length} books)`);
      
      return {
        books: searchResults,
        cached: false,
        responseTime,
        hitRate: cache.getCacheStats().hitRate
      };
      
    } catch (error) {
      console.error('[useCachedBookSearch] Search error:', error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  }, [cache]);

  return {
    searchWithCache,
    isSearching,
    lastSearchTime,
    cacheStats: cache.getCacheStats(),
    clearCache: cache.clearCache,
    clearUserCache: cache.clearUserCache
  };
}; 