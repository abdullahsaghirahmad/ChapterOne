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
   * Get personalized recommendations
   */
  const getRecommendations = useCallback(async (
    availableBooks: Book[],
    count: number = 10
  ): Promise<PersonalizedRecommendation[]> => {
    if (!user?.id || !isPersonalizationEnabled) return [];

    setLoadingRecommendations(true);
    try {
      const recommendations = await personalizationService.getPersonalizedRecommendations(
        user.id,
        availableBooks,
        count
      );
      
      setRecommendations(recommendations);
      console.log(`[PERSONALIZATION_HOOK] Generated ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      console.error('[PERSONALIZATION_HOOK] Error getting recommendations:', error);
      return [];
    } finally {
      setLoadingRecommendations(false);
    }
  }, [user?.id, isPersonalizationEnabled]);

  /**
   * Get personalization insights
   */
  const getInsights = useCallback(async (): Promise<PersonalizationInsights | null> => {
    if (!user?.id || !isPersonalizationEnabled) return null;

    setLoadingInsights(true);
    try {
      const insights = await personalizationService.getPersonalizationInsights(user.id);
      setInsights(insights);
      console.log('[PERSONALIZATION_HOOK] Generated insights:', insights);
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
    if (!user?.id || !isPersonalizationEnabled) return [];

    try {
      const suggestions = await personalizationService.getPrefetchSuggestions(user.id);
      setPrefetchSuggestions(suggestions);
      console.log('[PERSONALIZATION_HOOK] Generated prefetch suggestions:', suggestions);
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

  // Auto-load prefetch suggestions when user logs in
  useEffect(() => {
    if (user?.id && isPersonalizationEnabled) {
      getPrefetchSuggestions();
    }
  }, [user?.id, isPersonalizationEnabled, getPrefetchSuggestions]);

  return {
    trackSearch,
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
  const { trackBookInteraction, isPersonalizationEnabled } = usePersonalization();
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);

  // Track when book card comes into view
  const onViewStart = useCallback(() => {
    if (isPersonalizationEnabled) {
      setViewStartTime(Date.now());
    }
  }, [isPersonalizationEnabled]);

  // Track when user clicks on the book
  const onBookClick = useCallback(() => {
    if (isPersonalizationEnabled) {
      const durationMs = viewStartTime ? Date.now() - viewStartTime : undefined;
      trackBookInteraction(
        book.id,
        book.title,
        book.author,
        'click',
        context,
        durationMs
      );
    }
  }, [book, context, trackBookInteraction, viewStartTime, isPersonalizationEnabled]);

  // Track when book card goes out of view
  const onViewEnd = useCallback(() => {
    if (isPersonalizationEnabled && viewStartTime) {
      const durationMs = Date.now() - viewStartTime;
      if (durationMs > 2000) { // Only track if viewed for more than 2 seconds
        trackBookInteraction(
          book.id,
          book.title,
          book.author,
          'view',
          context,
          durationMs
        );
      }
      setViewStartTime(null);
    }
  }, [book, context, trackBookInteraction, viewStartTime, isPersonalizationEnabled]);

  return {
    onViewStart,
    onViewEnd,
    onBookClick,
    isTracking: isPersonalizationEnabled && viewStartTime !== null
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