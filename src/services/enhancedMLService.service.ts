/**
 * Enhanced ML Service with Semantic Embeddings Integration
 * 
 * Integrates the new server-side semantic embeddings service with the existing 
 * contextual bandits and recommendation engine for superior performance.
 */

import { FeatureFlagService } from './featureFlag.service';
import { JSSemanticSimilarityService } from './jsSimilarity.service';
import { MLService, ContextVector, MLRecommendation } from './ml.service';
import { Book } from '../types';

export interface EnhancedMLRecommendation extends MLRecommendation {
  semanticMatch?: {
    similarity: number;
    contextFactors: string[];
    confidence: number;
  };
  recommendationSource: 'semantic_embeddings' | 'traditional_ml' | 'hybrid';
  processingTime: number;
}

export interface RecommendationStrategy {
  useSemanticEmbeddings: boolean;
  fallbackToTraditional: boolean;
  hybridWeighting?: {
    semantic: number;
    traditional: number;
  };
}

export class EnhancedMLService {
  private static readonly LOG_PREFIX = '[ENHANCED_ML]';
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly MIN_SIMILARITY_THRESHOLD = 0.15;

  /**
   * Get enhanced contextual recommendations with semantic embeddings integration
   */
  static async getEnhancedContextualRecommendations(
    contextVector: ContextVector,
    candidateBooks: Book[],
    userId?: string,
    limit: number = this.DEFAULT_LIMIT
  ): Promise<EnhancedMLRecommendation[]> {
    const startTime = Date.now();
    
    try {
      console.log(`${this.LOG_PREFIX} Generating enhanced recommendations with semantic integration`);

      // Check if JavaScript similarity feature is enabled
      const jsSemanticEnabled = await FeatureFlagService.isFeatureEnabled('semantic_embeddings_v1', userId);
      
      if (jsSemanticEnabled) {
        console.log(`${this.LOG_PREFIX} Using JavaScript semantic similarity approach`);
        return this.getJSSemanticRecommendations(contextVector, candidateBooks, userId, limit, startTime);
      } else {
        console.log(`${this.LOG_PREFIX} Falling back to traditional ML approach`);
        return this.getTraditionalRecommendations(contextVector, candidateBooks, userId, limit, startTime);
      }

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in enhanced recommendations:`, error);
      // Fallback to traditional approach on error
      return this.getTraditionalRecommendations(contextVector, candidateBooks, userId, limit, startTime);
    }
  }

  /**
   * Get recommendations using JavaScript semantic similarity (new approach)
   */
  private static async getJSSemanticRecommendations(
    contextVector: ContextVector,
    candidateBooks: Book[],
    userId?: string,
    limit: number = this.DEFAULT_LIMIT,
    startTime: number = Date.now()
  ): Promise<EnhancedMLRecommendation[]> {
    try {
      // Convert context vector to user context for similarity search
      const userContext = this.convertContextVectorToUserContext(contextVector);

      // Get contextual recommendations using JavaScript similarity
      const contextualRecommendations = await JSSemanticSimilarityService.getContextualRecommendations(
        userContext,
        limit * 2 // Get more candidates for better filtering
      );

      if (contextualRecommendations.length === 0) {
        console.log(`${this.LOG_PREFIX} No JavaScript semantic recommendations found, falling back to traditional`);
        return this.getTraditionalRecommendations(contextVector, candidateBooks, userId, limit, startTime);
      }

      // Filter to only include books from candidate list
      const candidateBookIds = new Set(candidateBooks.map(book => book.id));
      const filteredRecommendations = contextualRecommendations
        .filter(rec => candidateBookIds.has(rec.book.id))
        .slice(0, limit);

      // Convert to enhanced ML recommendations
      const enhancedRecommendations: EnhancedMLRecommendation[] = filteredRecommendations.map(rec => {
        const processingTime = Date.now() - startTime;
        const confidenceScore = this.mapConfidenceToScore(rec.confidence);
        
        return {
          book: rec.book,
          score: rec.contextMatch,
          sources: {
            semantic: rec.contextMatch,
            contextual: confidenceScore,
            collaborative: 0.1 // Minimal collaborative weight for pure semantic
          },
          explanation: [
            `${Math.round(rec.contextMatch * 100)}% context match`,
            rec.reason,
            'Found using JavaScript semantic similarity'
          ],
          confidence: confidenceScore,
          semanticMatch: {
            similarity: rec.contextMatch,
            contextFactors: [rec.reason],
            confidence: confidenceScore
          },
          recommendationSource: 'semantic_embeddings',
          processingTime
        };
      });

      console.log(`${this.LOG_PREFIX} Generated ${enhancedRecommendations.length} semantic-based recommendations`);
      return enhancedRecommendations;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in semantic recommendations:`, error);
      return this.getTraditionalRecommendations(contextVector, candidateBooks, userId, limit, startTime);
    }
  }

  /**
   * Get recommendations using traditional ML approach (fallback)
   */
  private static async getTraditionalRecommendations(
    contextVector: ContextVector,
    candidateBooks: Book[],
    userId?: string,
    limit: number = this.DEFAULT_LIMIT,
    startTime: number = Date.now()
  ): Promise<EnhancedMLRecommendation[]> {
    try {
      // Use existing ML service
      const traditionalRecommendations = await MLService.getContextualRecommendations(
        contextVector,
        candidateBooks,
        userId,
        limit
      );

      // Convert to enhanced format
      const enhancedRecommendations: EnhancedMLRecommendation[] = traditionalRecommendations.map(rec => {
        const processingTime = Date.now() - startTime;
        
        return {
          ...rec,
          semanticMatch: undefined, // No semantic data available
          recommendationSource: 'traditional_ml',
          processingTime
        };
      });

      console.log(`${this.LOG_PREFIX} Generated ${enhancedRecommendations.length} traditional ML recommendations`);
      return enhancedRecommendations;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in traditional recommendations:`, error);
      return []; // Return empty on complete failure
    }
  }

  /**
   * Get hybrid recommendations (combines semantic and traditional approaches)
   */
  static async getHybridRecommendations(
    contextVector: ContextVector,
    candidateBooks: Book[],
    userId?: string,
    limit: number = this.DEFAULT_LIMIT,
    weights: { semantic: number; traditional: number } = { semantic: 0.7, traditional: 0.3 }
  ): Promise<EnhancedMLRecommendation[]> {
    const startTime = Date.now();
    
    try {
      console.log(`${this.LOG_PREFIX} Generating hybrid recommendations with weights:`, weights);

      // For the hybrid approach, use the JavaScript semantic recommendations
      const jsSemanticEnabled = await FeatureFlagService.isFeatureEnabled('semantic_embeddings_v1', userId);
      
      if (!jsSemanticEnabled) {
        console.log(`${this.LOG_PREFIX} JavaScript semantic similarity not enabled, using traditional only`);
        return this.getTraditionalRecommendations(contextVector, candidateBooks, userId, limit, startTime);
      }

      // Get recommendations from both approaches
      const [semanticRecommendations, traditionalRecommendations] = await Promise.all([
        this.getJSSemanticRecommendations(contextVector, candidateBooks, userId, limit * 2, startTime),
        this.getTraditionalRecommendations(contextVector, candidateBooks, userId, limit * 2, startTime)
      ]);

      // Create a map to merge recommendations for the same book
      const mergedRecommendations = new Map<string, EnhancedMLRecommendation>();

      // Process semantic recommendations
      semanticRecommendations.forEach((rec: EnhancedMLRecommendation) => {
        const hybridScore = rec.score * weights.semantic;
        mergedRecommendations.set(rec.book.id, {
          ...rec,
          score: hybridScore,
          recommendationSource: 'hybrid',
          explanation: [
            `Hybrid recommendation (${Math.round(weights.semantic * 100)}% semantic, ${Math.round(weights.traditional * 100)}% traditional)`,
            ...rec.explanation
          ]
        });
      });

      // Merge traditional recommendations
      traditionalRecommendations.forEach((rec: EnhancedMLRecommendation) => {
        const existing = mergedRecommendations.get(rec.book.id);
        if (existing) {
          // Combine scores
          existing.score += rec.score * weights.traditional;
          existing.sources.contextual = Math.max(existing.sources.contextual, rec.sources.contextual);
          existing.sources.collaborative = Math.max(existing.sources.collaborative, rec.sources.collaborative);
          existing.confidence = Math.max(existing.confidence, rec.confidence);
          
          // Combine explanations
          existing.explanation = [
            ...existing.explanation,
            ...rec.explanation.filter(exp => !existing.explanation.includes(exp))
          ];
        } else {
          // Add as traditional-only recommendation
          const hybridScore = rec.score * weights.traditional;
          mergedRecommendations.set(rec.book.id, {
            ...rec,
            score: hybridScore,
            recommendationSource: 'hybrid',
            explanation: [
              `Hybrid recommendation (${Math.round(weights.semantic * 100)}% semantic, ${Math.round(weights.traditional * 100)}% traditional)`,
              ...rec.explanation
            ]
          });
        }
      });

      // Sort by combined score and return top results
      const finalRecommendations = Array.from(mergedRecommendations.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      console.log(`${this.LOG_PREFIX} Generated ${finalRecommendations.length} hybrid recommendations`);
      return finalRecommendations;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in hybrid recommendations:`, error);
      return this.getTraditionalRecommendations(contextVector, candidateBooks, userId, limit, startTime);
    }
  }

  /**
   * Convert ContextVector to UserContext for semantic embeddings
   */
  private static convertContextVectorToUserContext(contextVector: ContextVector): any {
    return {
      mood: contextVector.mood,
      situation: contextVector.situation,
      goal: contextVector.goal,
      timeOfDay: contextVector.timeOfDay,
      dayOfWeek: contextVector.dayOfWeek
    };
  }

  /**
   * Get recommendation performance analytics
   */
  static async getRecommendationAnalytics(userId?: string): Promise<{
    semanticEnabled: boolean;
    semanticConfigured: boolean;
    lastProcessingTime: number;
    recommendationSource: string;
  }> {
    const semanticEnabled = await FeatureFlagService.isFeatureEnabled('semantic_embeddings_v1', userId);
    const semanticConfigured = true; // JavaScript similarity is always configured

    return {
      semanticEnabled,
      semanticConfigured,
      lastProcessingTime: 0, // Would be tracked in production
      recommendationSource: semanticEnabled && semanticConfigured ? 'semantic_embeddings' : 'traditional_ml'
    };
  }

  /**
   * Map confidence level to numeric score
   */
  private static mapConfidenceToScore(confidence: 'high' | 'medium' | 'low'): number {
    switch (confidence) {
      case 'high': return 0.8;
      case 'medium': return 0.6;
      case 'low': return 0.4;
      default: return 0.5;
    }
  }

  /**
   * Precompute embeddings for new books (admin function)
   */
  static async precomputeBookEmbeddings(books: Book[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    console.log(`${this.LOG_PREFIX} Refreshing JavaScript similarity corpus with ${books.length} books`);
    
    try {
      // For JavaScript similarity, we just refresh the corpus
      await JSSemanticSimilarityService.refresh();
      
      console.log(`${this.LOG_PREFIX} JavaScript similarity refresh complete`);

      return {
        successful: books.length,
        failed: 0,
        errors: []
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error refreshing JavaScript similarity corpus:`, error);
      
      return {
        successful: 0,
        failed: books.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}