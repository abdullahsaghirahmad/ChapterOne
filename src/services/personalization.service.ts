import { Book } from '../types';
import { cacheManager } from './cacheManager.service';

// Helper function to normalize theme/profession arrays that can be strings or objects
const normalizeStringArray = (items: (string | { type: string; value: string })[]): string[] => {
  return items.map(item => 
    typeof item === 'string' ? item.toLowerCase() : 
    typeof item === 'object' && item.value ? item.value.toLowerCase() : ''
  ).filter(item => item !== '');
};

// User behavior tracking interfaces
export interface UserSearchPattern {
  query: string;
  searchType: string;
  timestamp: number;
  resultsCount: number;
  clickedBooks: string[];
  searchDuration: number;
}

export interface UserBookInteraction {
  bookId: string;
  title: string;
  author: string;
  interactionType: 'view' | 'save' | 'click' | 'search';
  timestamp: number;
  durationMs?: number;
  context?: string; // e.g., 'search_result', 'recommendation', 'thread'
}

export interface UserPreferences {
  favoriteGenres: string[];
  favoriteAuthors: string[];
  preferredThemes: string[];
  readingPace: 'slow' | 'moderate' | 'fast';
  preferredTones: string[];
  professionInterests: string[];
  avgSessionDuration: number;
  searchFrequency: number;
  lastActiveDate: string;
}

export interface PersonalizationInsights {
  topGenres: Array<{genre: string, score: number}>;
  recommendedAuthors: Array<{author: string, reason: string}>;
  suggestedThemes: Array<{theme: string, confidence: number}>;
  personalityProfile: {
    explorationLevel: 'conservative' | 'moderate' | 'adventurous';
    genreDiversity: number;
    consistencyScore: number;
  };
  nextSearchPredictions: string[];
}

export interface RecommendationReason {
  type: 'similar_author' | 'same_genre' | 'theme_match' | 'profession_relevant' | 'trending' | 'social_signal';
  confidence: number;
  explanation: string;
  evidence: string[];
}

export interface PersonalizedRecommendation {
  book: Book;
  score: number;
  reasons: RecommendationReason[];
  category: 'perfect_match' | 'good_fit' | 'explore_new' | 'trending';
}

export class PersonalizationService {
  private readonly STORAGE_PREFIX = 'chapterone_user_';
  private readonly MAX_SEARCH_HISTORY = 100;
  private readonly MAX_INTERACTION_HISTORY = 500;
  private readonly RECOMMENDATION_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours
  private readonly LOG_PREFIX = '[PERSONALIZATION]';

  constructor() {
    console.log(`${this.LOG_PREFIX} Personalization service initialized`);
  }

  /**
   * Track user search behavior
   */
  async trackSearch(
    userId: string,
    query: string,
    searchType: string,
    resultsCount: number,
    searchDuration: number
  ): Promise<void> {
    try {
      const searchPattern: UserSearchPattern = {
        query: query.toLowerCase().trim(),
        searchType,
        timestamp: Date.now(),
        resultsCount,
        clickedBooks: [],
        searchDuration
      };

      const searches = await this.getUserSearchHistory(userId);
      searches.unshift(searchPattern);
      
      // Keep only recent searches
      const trimmedSearches = searches.slice(0, this.MAX_SEARCH_HISTORY);
      
      await this.saveUserData(userId, 'searches', trimmedSearches);
      
      // Update user preferences based on search patterns
      await this.updateUserPreferences(userId);
      
      console.log(`${this.LOG_PREFIX} Tracked search for user ${userId}: "${query}"`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error tracking search:`, error);
    }
  }

  /**
   * Track user book interactions
   */
  async trackBookInteraction(
    userId: string,
    bookId: string,
    title: string,
    author: string,
    interactionType: UserBookInteraction['interactionType'],
    context?: string,
    durationMs?: number
  ): Promise<void> {
    try {
      const interaction: UserBookInteraction = {
        bookId,
        title: title.toLowerCase(),
        author: author.toLowerCase(),
        interactionType,
        timestamp: Date.now(),
        durationMs,
        context
      };

      const interactions = await this.getUserInteractionHistory(userId);
      interactions.unshift(interaction);
      
      const trimmedInteractions = interactions.slice(0, this.MAX_INTERACTION_HISTORY);
      await this.saveUserData(userId, 'interactions', trimmedInteractions);

      // Update clicked books in recent searches if this was a click
      if (interactionType === 'click') {
        await this.updateSearchClickData(userId, bookId);
      }

      // Update preferences
      await this.updateUserPreferences(userId);
      
      console.log(`${this.LOG_PREFIX} Tracked ${interactionType} for user ${userId}: ${title}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error tracking interaction:`, error);
    }
  }

  /**
   * Get personalized book recommendations
   */
  async getPersonalizedRecommendations(
    userId: string,
    availableBooks: Book[],
    count: number = 10
  ): Promise<PersonalizedRecommendation[]> {
    try {
      console.log(`${this.LOG_PREFIX} Generating recommendations for user ${userId}`);
      
      // Check cache first
      const cacheKey = `recommendations_${userId}_${count}`;
      const cached = await this.getCachedData(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.RECOMMENDATION_CACHE_TTL) {
        console.log(`${this.LOG_PREFIX} Returning cached recommendations`);
        return cached.data;
      }

      const preferences = await this.getUserPreferences(userId);
      const interactions = await this.getUserInteractionHistory(userId);
      const searches = await this.getUserSearchHistory(userId);

      const recommendations: PersonalizedRecommendation[] = [];

      for (const book of availableBooks) {
        const score = await this.calculateBookScore(book, preferences, interactions, searches);
        const reasons = await this.generateRecommendationReasons(book, preferences, interactions);
        
        if (score > 0.3) { // Minimum relevance threshold
          const category = this.categorizeRecommendation(score, reasons);
          
          recommendations.push({
            book,
            score,
            reasons,
            category
          });
        }
      }

      // Sort by score and take top results
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, count);

      // Cache results
      await this.setCachedData(cacheKey, sortedRecommendations);

      console.log(`${this.LOG_PREFIX} Generated ${sortedRecommendations.length} recommendations`);
      return sortedRecommendations;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error generating recommendations:`, error);
      return [];
    }
  }

  /**
   * Get personalization insights for a user
   */
  async getPersonalizationInsights(userId: string): Promise<PersonalizationInsights> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const interactions = await this.getUserInteractionHistory(userId);
      const searches = await this.getUserSearchHistory(userId);

      // Analyze top genres from interactions
      const genreFrequency = new Map<string, number>();
      interactions.forEach(interaction => {
        // This would need book metadata to extract genres - simplified for now
        const genres = ['fiction', 'non-fiction', 'science', 'history']; // Mock genres
        genres.forEach(genre => {
          if (interaction.title.includes(genre)) {
            genreFrequency.set(genre, (genreFrequency.get(genre) || 0) + 1);
          }
        });
      });

      const topGenres = Array.from(genreFrequency.entries())
        .map(([genre, count]) => ({ genre, score: count / interactions.length }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Analyze author preferences
      const authorFrequency = new Map<string, number>();
      interactions.forEach(interaction => {
        authorFrequency.set(interaction.author, (authorFrequency.get(interaction.author) || 0) + 1);
      });

      const recommendedAuthors = Array.from(authorFrequency.entries())
        .map(([author, count]) => ({
          author,
          reason: count > 2 ? 'You seem to enjoy this author\'s work' : 'Based on your reading pattern'
        }))
        .slice(0, 5);

      // Generate search predictions based on patterns
      const queryFrequency = new Map<string, number>();
      searches.forEach(search => {
        const words = search.query.split(' ');
        words.forEach(word => {
          if (word.length > 3) { // Ignore short words
            queryFrequency.set(word, (queryFrequency.get(word) || 0) + 1);
          }
        });
      });

      const nextSearchPredictions = Array.from(queryFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      // Calculate personality profile
      const uniqueAuthors = new Set(interactions.map(i => i.author)).size;
      const genreDiversity = genreFrequency.size / Math.max(interactions.length / 10, 1);
      
      const explorationLevel = genreDiversity > 0.7 ? 'adventurous' : 
                             genreDiversity > 0.4 ? 'moderate' : 'conservative';

      return {
        topGenres,
        recommendedAuthors,
        suggestedThemes: preferences.preferredThemes.map(theme => ({
          theme,
          confidence: 0.8 // Simplified confidence score
        })),
        personalityProfile: {
          explorationLevel,
          genreDiversity: Math.min(genreDiversity, 1),
          consistencyScore: uniqueAuthors > 0 ? 1 - (uniqueAuthors / interactions.length) : 0
        },
        nextSearchPredictions
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error generating insights:`, error);
      return {
        topGenres: [],
        recommendedAuthors: [],
        suggestedThemes: [],
        personalityProfile: {
          explorationLevel: 'moderate',
          genreDiversity: 0,
          consistencyScore: 0
        },
        nextSearchPredictions: []
      };
    }
  }

  /**
   * Predict and prefetch likely searches for a user
   */
  async getPrefetchSuggestions(userId: string): Promise<string[]> {
    try {
      const searches = await this.getUserSearchHistory(userId);
      const preferences = await this.getUserPreferences(userId);
      
      // Analyze search patterns
      const recentSearches = searches.slice(0, 10);

      // Simple prediction based on recent patterns
      const suggestions: string[] = [];

      // Add variations of recent successful searches
      recentSearches
        .filter(search => search.resultsCount > 5)
        .forEach(search => {
          const words = search.query.split(' ');
          if (words.length > 1) {
            // Suggest partial queries
            suggestions.push(words.slice(0, -1).join(' '));
            // Suggest expanded queries
            preferences.favoriteGenres.forEach(genre => {
              suggestions.push(`${search.query} ${genre}`);
            });
          }
        });

      // Add genre-based suggestions
      preferences.favoriteGenres.forEach(genre => {
        suggestions.push(genre);
        preferences.favoriteAuthors.forEach(author => {
          suggestions.push(`${author} ${genre}`);
        });
      });

      // Remove duplicates and limit
      const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 5);
      
      console.log(`${this.LOG_PREFIX} Generated ${uniqueSuggestions.length} prefetch suggestions for user ${userId}`);
      return uniqueSuggestions;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error generating prefetch suggestions:`, error);
      return [];
    }
  }

  /**
   * Clear user personalization data
   */
  async clearUserData(userId: string): Promise<void> {
    try {
      await this.removeUserData(userId, 'searches');
      await this.removeUserData(userId, 'interactions');
      await this.removeUserData(userId, 'preferences');
      
      // Clear caches
      await cacheManager.clearUserCache(userId);
      
      console.log(`${this.LOG_PREFIX} Cleared all data for user ${userId}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error clearing user data:`, error);
    }
  }

  /**
   * Get aggregated search analytics across all users
   */
  async getSearchAnalytics(timeRangeHours: number = 168): Promise<{
    totalSearches: number;
    totalHelperUsage: number;
    inspirationPanelOpens: number;
    topHelpers: Array<{
      type: string;
      value: string;
      count: number;
      percentage: number;
    }>;
    searchPatterns: Array<{
      searchType: string;
      count: number;
      averageResults: number;
    }>;
    userTypes: {
      anonymous: number;
      authenticated: number;
    };
  }> {
    try {
      const cutoffTime = Date.now() - (timeRangeHours * 60 * 60 * 1000);
      const allSearches: Array<UserSearchPattern & { userId: string }> = [];
      const helperUsage: Map<string, number> = new Map();
      const searchTypeStats: Map<string, { count: number; totalResults: number }> = new Map();
      let inspirationPanelOpens = 0;
      let anonymousUsers = 0;
      let authenticatedUsers = 0;

      // Get all localStorage keys that match our pattern
      const userKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.STORAGE_PREFIX) && key.endsWith('_searches')
      );

      // Process each user's search data
      for (const key of userKeys) {
        try {
          const userId = key.replace(this.STORAGE_PREFIX, '').replace('_searches', '');
          const isAnonymous = userId === 'anonymous';
          
          if (isAnonymous) {
            anonymousUsers++;
          } else {
            authenticatedUsers++;
          }

          const userData = localStorage.getItem(key);
          if (!userData) continue;

          const searches: UserSearchPattern[] = JSON.parse(userData);
          
          // Filter by time range
          const recentSearches = searches.filter(search => search.timestamp >= cutoffTime);
          
          // Add to overall collection
          recentSearches.forEach(search => {
            allSearches.push({ ...search, userId });

            // Track search helper usage
            if (search.searchType.startsWith('search_helper_')) {
              const helperType = search.searchType.replace('search_helper_', '');
              const helperKey = `${helperType}:${search.query}`;
              helperUsage.set(helperKey, (helperUsage.get(helperKey) || 0) + 1);
            }

            // Track inspiration panel opens
            if (search.query === 'open_inspiration_panel') {
              inspirationPanelOpens = inspirationPanelOpens + 1;
            }

            // Track search type statistics
            const stats = searchTypeStats.get(search.searchType) || { count: 0, totalResults: 0 };
            stats.count++;
            stats.totalResults += search.resultsCount || 0;
            searchTypeStats.set(search.searchType, stats);
          });
        } catch (error) {
          console.warn(`${this.LOG_PREFIX} Error processing user data for key ${key}:`, error);
        }
      }

      // Calculate helper usage stats
      const totalHelperSearches = Array.from(helperUsage.values()).reduce((sum, count) => sum + count, 0);
      const topHelpers = Array.from(helperUsage.entries())
        .map(([key, count]) => {
          const [type, value] = key.split(':');
          return {
            type,
            value,
            count,
            percentage: totalHelperSearches > 0 ? (count / totalHelperSearches) * 100 : 0
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

      // Calculate search pattern stats
      const searchPatterns = Array.from(searchTypeStats.entries())
        .map(([searchType, stats]) => ({
          searchType,
          count: stats.count,
          averageResults: stats.count > 0 ? Math.round(stats.totalResults / stats.count) : 0
        }))
        .sort((a, b) => b.count - a.count);

      const result = {
        totalSearches: allSearches.length,
        totalHelperUsage: totalHelperSearches,
        inspirationPanelOpens,
        topHelpers,
        searchPatterns,
        userTypes: {
          anonymous: anonymousUsers,
          authenticated: authenticatedUsers
        }
      };

      console.log(`${this.LOG_PREFIX} Generated analytics for ${timeRangeHours}h:`, result);
      return result;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error generating search analytics:`, error);
      // Return empty data structure
      return {
        totalSearches: 0,
        totalHelperUsage: 0,
        inspirationPanelOpens: 0,
        topHelpers: [],
        searchPatterns: [],
        userTypes: { anonymous: 0, authenticated: 0 }
      };
    }
  }

  // Private helper methods

  private async getUserSearchHistory(userId: string): Promise<UserSearchPattern[]> {
    const data = await this.getUserData(userId, 'searches');
    return data || [];
  }

  private async getUserInteractionHistory(userId: string): Promise<UserBookInteraction[]> {
    const data = await this.getUserData(userId, 'interactions');
    return data || [];
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const data = await this.getUserData(userId, 'preferences');
    return data || {
      favoriteGenres: [],
      favoriteAuthors: [],
      preferredThemes: [],
      readingPace: 'moderate',
      preferredTones: [],
      professionInterests: [],
      avgSessionDuration: 0,
      searchFrequency: 0,
      lastActiveDate: new Date().toISOString()
    };
  }

  private async updateUserPreferences(userId: string): Promise<void> {
    const searches = await this.getUserSearchHistory(userId);
    const interactions = await this.getUserInteractionHistory(userId);
    
    if (searches.length === 0 && interactions.length === 0) return;

    // Extract preferences from user behavior
    const authorFrequency = new Map<string, number>();
    const themeFrequency = new Map<string, number>();
    
    interactions.forEach(interaction => {
      authorFrequency.set(interaction.author, (authorFrequency.get(interaction.author) || 0) + 1);
      
      // Extract themes from titles (simplified)
      const themes = this.extractThemesFromTitle(interaction.title);
      themes.forEach(theme => {
        themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1);
      });
    });

    const favoriteAuthors = Array.from(authorFrequency.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([author]) => author);

    const preferredThemes = Array.from(themeFrequency.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([theme]) => theme);

    // Calculate session patterns
    const recentSearches = searches.slice(0, 20);
    const avgSessionDuration = recentSearches.reduce((sum, search) => sum + search.searchDuration, 0) / recentSearches.length || 0;
    
    const preferences: UserPreferences = {
      favoriteGenres: this.extractGenresFromInteractions(interactions),
      favoriteAuthors,
      preferredThemes,
      readingPace: this.inferReadingPace(interactions),
      preferredTones: this.extractTonesFromInteractions(interactions),
      professionInterests: this.extractProfessionInterests(interactions),
      avgSessionDuration,
      searchFrequency: searches.length,
      lastActiveDate: new Date().toISOString()
    };

    await this.saveUserData(userId, 'preferences', preferences);
  }

  private async updateSearchClickData(userId: string, bookId: string): Promise<void> {
    const searches = await this.getUserSearchHistory(userId);
    
    // Add book to clicked books in the most recent search
    if (searches.length > 0) {
      searches[0].clickedBooks.push(bookId);
      await this.saveUserData(userId, 'searches', searches);
    }
  }

  private async calculateBookScore(
    book: Book,
    preferences: UserPreferences,
    interactions: UserBookInteraction[],
    searches: UserSearchPattern[]
  ): Promise<number> {
    let score = 0;

    // Author preference match
    if (preferences.favoriteAuthors.includes(book.author.toLowerCase())) {
      score += 0.4;
    }

    // Theme preference match
    const normalizedBookThemes = normalizeStringArray(book.themes || []);
    const themeMatches = normalizedBookThemes.filter(theme => 
      preferences.preferredThemes.includes(theme)
    ).length;
    score += (themeMatches / Math.max(normalizedBookThemes.length, 1)) * 0.3;

    // Profession relevance
    const normalizedBookProfessions = normalizeStringArray(book.professions || []);
    const professionMatches = normalizedBookProfessions.filter(prof => 
      preferences.professionInterests.includes(prof)
    ).length;
    score += (professionMatches / Math.max(normalizedBookProfessions.length, 1)) * 0.2;

    // Recency boost for trending interactions
    const recentInteractions = interactions.slice(0, 10);
    const hasRecentSimilarInteraction = recentInteractions.some(interaction => 
      interaction.author.toLowerCase() === book.author.toLowerCase() ||
      interaction.title.toLowerCase().includes(book.title.toLowerCase().split(' ')[0])
    );
    if (hasRecentSimilarInteraction) {
      score += 0.1;
    }

    return Math.min(score, 1); // Cap at 1.0
  }

  private async generateRecommendationReasons(
    book: Book,
    preferences: UserPreferences,
    interactions: UserBookInteraction[]
  ): Promise<RecommendationReason[]> {
    const reasons: RecommendationReason[] = [];

    // Author-based reasoning
    if (preferences.favoriteAuthors.includes(book.author.toLowerCase())) {
      reasons.push({
        type: 'similar_author',
        confidence: 0.9,
        explanation: `You've enjoyed books by ${book.author} before`,
        evidence: [`Previous interactions with ${book.author}'s work`]
      });
    }

    // Theme-based reasoning
    const normalizedThemes = normalizeStringArray(book.themes || []);
    const matchingThemes = normalizedThemes.filter(theme =>
      preferences.preferredThemes.includes(theme)
    );
    if (matchingThemes.length > 0) {
      reasons.push({
        type: 'theme_match',
        confidence: 0.7,
        explanation: `Matches your interest in ${matchingThemes.join(', ')}`,
        evidence: matchingThemes
      });
    }

    // Profession relevance
    const normalizedProfessions = normalizeStringArray(book.professions || []);
    const matchingProfessions = normalizedProfessions.filter(prof =>
      preferences.professionInterests.includes(prof)
    );
    if (matchingProfessions.length > 0) {
      reasons.push({
        type: 'profession_relevant',
        confidence: 0.8,
        explanation: `Relevant to your professional interests`,
        evidence: matchingProfessions
      });
    }

    return reasons;
  }

  private categorizeRecommendation(
    score: number,
    reasons: RecommendationReason[]
  ): PersonalizedRecommendation['category'] {
    if (score >= 0.8) return 'perfect_match';
    if (score >= 0.6) return 'good_fit';
    if (score >= 0.4) return 'explore_new';
    return 'trending';
  }

  // Utility methods for data extraction
  private extractThemesFromTitle(title: string): string[] {
    const commonThemes = ['love', 'war', 'science', 'history', 'mystery', 'adventure', 'fantasy', 'romance'];
    return commonThemes.filter(theme => title.toLowerCase().includes(theme));
  }

  private extractGenresFromInteractions(interactions: UserBookInteraction[]): string[] {
    // Simplified genre extraction - would be enhanced with actual book metadata
    const genres = ['fiction', 'non-fiction', 'science', 'history', 'mystery', 'romance'];
    const genreCount = new Map<string, number>();
    
    interactions.forEach(interaction => {
      genres.forEach(genre => {
        if (interaction.title.includes(genre)) {
          genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
        }
      });
    });

    return Array.from(genreCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
  }

  private inferReadingPace(interactions: UserBookInteraction[]): 'slow' | 'moderate' | 'fast' {
    const avgDuration = interactions
      .filter(i => i.durationMs)
      .reduce((sum, i) => sum + (i.durationMs || 0), 0) / interactions.length;
    
    if (avgDuration > 300000) return 'slow'; // > 5 minutes
    if (avgDuration > 120000) return 'moderate'; // > 2 minutes
    return 'fast';
  }

  private extractTonesFromInteractions(interactions: UserBookInteraction[]): string[] {
    // Simplified - would use actual book metadata
    return ['thoughtful', 'engaging', 'inspiring'];
  }

  private extractProfessionInterests(interactions: UserBookInteraction[]): string[] {
    // Extract from titles/authors - simplified implementation
    const professions = ['business', 'technology', 'medicine', 'education', 'law'];
    const professionCount = new Map<string, number>();
    
    interactions.forEach(interaction => {
      professions.forEach(profession => {
        if (interaction.title.includes(profession) || interaction.author.includes(profession)) {
          professionCount.set(profession, (professionCount.get(profession) || 0) + 1);
        }
      });
    });

    return Array.from(professionCount.entries())
      .filter(([_, count]) => count >= 1)
      .map(([profession]) => profession);
  }

  // Storage helper methods
  private async getUserData(userId: string, dataType: string): Promise<any> {
    try {
      const key = `${this.STORAGE_PREFIX}${userId}_${dataType}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting user data:`, error);
      return null;
    }
  }

  private async saveUserData(userId: string, dataType: string, data: any): Promise<void> {
    try {
      const key = `${this.STORAGE_PREFIX}${userId}_${dataType}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error saving user data:`, error);
    }
  }

  private async removeUserData(userId: string, dataType: string): Promise<void> {
    try {
      const key = `${this.STORAGE_PREFIX}${userId}_${dataType}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error removing user data:`, error);
    }
  }

  private async getCachedData(key: string): Promise<{data: any, timestamp: number} | null> {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  private async setCachedData(key: string, data: any): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error caching data:`, error);
    }
  }
}

export const personalizationService = new PersonalizationService(); 