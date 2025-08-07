import { supabase } from '../lib/supabase';
import { ContextEncoderService, EncodedContext } from './contextEncoder.service';
import { ContextualBanditsService, BanditRecommendation } from './contextualBandits.service';
import { EmbeddingsService } from './embeddings.service';
import { Book } from '../types';

// Types for ML operations
export interface BookEmbedding {
  id: string;
  bookId: string;
  embeddingModel: string;
  embeddingVector: number[];
  textContent: string;
  embeddingMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SemanticSimilarityResult {
  bookId: string;
  similarityScore: number;
  book?: Book;
}

export interface ContextVector {
  mood?: string;
  situation?: string;
  goal?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string;
  userHistory?: {
    favoriteGenres: string[];
    recentInteractions: string[];
    averageRating: number;
  };
}

export interface MLRecommendation {
  book: Book;
  score: number;
  sources: {
    semantic: number;
    contextual: number;
    collaborative: number;
  };
  explanation: string[];
  confidence: number;
}

export class MLService {
  private static readonly LOG_PREFIX = '[ML_SERVICE]';
  private static readonly HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
  private static readonly EMBEDDING_DIM = 384;
  private static readonly API_BASE = 'https://api-inference.huggingface.co';
  
  // Hugging Face Inference API (free tier)
  private static readonly HF_TOKEN = process.env.REACT_APP_HUGGING_FACE_TOKEN || '';

  /**
   * Generate text embedding using Hugging Face API
   * @deprecated Use EmbeddingsService.generateEmbedding() instead
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    console.log(`${this.LOG_PREFIX} Using EmbeddingsService for embedding generation`);
    return EmbeddingsService.generateEmbedding(text);
  }

  /**
   * Generate mock embedding for development/testing
   */
  private static generateMockEmbedding(text: string): number[] {
    console.log(`${this.LOG_PREFIX} Generating mock embedding for development`);
    
    // Create deterministic "embedding" based on text content
    const embedding = new Array(this.EMBEDDING_DIM).fill(0);
    
    // Simple hash-based approach for consistent mock embeddings
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Fill embedding with pseudo-random values based on hash
    for (let i = 0; i < this.EMBEDDING_DIM; i++) {
      const seed = hash + i;
      embedding[i] = (Math.sin(seed) * 10000) % 1.0; // Normalize to [-1, 1]
    }
    
    return embedding;
  }

  /**
   * Generate book embedding and store in database
   * @deprecated Use EmbeddingsService.generateBookEmbedding() instead
   */
  static async generateAndStoreBookEmbedding(book: Book): Promise<BookEmbedding | null> {
    console.log(`${this.LOG_PREFIX} Using EmbeddingsService for book embedding generation`);
    
    try {
      const result = await EmbeddingsService.generateBookEmbedding(book);
      if (result.success && result.embedding) {
        // Transform EmbeddingsService format to ML service format
        return {
          id: result.embedding.id,
          bookId: result.embedding.bookId,
          embeddingModel: result.embedding.embeddingModel,
          embeddingVector: result.embedding.embeddingVector,
          textContent: result.embedding.textContent,
          embeddingMetadata: result.embedding.embeddingMetadata,
          createdAt: result.embedding.createdAt,
          updatedAt: result.embedding.updatedAt
        };
      }
      return null;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error using EmbeddingsService:`, error);
      return null;
    }
  }

  /**
   * Get semantic similarity recommendations for a book
   */
  static async getSemanticSimilarRecommendations(
    targetBookId: string,
    candidateBooks: Book[],
    limit: number = 10
  ): Promise<SemanticSimilarityResult[]> {
    try {
      console.log(`${this.LOG_PREFIX} Finding semantic similarities for book ${targetBookId}`);

      // Get target book embedding
      const { data: targetEmbedding, error } = await supabase
        .from('book_embeddings')
        .select('embedding_vector')
        .eq('book_id', targetBookId)
        .maybeSingle();

      if (error || !targetEmbedding) {
        console.warn(`${this.LOG_PREFIX} No embedding found for target book ${targetBookId}`);
        return [];
      }

      const targetVector = targetEmbedding.embedding_vector;
      const similarities: SemanticSimilarityResult[] = [];

      // Calculate similarities with candidate books
      for (const book of candidateBooks) {
        if (book.id === targetBookId) continue; // Skip self

        const { data: candidateEmbedding } = await supabase
          .from('book_embeddings')
          .select('embedding_vector')
          .eq('book_id', book.id)
          .maybeSingle();

        if (candidateEmbedding) {
          const similarity = this.calculateCosineSimilarity(
            targetVector,
            candidateEmbedding.embedding_vector
          );

          similarities.push({
            bookId: book.id,
            similarityScore: similarity,
            book
          });
        }
      }

      // Sort by similarity and return top results
      const results = similarities
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      console.log(`${this.LOG_PREFIX} Found ${results.length} semantic similarities`);
      return results;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting semantic similarities:`, error);
      return [];
    }
  }

  /**
   * Get contextual recommendations using LinUCB bandit algorithm for strategy selection
   */
  static async getContextualRecommendations(
    contextVector: ContextVector,
    candidateBooks: Book[],
    userId?: string,
    limit: number = 10
  ): Promise<MLRecommendation[]> {
    try {
      console.log(`${this.LOG_PREFIX} Generating contextual recommendations using bandit strategy selection`, contextVector);

      // 🤖 Use contextual bandits to select the best recommendation strategy
      const banditRecommendation = await ContextualBanditsService.getBestRecommendationStrategy(
        contextVector,
        userId
      );

      console.log(`${this.LOG_PREFIX} Bandit selected strategy: ${banditRecommendation.armName} (confidence: ${banditRecommendation.confidence.toFixed(2)})`);

      // 🧠 Encode the context for enhanced scoring
      const encodedContext = ContextEncoderService.encodeContext(contextVector, userId);

      // Generate recommendations using the bandit-selected strategy
      const recommendations = await this.generateRecommendationsWithStrategy(
        banditRecommendation,
        contextVector,
        encodedContext,
        candidateBooks,
        userId,
        limit
      );

      console.log(`${this.LOG_PREFIX} Generated ${recommendations.length} bandit-optimized recommendations`);
      return recommendations;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error generating contextual recommendations:`, error);
      // Fallback to basic contextual recommendations
      return this.getBasicContextualRecommendations(contextVector, candidateBooks, userId, limit);
    }
  }

  /**
   * Generate recommendations using a specific bandit-selected strategy
   */
  private static async generateRecommendationsWithStrategy(
    banditRecommendation: BanditRecommendation,
    contextVector: ContextVector,
    encodedContext: EncodedContext,
    candidateBooks: Book[],
    userId?: string,
    limit: number = 10
  ): Promise<MLRecommendation[]> {
    const recommendations: MLRecommendation[] = [];

    // Apply strategy-specific scoring based on bandit selection
    for (const book of candidateBooks) {
      let score = await this.calculateEnhancedContextualScore(
        book, 
        contextVector, 
        encodedContext,
        userId
      );

      // Apply strategy-specific boosts based on bandit recommendation
      score = this.applyStrategyBoost(score, book, banditRecommendation);
      
      if (score > 0.3) { // Minimum threshold
        recommendations.push({
          book,
          score,
          sources: {
            semantic: score * 0.4, // Reduced base weight
            contextual: score * 0.35, // Increased context weight (bandit-optimized)
            collaborative: score * 0.25 // Increased collaborative weight
          },
          explanation: this.generateBanditEnhancedExplanation(
            book, 
            contextVector, 
            encodedContext, 
            banditRecommendation,
            score
          ),
          confidence: this.calculateBanditEnhancedConfidence(
            score, 
            book, 
            encodedContext, 
            banditRecommendation,
            userId
          )
        });
      }
    }

    // Sort by score and return top results
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Apply strategy-specific scoring boosts based on bandit recommendation
   */
  private static applyStrategyBoost(
    baseScore: number, 
    book: Book, 
    banditRecommendation: BanditRecommendation
  ): number {
    let score = baseScore;
    const strategyId = banditRecommendation.armId;

    // Apply strategy-specific boosts
    switch (strategyId) {
      case 'semantic_similarity':
        // Boost books with rich content metadata
        if (book.themes && book.themes.length > 3) score += 0.1;
        if (book.description && book.description.length > 200) score += 0.05;
        break;

      case 'contextual_mood':
        // Boost books that match mood indicators in their tone/themes
        if (book.tone && book.tone.length > 2) score += 0.1;
        break;

      case 'trending_popular':
        // Boost books with high ratings or recent popularity
        if (book.rating && book.rating > 4.0) score += 0.15;
        break;

      case 'collaborative_filtering':
        // Boost books with broader appeal (more categories)
        if (book.categories && book.categories.length > 2) score += 0.1;
        break;

      case 'personalized_mix':
        // Balanced approach - smaller boosts across multiple factors
        if (book.rating && book.rating > 3.5) score += 0.05;
        if (book.themes && book.themes.length > 1) score += 0.05;
        break;
    }

    // Apply exploration bonus for uncertain strategies
    if (banditRecommendation.explorationLevel > 0.3) {
      score += banditRecommendation.explorationLevel * 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Fallback to basic contextual recommendations (without bandits)
   */
  private static async getBasicContextualRecommendations(
    contextVector: ContextVector,
    candidateBooks: Book[],
    userId?: string,
    limit: number = 10
  ): Promise<MLRecommendation[]> {
    console.log(`${this.LOG_PREFIX} Using fallback basic contextual recommendations`);

    const encodedContext = ContextEncoderService.encodeContext(contextVector, userId);
    const recommendations: MLRecommendation[] = [];

    for (const book of candidateBooks) {
      const score = await this.calculateEnhancedContextualScore(
        book, 
        contextVector, 
        encodedContext,
        userId
      );
      
      console.log(`${this.LOG_PREFIX} Book "${book.title}" scored ${score.toFixed(3)}`);
      
      if (score > 0.2) { // Lowered threshold for better empty context handling
        recommendations.push({
          book,
          score,
          sources: {
            semantic: score * 0.6,
            contextual: score * 0.25,
            collaborative: score * 0.15
          },
          explanation: this.generateEnhancedExplanation(book, contextVector, encodedContext, score),
          confidence: this.calculateEnhancedConfidence(score, book, encodedContext, userId)
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Record bandit learning signal when user interacts with recommendation
   */
  static async recordBanditLearning(
    armId: string,
    context: ContextVector,
    reward: number,
    userId?: string
  ): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Recording bandit learning: ${armId} -> reward ${reward}`);
      
      await ContextualBanditsService.updateBanditModel(armId, context, reward, userId);
      
      console.log(`${this.LOG_PREFIX} Bandit model updated for strategy ${armId}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error recording bandit learning:`, error);
    }
  }

  /**
   * Batch generate embeddings for multiple books
   * @deprecated Use EmbeddingsService.batchGenerateEmbeddings() instead
   */
  static async batchGenerateEmbeddings(books: Book[]): Promise<{ success: number; failed: number }> {
    console.log(`${this.LOG_PREFIX} Using EmbeddingsService for batch embedding generation`);
    
    try {
      const result = await EmbeddingsService.batchGenerateEmbeddings(books);
      return {
        success: result.successful,
        failed: result.failed
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error using EmbeddingsService batch processing:`, error);
      return { success: 0, failed: books.length };
    }
  }

  // Helper methods

  private static createBookTextContent(book: Book): string {
    const parts = [
      book.title,
      book.author,
      book.description || '',
      ...(book.themes || []).map(t => typeof t === 'string' ? t : t.value || ''),
      ...(book.tone || []).map(t => typeof t === 'string' ? t : t.value || ''),
      ...(book.bestFor || []),
      ...(book.categories || []),
      ...(book.professions || [])
    ].filter(Boolean);

    return parts.join(' ').toLowerCase().trim();
  }

  private static calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Enhanced contextual scoring using encoded context vectors
   */
  private static async calculateEnhancedContextualScore(
    book: Book,
    context: ContextVector,
    encodedContext: EncodedContext,
    userId?: string
  ): Promise<number> {
    let score = 0.5; // Base score

    // 🎯 Use encoded context for more sophisticated matching
    const dimensions = encodedContext.dimensions;

    // Enhanced mood matching using semantic vectors
    if (context.mood && book.tone) {
      const toneStrings = book.tone.map(t => typeof t === 'string' ? t : t.value || '');
      const moodMatch = this.enhancedMoodMatching(dimensions.mood, toneStrings);
      score += moodMatch * 0.25; // Increased weight for better mood matching
    }

    // Enhanced situation matching using encoded situational features
    if (context.situation && book.bestFor) {
      const situationMatch = this.enhancedSituationMatching(dimensions.situation, book.bestFor);
      score += situationMatch * 0.2;
    }

    // Enhanced goal matching using encoded goal vectors
    if (context.goal && book.categories) {
      const goalMatch = this.enhancedGoalMatching(dimensions.goal, book.categories);
      score += goalMatch * 0.2;
    }

    // Sophisticated temporal matching using cyclical features
    const temporalMatch = this.enhancedTemporalMatching(dimensions.temporal, book);
    score += temporalMatch * 0.15;

    // User preference integration (if available)
    if (userId && dimensions.user) {
      const userMatch = this.enhancedUserMatching(dimensions.user, book, userId);
      score += userMatch * 0.1;
    }

    // Pace matching based on context
    if (context.situation) {
      const paceMatch = this.contextualPaceMatching(context, book);
      score += paceMatch * 0.1;
    }

    // 🔧 Fallback scoring for empty context - ensure some diversity
    const hasEmptyContext = !context.mood && !context.situation && !context.goal;
    if (hasEmptyContext) {
      // Add small random diversity bonus to ensure variety when context is empty
      score += Math.random() * 0.2;
      // Add quality-based fallback scoring
      if (book.rating && book.rating > 4.0) {
        score += 0.1; // Boost high-rated books
      }
      if (book.categories && book.categories.length > 0) {
        score += 0.05; // Slight boost for books with categories
      }
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Legacy contextual scoring (fallback)
   */
  private static async calculateContextualScore(
    book: Book,
    context: ContextVector,
    userId?: string
  ): Promise<number> {
    // Fallback to enhanced scoring with basic context encoding
    const encodedContext = ContextEncoderService.encodeContext(context, userId);
    return this.calculateEnhancedContextualScore(book, context, encodedContext, userId);
  }

  private static matchMoodToTone(mood: string, tones: string[]): number {
    const moodToneMap: Record<string, string[]> = {
      'motivated': ['inspiring', 'uplifting', 'energetic'],
      'relaxed': ['calm', 'peaceful', 'gentle'],
      'curious': ['intellectual', 'thought-provoking', 'informative'],
      'adventurous': ['exciting', 'thrilling', 'bold'],
      'nostalgic': ['sentimental', 'reflective', 'warm']
    };

    const targetTones = moodToneMap[mood.toLowerCase()] || [];
    if (targetTones.length === 0) return 0;

    const matches = tones.filter(tone => 
      targetTones.some(target => tone.toLowerCase().includes(target))
    );

    return matches.length / targetTones.length;
  }

  private static getTimeBasedAdjustment(timeOfDay: string, book: Book): number {
    // Simple time-based preferences
    if (timeOfDay === 'morning' && book.pace === 'Fast') return 0.1;
    if (timeOfDay === 'evening' && book.pace === 'Slow') return 0.1;
    if (timeOfDay === 'night' && book.themes?.includes('relaxing')) return 0.1;
    return 0;
  }

  /**
   * Enhanced explanation generation using encoded context
   */
  private static generateEnhancedExplanation(
    book: Book,
    context: ContextVector,
    encodedContext: EncodedContext,
    score: number
  ): string[] {
    const explanations: string[] = [];

    // Context-based explanations
    if (context.mood) {
      explanations.push(`Matches your ${context.mood} mood`);
    }
    
    if (context.situation) {
      explanations.push(`Perfect for ${context.situation.replace('_', ' ')} reading`);
    }

    if (context.goal) {
      explanations.push(`Aligns with your ${context.goal} goals`);
    }

    // Time-based explanations
    if (context.timeOfDay) {
      const timeExplanations = {
        'morning': 'Great way to start your day',
        'afternoon': 'Perfect afternoon read',
        'evening': 'Ideal for evening relaxation',
        'night': 'Good for winding down'
      };
      explanations.push(timeExplanations[context.timeOfDay] || 'Good timing for this book');
    }

    // Score-based explanations
    if (score > 0.8) {
      explanations.push('Highly recommended based on your current context');
    } else if (score > 0.6) {
      explanations.push('Good match for your preferences');
    }

    // Fallback explanation
    if (explanations.length === 0) {
      explanations.push('Recommended based on your reading context');
    }

    return explanations;
  }

  /**
   * Enhanced confidence calculation using encoded features
   */
  private static calculateEnhancedConfidence(
    score: number, 
    book: Book, 
    encodedContext: EncodedContext,
    userId?: string
  ): number {
    let confidence = score;
    
    // Book quality indicators
    if (book.rating && book.rating > 4.0) confidence += 0.1;
    
    // User-specific confidence
    if (userId) confidence += 0.1; // Higher confidence for authenticated users
    
    // Context richness (more context = higher confidence)
    const contextRichness = this.calculateContextRichness(encodedContext);
    confidence += contextRichness * 0.05;
    
    // Temporal consistency (reading at consistent times)
    const temporalConsistency = this.calculateTemporalConsistency(encodedContext.dimensions.temporal);
    confidence += temporalConsistency * 0.05;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Legacy explanation generation (fallback)
   */
  private static generateExplanation(
    book: Book,
    context: ContextVector,
    score: number
  ): string[] {
    const encodedContext = ContextEncoderService.encodeContext(context);
    return this.generateEnhancedExplanation(book, context, encodedContext, score);
  }

  /**
   * Legacy confidence calculation (fallback)
   */
  private static calculateConfidence(score: number, book: Book, userId?: string): number {
    const encodedContext = ContextEncoderService.encodeContext({});
    return this.calculateEnhancedConfidence(score, book, encodedContext, userId);
  }

  /**
   * Generate bandit-enhanced explanations
   */
  private static generateBanditEnhancedExplanation(
    book: Book,
    context: ContextVector,
    encodedContext: EncodedContext,
    banditRecommendation: BanditRecommendation,
    score: number
  ): string[] {
    const explanations = this.generateEnhancedExplanation(book, context, encodedContext, score);
    
    // Add bandit-specific explanations
    explanations.push(`Recommended by ${banditRecommendation.armName} strategy`);
    
    if (banditRecommendation.explorationLevel > 0.3) {
      explanations.push('Exploring new recommendation approach');
    } else {
      explanations.push('Proven strategy based on your preferences');
    }
    
    if (banditRecommendation.confidence > 0.7) {
      explanations.push('High confidence recommendation');
    }
    
    return explanations;
  }

  /**
   * Calculate bandit-enhanced confidence
   */
  private static calculateBanditEnhancedConfidence(
    score: number,
    book: Book,
    encodedContext: EncodedContext,
    banditRecommendation: BanditRecommendation,
    userId?: string
  ): number {
    const baseConfidence = this.calculateEnhancedConfidence(score, book, encodedContext, userId);
    
    // Boost confidence based on bandit certainty
    const banditBoost = banditRecommendation.confidence * 0.2;
    
    // Reduce confidence for high exploration (uncertainty)
    const explorationPenalty = banditRecommendation.explorationLevel * 0.1;
    
    return Math.min(1.0, baseConfidence + banditBoost - explorationPenalty);
  }

  // Enhanced matching methods

  private static enhancedMoodMatching(moodVector: number[], bookTones: string[]): number {
    // Enhanced mood matching using vector similarities
    // This is a simplified version - in practice would use pre-computed tone embeddings
    const moodStrength = moodVector.reduce((sum, val) => sum + val, 0) / moodVector.length;
    
    // Basic tone matching (would be enhanced with actual tone embeddings)
    const toneMatch = this.matchMoodToTone('', bookTones); // Use existing logic as baseline
    
    return Math.min(1.0, moodStrength * 0.5 + toneMatch * 0.5);
  }

  private static enhancedSituationMatching(situationVector: number[], bookBestFor: string[]): number {
    // Enhanced situation matching using encoded situation features
    const situationStrength = situationVector.reduce((sum, val) => sum + val, 0) / situationVector.length;
    
    // Contextual situation scoring
    let baseMatch = 0;
    if (bookBestFor.length > 0) {
      baseMatch = 0.5; // Base relevance if book has purpose info
    }
    
    return Math.min(1.0, situationStrength * 0.6 + baseMatch * 0.4);
  }

  private static enhancedGoalMatching(goalVector: number[], bookCategories?: string[]): number {
    // Enhanced goal matching using encoded goal features
    const goalStrength = goalVector.reduce((sum, val) => sum + val, 0) / goalVector.length;
    
    // Category alignment scoring
    let categoryMatch = 0;
    if (bookCategories && bookCategories.length > 0) {
      categoryMatch = 0.5; // Base category relevance
    }
    
    return Math.min(1.0, goalStrength * 0.7 + categoryMatch * 0.3);
  }

  private static enhancedTemporalMatching(temporalVector: number[], book: Book): number {
    // Enhanced temporal matching using cyclical time features
    // Extract time-based preferences from the temporal vector
    const timeStrength = temporalVector.slice(0, 4).reduce((sum, val) => sum + val, 0) / 4;
    
    // Simple temporal scoring based on book characteristics
    let temporalScore = 0.5; // Base temporal relevance
    
    // Adjust for book pace and time context
    if (book.pace === 'Fast' && timeStrength > 0.5) {
      temporalScore += 0.2; // Fast books for active times
    } else if (book.pace === 'Slow' && timeStrength < 0.5) {
      temporalScore += 0.2; // Slow books for relaxed times
    }
    
    return Math.min(1.0, temporalScore);
  }

  private static enhancedUserMatching(userVector: number[], book: Book, userId: string): number {
    // Enhanced user matching using encoded user features
    const userEngagement = userVector[3] || 0.5; // Engagement level
    const diversityScore = userVector[4] || 0.5; // Diversity seeking
    
    // Basic user preference scoring
    let userScore = userEngagement; // Base on engagement level
    
    // Adjust for diversity seeking
    if (diversityScore > 0.7) {
      userScore += 0.1; // Boost for diversity seekers
    }
    
    return Math.min(1.0, userScore);
  }

  private static contextualPaceMatching(context: ContextVector, book: Book): number {
    // Context-aware pace matching
    const paceMappings: Record<string, string[]> = {
      'commuting': ['Fast', 'Moderate'],
      'before_bed': ['Slow', 'Moderate'],
      'lunch_break': ['Fast'],
      'weekend': ['Slow', 'Moderate', 'Fast'],
      'studying': ['Slow', 'Moderate']
    };
    
    if (context.situation && book.pace) {
      const preferredPaces = paceMappings[context.situation] || [];
      const paceValue = typeof book.pace === 'string' ? book.pace : book.pace.value || book.pace.type;
      return preferredPaces.includes(paceValue) ? 0.2 : 0;
    }
    
    return 0;
  }

  private static calculateContextRichness(encodedContext: EncodedContext): number {
    // Calculate how much context information was provided
    const context = encodedContext.metadata.originalContext;
    let richness = 0;
    
    if (context.mood) richness += 0.25;
    if (context.situation) richness += 0.25;
    if (context.goal) richness += 0.25;
    if (context.timeOfDay) richness += 0.25;
    
    return richness;
  }

  private static calculateTemporalConsistency(temporalVector: number[]): number {
    // Simplified temporal consistency calculation
    // In practice, would compare with user's historical temporal patterns
    const timeVariance = temporalVector.reduce((sum, val, i, arr) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return sum + Math.pow(val - mean, 2);
    }, 0) / temporalVector.length;
    
    // Lower variance = higher consistency
    return Math.max(0, 1 - timeVariance);
  }

  private static transformBookEmbedding(data: any): BookEmbedding {
    return {
      id: data.id,
      bookId: data.book_id,
      embeddingModel: data.embedding_model,
      embeddingVector: data.embedding_vector,
      textContent: data.text_content,
      embeddingMetadata: data.embedding_metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}