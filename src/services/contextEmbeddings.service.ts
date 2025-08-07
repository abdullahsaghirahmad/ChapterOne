/**
 * Client-Side Context Embeddings Service
 * 
 * Generates real-time embeddings for user context to enable instant similarity search
 * against pre-computed book embeddings. Optimized for speed and user experience.
 */

import { SemanticEmbeddingsService, UserContext, SimilaritySearchResult } from './semanticEmbeddings.service';
import { Book } from '../types';
import { supabase } from '../lib/supabase';

export interface ContextualQuery {
  mood?: string;
  situation?: string;
  goal?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  customText?: string;
}

export interface RecommendationOptions {
  limit?: number;
  minSimilarity?: number;
  includeBookDetails?: boolean;
}

export interface ContextualRecommendation extends SimilaritySearchResult {
  book: Book;
  contextMatch: {
    primaryFactors: string[];
    confidence: number;
  };
}

export interface EmbeddingCacheEntry {
  context: UserContext;
  embedding: number[];
  timestamp: number;
}

export class ContextEmbeddingsService {
  private static readonly LOG_PREFIX = '[CONTEXT_EMBEDDINGS]';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static embeddingCache = new Map<string, EmbeddingCacheEntry>();

  /**
   * Generate cache key for context
   */
  private static getCacheKey(context: UserContext): string {
    const normalized = {
      mood: context.mood?.toLowerCase().trim(),
      situation: context.situation?.toLowerCase().trim(),
      goal: context.goal?.toLowerCase().trim(),
      timeOfDay: context.timeOfDay?.toLowerCase().trim(),
      dayOfWeek: context.dayOfWeek?.toLowerCase().trim(),
      customText: context.customText?.toLowerCase().trim()
    };
    
    return JSON.stringify(normalized);
  }

  /**
   * Check if cached embedding is still valid
   */
  private static isCacheValid(entry: EmbeddingCacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  /**
   * Get context embedding (with caching for performance)
   */
  static async getContextEmbedding(context: UserContext): Promise<number[]> {
    const cacheKey = this.getCacheKey(context);
    const cached = this.embeddingCache.get(cacheKey);

    // Return cached embedding if valid
    if (cached && this.isCacheValid(cached)) {
      console.log(`${this.LOG_PREFIX} Using cached embedding for context`);
      return cached.embedding;
    }

    // Generate new embedding
    console.log(`${this.LOG_PREFIX} Generating new context embedding`);
    const embedding = await SemanticEmbeddingsService.generateContextEmbedding(context);

    // Cache the result
    this.embeddingCache.set(cacheKey, {
      context,
      embedding,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (this.embeddingCache.size > 50) {
      this.cleanCache();
    }

    return embedding;
  }

  /**
   * Clean expired cache entries
   */
  private static cleanCache(): void {
    const now = Date.now();
    Array.from(this.embeddingCache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.embeddingCache.delete(key);
      }
    });
    console.log(`${this.LOG_PREFIX} Cleaned cache, ${this.embeddingCache.size} entries remaining`);
  }

  /**
   * Get contextual book recommendations
   */
  static async getContextualRecommendations(
    query: ContextualQuery,
    options: RecommendationOptions = {}
  ): Promise<ContextualRecommendation[]> {
    const startTime = Date.now();
    const {
      limit = 10,
      minSimilarity = 0.15,
      includeBookDetails = true
    } = options;

    try {
      console.log(`${this.LOG_PREFIX} Getting recommendations for context:`, query);

      // Generate context embedding
      const contextEmbedding = await this.getContextEmbedding(query);

      // Find similar books
      const similarBooks = await SemanticEmbeddingsService.findSimilarBooks(
        contextEmbedding,
        limit,
        minSimilarity
      );

      if (similarBooks.length === 0) {
        console.log(`${this.LOG_PREFIX} No similar books found`);
        return [];
      }

      // Enrich with book details if requested
      let recommendations: ContextualRecommendation[] = [];

      if (includeBookDetails) {
        const bookIds = similarBooks.map(item => item.bookId);
        const { data: books, error } = await supabase
          .from('book')
          .select('*')
          .in('id', bookIds);

        if (error) {
          console.error(`${this.LOG_PREFIX} Error fetching book details:`, error);
          return [];
        }

        recommendations = similarBooks
          .map(item => {
            const book = books?.find(b => b.id === item.bookId);
            if (!book) return null;

            return {
              ...item,
              book,
              contextMatch: this.analyzeContextMatch(query, book, item.similarity)
            };
          })
          .filter((item): item is ContextualRecommendation => item !== null);
      } else {
        // Return without book details
        recommendations = similarBooks.map(item => ({
          ...item,
          book: { id: item.bookId } as Book, // Minimal book object
          contextMatch: {
            primaryFactors: [],
            confidence: item.similarity
          }
        }));
      }

      const duration = Date.now() - startTime;
      console.log(`${this.LOG_PREFIX} Found ${recommendations.length} recommendations in ${duration}ms`);

      return recommendations;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting recommendations:`, error);
      return [];
    }
  }

  /**
   * Analyze how well a book matches the user's context
   */
  private static analyzeContextMatch(
    query: ContextualQuery,
    book: Book,
    similarity: number
  ): { primaryFactors: string[]; confidence: number } {
    const factors: string[] = [];

    // Analyze mood matching
    if (query.mood) {
      const moodKeywords = this.getMoodKeywords(query.mood);
      const bookText = `${book.description} ${book.tone?.join(' ')} ${book.themes?.join(' ')}`.toLowerCase();
      
      if (moodKeywords.some(keyword => bookText.includes(keyword))) {
        factors.push(`mood: ${query.mood}`);
      }
    }

    // Analyze goal matching
    if (query.goal) {
      const goalKeywords = this.getGoalKeywords(query.goal);
      const bookCategories = book.categories?.join(' ').toLowerCase() || '';
      const bookThemes = book.themes?.join(' ').toLowerCase() || '';
      
      if (goalKeywords.some(keyword => 
        bookCategories.includes(keyword) || bookThemes.includes(keyword)
      )) {
        factors.push(`goal: ${query.goal}`);
      }
    }

    // Analyze situation matching
    if (query.situation) {
      // Simple heuristics for situation matching
      const situationFactors = this.getSituationFactors(query.situation);
      if (situationFactors.length > 0) {
        factors.push(`situation: ${query.situation}`);
      }
    }

    // Calculate confidence based on similarity and factor matching
    const factorBonus = Math.min(factors.length * 0.05, 0.2); // Up to 20% bonus
    const confidence = Math.min(similarity + factorBonus, 1.0);

    return {
      primaryFactors: factors.slice(0, 3), // Top 3 factors
      confidence
    };
  }

  /**
   * Get keywords associated with different moods
   */
  private static getMoodKeywords(mood: string): string[] {
    const moodMap: Record<string, string[]> = {
      curious: ['learn', 'discover', 'explore', 'knowledge', 'science', 'mystery'],
      relaxed: ['calm', 'peaceful', 'gentle', 'soothing', 'meditation', 'nature'],
      focused: ['productivity', 'goals', 'achievement', 'business', 'strategy', 'success'],
      adventurous: ['adventure', 'travel', 'exploration', 'journey', 'quest', 'excitement'],
      contemplative: ['philosophy', 'wisdom', 'reflection', 'spiritual', 'meaning', 'deep'],
      energetic: ['action', 'fast-paced', 'dynamic', 'thriller', 'excitement', 'intense']
    };

    return moodMap[mood.toLowerCase()] || [];
  }

  /**
   * Get keywords associated with different goals
   */
  private static getGoalKeywords(goal: string): string[] {
    const goalMap: Record<string, string[]> = {
      'learn something new': ['education', 'learning', 'knowledge', 'skill', 'tutorial', 'guide'],
      'relax and unwind': ['relaxation', 'stress relief', 'calm', 'peaceful', 'gentle'],
      'solve a problem': ['problem solving', 'strategy', 'methodology', 'solution', 'practical'],
      'be entertained': ['entertainment', 'fun', 'humor', 'comedy', 'engaging', 'captivating'],
      'get inspired': ['inspiration', 'motivation', 'success', 'achievement', 'uplifting'],
      'understand others': ['psychology', 'relationships', 'empathy', 'communication', 'social']
    };

    return goalMap[goal.toLowerCase()] || [];
  }

  /**
   * Get factors associated with different situations
   */
  private static getSituationFactors(situation: string): string[] {
    const situationMap: Record<string, string[]> = {
      commuting: ['short chapters', 'engaging', 'easy to follow'],
      'at home': ['immersive', 'detailed', 'comprehensive'],
      traveling: ['portable', 'engaging', 'escapist'],
      working: ['productivity', 'professional development', 'skills'],
      'before sleep': ['calming', 'peaceful', 'light reading'],
      'coffee break': ['short', 'inspiring', 'thought-provoking']
    };

    return situationMap[situation.toLowerCase()] || [];
  }

  /**
   * Get smart context suggestions based on current time/day
   */
  static getSmartContextSuggestions(): Partial<UserContext> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    let timeOfDay: string;
    let suggestedMood: string;
    let suggestedSituation: string;

    // Determine time of day
    if (hour < 6) {
      timeOfDay = 'early morning';
      suggestedMood = 'contemplative';
      suggestedSituation = 'quiet time';
    } else if (hour < 12) {
      timeOfDay = 'morning';
      suggestedMood = 'energetic';
      suggestedSituation = 'commuting';
    } else if (hour < 17) {
      timeOfDay = 'afternoon';
      suggestedMood = 'focused';
      suggestedSituation = 'working';
    } else if (hour < 21) {
      timeOfDay = 'evening';
      suggestedMood = 'relaxed';
      suggestedSituation = 'at home';
    } else {
      timeOfDay = 'night';
      suggestedMood = 'contemplative';
      suggestedSituation = 'before sleep';
    }

    // Weekend adjustments
    const isWeekend = dayOfWeek === 'saturday' || dayOfWeek === 'sunday';
    if (isWeekend && hour > 8 && hour < 18) {
      suggestedMood = 'curious';
      suggestedSituation = 'leisure time';
    }

    return {
      timeOfDay,
      dayOfWeek,
      mood: suggestedMood,
      situation: suggestedSituation
    };
  }

  /**
   * Clear embedding cache (useful for testing or memory management)
   */
  static clearCache(): void {
    this.embeddingCache.clear();
    console.log(`${this.LOG_PREFIX} Cache cleared`);
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; oldestEntry: number | null; hitRate: number } {
    const now = Date.now();
    let oldestEntry: number | null = null;

    Array.from(this.embeddingCache.values()).forEach(entry => {
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    });

    // Simple hit rate calculation would require more tracking
    // For now, return basic stats
    return {
      size: this.embeddingCache.size,
      oldestEntry: oldestEntry ? now - oldestEntry : null,
      hitRate: 0 // Would need additional tracking to calculate
    };
  }
}