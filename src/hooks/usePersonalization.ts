import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  personalizationService, 
  PersonalizedRecommendation, 
  PersonalizationInsights,
  UserBookInteraction 
} from '../services/personalization.service';
import { Book } from '../types';

export interface UsePersonalizationReturn {
  // Core functionality
  trackSearch: (query: string, searchType: string, resultsCount: number, searchDuration: number) => Promise<void>;
  trackInteraction: (type: string, title: string, durationMs?: number) => Promise<void>;
  trackBookInteraction: (
    bookId: string, 
    title: string, 
    author: string, 
    interactionType: UserBookInteraction['interactionType'],
    context?: string,
    durationMs?: number
  ) => Promise<void>;
  
  // Recommendations
  getRecommendations: (availableBooks: Book[], count?: number) => Promise<PersonalizedRecommendation[]>;
  recommendations: PersonalizedRecommendation[];
  loadingRecommendations: boolean;
  
  // Insights
  getInsights: () => Promise<PersonalizationInsights | null>;
  insights: PersonalizationInsights | null;
  loadingInsights: boolean;
  
  // Prefetching
  getPrefetchSuggestions: () => Promise<string[]>;
  prefetchSuggestions: string[];
  
  // User management
  clearPersonalizationData: () => Promise<void>;
  isPersonalizationEnabled: boolean;
}

export const usePersonalization = (): UsePersonalizationReturn => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [insights, setInsights] = useState<PersonalizationInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [prefetchSuggestions, setPrefetchSuggestions] = useState<string[]>([]);
  const [isPersonalizationEnabled, setIsPersonalizationEnabled] = useState(false);

  // Enable personalization when user is authenticated
  useEffect(() => {
    setIsPersonalizationEnabled(!!user?.id);
    
    // Clear state when user logs out
    if (!user?.id) {
      setRecommendations([]);
      setInsights(null);
      setPrefetchSuggestions([]);
    }
  }, [user?.id]);

  /**
   * Track user search behavior
   */
  const trackSearch = useCallback(async (
    query: string,
    searchType: string,
    resultsCount: number,
    searchDuration: number
  ): Promise<void> => {
    if (!user?.id || !isPersonalizationEnabled) return;

    try {
      await personalizationService.trackSearch(
        user.id,
        query,
        searchType,
        resultsCount,
        searchDuration
      );
      
      console.log('[PERSONALIZATION_HOOK] Search tracked:', query);
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error tracking search:', error);
    }
  }, [user?.id, isPersonalizationEnabled]);

  /**
   * Track user book interactions
   */
  const trackBookInteraction = useCallback(async (
    bookId: string,
    title: string,
    author: string,
    interactionType: UserBookInteraction['interactionType'],
    context?: string,
    durationMs?: number
  ): Promise<void> => {
    if (!user?.id || !isPersonalizationEnabled) return;

    try {
      await personalizationService.trackBookInteraction(
        user.id,
        bookId,
        title,
        author,
        interactionType,
        context,
        durationMs
      );
      
      console.log('[PERSONALIZATION_HOOK] Interaction tracked:', interactionType, title);
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error tracking interaction:', error);
    }
  }, [user?.id, isPersonalizationEnabled]);

  /**
   * Track simple interaction - wrapper around trackBookInteraction
   */
  const trackInteraction = useCallback(async (
    type: string, 
    title: string, 
    durationMs?: number
  ): Promise<void> => {
    if (!user?.id || !isPersonalizationEnabled) return;

    try {
      // Use trackBookInteraction with simplified parameters
      await personalizationService.trackBookInteraction(
        user.id,
        '', // bookId - empty for simple tracking
        title,
        '', // author - empty for simple tracking
        type as any, // interactionType
        'general', // context
        durationMs
      );
      
      console.log('[PERSONALIZATION_HOOK] Simple interaction tracked:', type, title);
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error tracking simple interaction:', error);
    }
  }, [user?.id, isPersonalizationEnabled]);

  /**
   * Get personalized recommendations
   */
  const getRecommendations = useCallback(async (
    availableBooks: Book[],
    count: number = 10
  ): Promise<PersonalizedRecommendation[]> => {
    if (!isPersonalizationEnabled || !user?.id || availableBooks.length === 0) {
      return [];
    }

    try {
      setLoadingRecommendations(true);
      const recs = await personalizationService.getPersonalizedRecommendations(
        user.id,
        availableBooks,
        count
      );
      setRecommendations(recs);
      return recs;
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error getting recommendations:', error);
      return [];
    } finally {
      setLoadingRecommendations(false);
    }
  }, [user?.id, isPersonalizationEnabled]); // Stable dependencies only

  /**
   * Get personalization insights
   */
  const getInsights = useCallback(async (): Promise<PersonalizationInsights | null> => {
    if (!isPersonalizationEnabled || !user?.id) {
      return null;
    }

    try {
      setLoadingInsights(true);
      const insights = await personalizationService.getPersonalizationInsights(user.id);
      setInsights(insights);
      return insights;
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error getting insights:', error);
      return null;
    } finally {
      setLoadingInsights(false);
    }
  }, [user?.id, isPersonalizationEnabled]);

  /**
   * Get prefetch suggestions
   */
  const getPrefetchSuggestions = useCallback(async (): Promise<string[]> => {
    if (!isPersonalizationEnabled || !user?.id) {
      return [];
    }

    try {
      const suggestions = await personalizationService.getPrefetchSuggestions(user.id);
      setPrefetchSuggestions(suggestions);
      return suggestions;
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error getting prefetch suggestions:', error);
      return [];
    }
  }, [user?.id, isPersonalizationEnabled]);

  /**
   * Clear all personalization data for the user
   */
  const clearPersonalizationData = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      await personalizationService.clearUserData(user.id);
      setRecommendations([]);
      setInsights(null);
      setPrefetchSuggestions([]);
      console.log('[PERSONALIZATION_HOOK] Cleared personalization data');
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error clearing data:', error);
    }
  }, [user?.id]);

  // Auto-load prefetch suggestions when user logs in - TEMPORARILY DISABLED
  // useEffect(() => {
  //   if (user?.id && isPersonalizationEnabled) {
  //     getPrefetchSuggestions();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [user?.id, isPersonalizationEnabled]);

  return {
    trackSearch,
    trackInteraction,
    trackBookInteraction,
    getRecommendations,
    recommendations,
    loadingRecommendations,
    getInsights,
    insights,
    loadingInsights,
    getPrefetchSuggestions,
    prefetchSuggestions,
    clearPersonalizationData,
    isPersonalizationEnabled
  };
};

/**
 * Hook for automatically tracking book card interactions
 */
export const useBookCardTracking = (
  book: Book,
  context: string = 'search_result'
) => {
  const { trackInteraction, isPersonalizationEnabled } = usePersonalization();
  const [isVisible, setIsVisible] = useState(false);
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);

  const onViewStart = useCallback(() => {
    if (isPersonalizationEnabled && !isVisible) {
      setIsVisible(true);
      setViewStartTime(Date.now());
      console.log('[BOOK_TRACKING] View started:', book.id);
    }
  }, [book.id, isPersonalizationEnabled, isVisible]); // Use book.id, not book object

  const onViewEnd = useCallback(() => {
    if (isPersonalizationEnabled && isVisible && viewStartTime) {
      const viewDuration = Date.now() - viewStartTime;
      trackInteraction('view', book.title, viewDuration);
      setIsVisible(false);
      setViewStartTime(null);
      console.log('[BOOK_TRACKING] View ended:', book.id, 'Duration:', viewDuration);
    }
  }, [book.id, book.title, isPersonalizationEnabled, isVisible, viewStartTime, trackInteraction]);

  const onBookClick = useCallback(() => {
    if (isPersonalizationEnabled) {
      trackInteraction('click', book.title);
      console.log('[BOOK_TRACKING] Book clicked:', book.id);
    }
  }, [book.id, book.title, isPersonalizationEnabled, trackInteraction]);

  return {
    onViewStart,
    onViewEnd,
    onBookClick,
    isTracking: isPersonalizationEnabled
  };
};

/**
 * Hook for tracking search performance and user engagement
 */
export const useSearchTracking = () => {
  const { trackSearch, isPersonalizationEnabled } = usePersonalization();
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  const startSearchTracking = useCallback(() => {
    if (isPersonalizationEnabled) {
      setSearchStartTime(Date.now());
    }
  }, [isPersonalizationEnabled]);

  const endSearchTracking = useCallback((
    query: string,
    searchType: string,
    resultsCount: number
  ) => {
    if (isPersonalizationEnabled && searchStartTime) {
      const searchDuration = Date.now() - searchStartTime;
      trackSearch(query, searchType, resultsCount, searchDuration);
      setSearchStartTime(null);
    }
  }, [trackSearch, searchStartTime, isPersonalizationEnabled]);

  return {
    startSearchTracking,
    endSearchTracking,
    isTracking: isPersonalizationEnabled && searchStartTime !== null
  };
}; 