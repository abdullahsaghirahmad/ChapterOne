import { ContextVector } from './ml.service';

// Types for context encoding
export interface EncodedContext {
  vector: number[];
  dimensions: {
    mood: number[];
    situation: number[];
    goal: number[];
    temporal: number[];
    user: number[];
  };
  metadata: {
    originalContext: ContextVector;
    encoding: string;
    timestamp: string;
    vectorLength: number;
  };
}

export interface ContextSimilarity {
  context1: string;
  context2: string;
  similarity: number;
  explanation: string;
}

export interface TemporalFeatures {
  timeOfDay: number[]; // [morning, afternoon, evening, night] cyclical encoding
  dayOfWeek: number[]; // [0-6] cyclical encoding  
  hourCyclical: number[]; // sin/cos encoding of hour
  isWeekend: number;
  seasonality: number[]; // quarterly patterns
}

export interface UserFeatures {
  preferenceHistory: number[];
  engagementLevel: number;
  diversityScore: number;
  newUserBonus: number;
}

export class ContextEncoderService {
  private static readonly LOG_PREFIX = '[CONTEXT_ENCODER]';
  
  // Context dimensions - designed for linear algebra operations
  private static readonly MOOD_DIM = 8;
  private static readonly SITUATION_DIM = 8; 
  private static readonly GOAL_DIM = 8;
  private static readonly TEMPORAL_DIM = 12;
  private static readonly USER_DIM = 8;
  private static readonly TOTAL_DIM = 44; // Sum of all dimensions

  // Mood encoding with semantic relationships
  private static readonly MOOD_MAPPINGS: Record<string, number[]> = {
    // Primary moods with semantic vectors
    'motivated': [1.0, 0.8, 0.6, 0.2, 0.0, 0.0, 0.0, 0.0], // High energy, goal-oriented
    'curious': [0.6, 1.0, 0.4, 0.8, 0.2, 0.0, 0.0, 0.0],   // Learning-focused, exploratory
    'relaxed': [0.0, 0.2, 0.0, 0.0, 1.0, 0.8, 0.6, 0.2],   // Low energy, peaceful
    'adventurous': [0.8, 0.6, 1.0, 0.4, 0.0, 0.0, 0.0, 0.0], // High energy, risk-taking
    'nostalgic': [0.2, 0.4, 0.0, 0.6, 0.8, 0.6, 1.0, 0.4], // Reflective, emotional
    'focused': [0.8, 0.9, 0.4, 0.6, 0.0, 0.0, 0.0, 0.0],   // Similar to motivated but more concentrated
    
    // Secondary moods - combinations of primary
    'excited': [0.9, 0.7, 0.8, 0.3, 0.0, 0.0, 0.0, 0.0],   // motivated + adventurous
    'contemplative': [0.2, 0.8, 0.0, 0.4, 0.6, 0.4, 0.8, 0.6], // curious + nostalgic
    'energetic': [0.9, 0.6, 0.7, 0.4, 0.0, 0.0, 0.0, 0.0], // motivated + adventurous
    'peaceful': [0.0, 0.1, 0.0, 0.0, 0.9, 0.8, 0.7, 0.3],  // enhanced relaxed
    'inspired': [0.7, 0.9, 0.5, 0.8, 0.2, 0.0, 0.0, 0.0],  // motivated + curious
    'thoughtful': [0.3, 0.7, 0.2, 0.5, 0.4, 0.3, 0.6, 0.4] // curious + nostalgic
  };

  private static readonly SITUATION_MAPPINGS: Record<string, number[]> = {
    // Location/time-based situations
    'commuting': [1.0, 0.0, 0.6, 0.4, 0.0, 0.0, 0.0, 0.0], // Mobile, time-constrained
    'before_bed': [0.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.0, 0.0], // Relaxing, winding down
    'weekend': [0.0, 1.0, 0.0, 0.0, 0.6, 0.4, 0.8, 0.0],   // Leisure, flexible time
    'lunch_break': [0.6, 0.0, 0.8, 0.6, 0.2, 0.0, 0.0, 0.0], // Quick, refreshing
    'traveling': [0.8, 0.2, 0.4, 0.6, 0.0, 0.0, 0.0, 0.0],  // Similar to commuting but longer
    'studying': [0.2, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 1.0],   // Focused, learning environment
    
    // Activity-based situations
    'break_time': [0.4, 0.6, 0.6, 0.4, 0.4, 0.2, 0.6, 0.0], // Mix of leisure and quick
    'waiting': [0.6, 0.2, 0.4, 0.8, 0.2, 0.0, 0.0, 0.0],    // Similar to commuting
    'vacation': [0.2, 0.8, 0.2, 0.2, 0.8, 0.6, 0.9, 0.0],   // Enhanced weekend
    'work_day': [0.4, 0.0, 0.6, 0.2, 0.0, 0.0, 0.0, 0.6],   // Focused but constrained
    'evening': [0.0, 0.4, 0.0, 0.0, 0.6, 1.0, 0.4, 0.0],    // Similar to before_bed
    'morning': [0.6, 0.2, 0.4, 0.8, 0.0, 0.0, 0.0, 0.4]     // Energetic start
  };

  private static readonly GOAL_MAPPINGS: Record<string, number[]> = {
    // Learning and growth goals
    'entertainment': [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], // Pure enjoyment
    'learning': [0.0, 1.0, 0.8, 0.6, 0.0, 0.0, 0.0, 0.0],      // Knowledge acquisition
    'professional': [0.0, 0.8, 1.0, 0.4, 0.0, 0.0, 0.0, 0.0],  // Career development
    'inspiration': [0.4, 0.6, 0.2, 1.0, 0.0, 0.0, 0.0, 0.0],   // Motivation, creativity
    'relaxation': [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],    // Stress relief
    'perspective': [0.2, 0.8, 0.4, 0.8, 0.0, 1.0, 0.0, 0.0],   // New viewpoints
    
    // Compound goals
    'skill_building': [0.0, 0.9, 0.8, 0.4, 0.0, 0.0, 0.0, 0.0], // learning + professional
    'escape': [0.8, 0.0, 0.0, 0.2, 0.8, 0.0, 0.0, 0.0],        // entertainment + relaxation
    'self_improvement': [0.2, 0.7, 0.6, 0.8, 0.0, 0.4, 0.0, 0.0], // learning + perspective + inspiration
    'creativity': [0.4, 0.5, 0.0, 0.9, 0.0, 0.6, 0.0, 0.0],    // inspiration + perspective
    'productivity': [0.0, 0.6, 0.9, 0.6, 0.0, 0.0, 0.0, 0.0],  // professional + learning
    'mindfulness': [0.0, 0.2, 0.0, 0.4, 0.9, 0.8, 0.0, 0.0]    // relaxation + perspective
  };

  /**
   * Encode a complete context into a numerical vector
   */
  static encodeContext(
    context: ContextVector, 
    userId?: string, 
    userFeatures?: Partial<UserFeatures>
  ): EncodedContext {
    try {
      console.log(`${this.LOG_PREFIX} Encoding context:`, context);

      // Encode each dimension
      const moodVector = this.encodeMood(context.mood);
      const situationVector = this.encodeSituation(context.situation);
      const goalVector = this.encodeGoal(context.goal);
      const temporalVector = this.encodeTemporalFeatures(context);
      const userVector = this.encodeUserFeatures(userId, userFeatures);

      // Combine all vectors
      const fullVector = [
        ...moodVector,
        ...situationVector,
        ...goalVector,
        ...temporalVector,
        ...userVector
      ];

      // Normalize the vector
      const normalizedVector = this.normalizeVector(fullVector);

      const encoded: EncodedContext = {
        vector: normalizedVector,
        dimensions: {
          mood: moodVector,
          situation: situationVector,
          goal: goalVector,
          temporal: temporalVector,
          user: userVector
        },
        metadata: {
          originalContext: context,
          encoding: this.generateContextSignature(context),
          timestamp: new Date().toISOString(),
          vectorLength: normalizedVector.length
        }
      };

      console.log(`${this.LOG_PREFIX} Encoded context to ${normalizedVector.length}D vector`);
      return encoded;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error encoding context:`, error);
      return this.getDefaultEncodedContext(context);
    }
  }

  /**
   * Encode mood into numerical vector
   */
  private static encodeMood(mood?: string): number[] {
    if (!mood || !this.MOOD_MAPPINGS[mood.toLowerCase()]) {
      return new Array(this.MOOD_DIM).fill(0); // Neutral mood
    }
    
    return [...this.MOOD_MAPPINGS[mood.toLowerCase()]];
  }

  /**
   * Encode situation into numerical vector
   */
  private static encodeSituation(situation?: string): number[] {
    if (!situation || !this.SITUATION_MAPPINGS[situation.toLowerCase()]) {
      return new Array(this.SITUATION_DIM).fill(0); // Neutral situation
    }
    
    return [...this.SITUATION_MAPPINGS[situation.toLowerCase()]];
  }

  /**
   * Encode goal into numerical vector
   */
  private static encodeGoal(goal?: string): number[] {
    if (!goal || !this.GOAL_MAPPINGS[goal.toLowerCase()]) {
      return new Array(this.GOAL_DIM).fill(0); // Neutral goal
    }
    
    return [...this.GOAL_MAPPINGS[goal.toLowerCase()]];
  }

  /**
   * Encode temporal features (time patterns)
   */
  private static encodeTemporalFeatures(context: ContextVector): number[] {
    const now = new Date();
    
    // Time of day encoding (cyclical)
    const hour = now.getHours();
    const timeOfDayHour = Math.sin(2 * Math.PI * hour / 24); // -1 to 1
    const timeOfDayHourCos = Math.cos(2 * Math.PI * hour / 24); // -1 to 1
    
    // Day of week encoding (cyclical)
    const dayOfWeek = now.getDay(); // 0-6
    const dayOfWeekSin = Math.sin(2 * Math.PI * dayOfWeek / 7);
    const dayOfWeekCos = Math.cos(2 * Math.PI * dayOfWeek / 7);
    
    // Time of day categories
    const timeCategories = this.getTimeOfDayVector(context.timeOfDay || this.getCurrentTimeOfDay());
    
    // Weekend indicator
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
    
    // Monthly/seasonal pattern (simplified)
    const month = now.getMonth(); // 0-11
    const seasonality = Math.sin(2 * Math.PI * month / 12);
    
    return [
      timeOfDayHour,    // Hour cyclical (sin)
      timeOfDayHourCos, // Hour cyclical (cos)
      dayOfWeekSin,     // Day cyclical (sin)
      dayOfWeekCos,     // Day cyclical (cos)
      ...timeCategories, // [morning, afternoon, evening, night] - 4 dims
      isWeekend,        // Weekend indicator
      seasonality,      // Seasonal pattern
      hour / 24,        // Normalized hour
      dayOfWeek / 7     // Normalized day
    ]; // Total: 12 dimensions
  }

  /**
   * Encode user features
   */
  private static encodeUserFeatures(userId?: string, features?: Partial<UserFeatures>): number[] {
    // Default user features
    const defaultFeatures: UserFeatures = {
      preferenceHistory: [0.5, 0.5, 0.5], // Neutral preferences [fiction, nonfiction, mixed]
      engagementLevel: 0.5, // Average engagement
      diversityScore: 0.5,  // Average diversity seeking
      newUserBonus: userId ? 0.0 : 1.0 // Boost for anonymous users
    };

    const userFeatures = { ...defaultFeatures, ...features };

    return [
      ...userFeatures.preferenceHistory, // 3 dims
      userFeatures.engagementLevel,      // 1 dim
      userFeatures.diversityScore,       // 1 dim  
      userFeatures.newUserBonus,         // 1 dim
      userId ? 1.0 : 0.0,               // Has account indicator
      0.0 // Reserved for future features
    ]; // Total: 8 dimensions
  }

  /**
   * Calculate similarity between two contexts
   */
  static calculateContextSimilarity(context1: ContextVector, context2: ContextVector): ContextSimilarity {
    try {
      const encoded1 = this.encodeContext(context1);
      const encoded2 = this.encodeContext(context2);
      
      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(encoded1.vector, encoded2.vector);
      
      // Generate explanation
      const explanation = this.generateSimilarityExplanation(context1, context2, similarity);
      
      return {
        context1: this.contextToString(context1),
        context2: this.contextToString(context2),
        similarity,
        explanation
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error calculating similarity:`, error);
      return {
        context1: this.contextToString(context1),
        context2: this.contextToString(context2),
        similarity: 0,
        explanation: 'Error calculating similarity'
      };
    }
  }

  /**
   * Find similar contexts from a set of historical contexts
   */
  static findSimilarContexts(
    targetContext: ContextVector,
    historicalContexts: ContextVector[],
    threshold: number = 0.7,
    limit: number = 5
  ): ContextSimilarity[] {
    const similarities = historicalContexts.map(context => 
      this.calculateContextSimilarity(targetContext, context)
    );

    return similarities
      .filter(sim => sim.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Helper methods

  private static getTimeOfDayVector(timeOfDay: string): number[] {
    const timeMap = {
      'morning': [1, 0, 0, 0],
      'afternoon': [0, 1, 0, 0],
      'evening': [0, 0, 1, 0],
      'night': [0, 0, 0, 1]
    };
    
    return timeMap[timeOfDay as keyof typeof timeMap] || [0, 0, 0, 0];
  }

  public static getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Generate smart time-based context defaults
   */
  public static getSmartTimeDefaults(): { mood: string; situation: string; goal: string } {
    const timeOfDay = this.getCurrentTimeOfDay();
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const defaults = {
      morning: {
        mood: 'motivated',
        situation: isWeekend ? 'weekend' : 'commuting',
        goal: 'learning'
      },
      afternoon: {
        mood: 'curious', 
        situation: isWeekend ? 'weekend' : 'lunch_break',
        goal: 'entertainment'
      },
      evening: {
        mood: 'relaxed',
        situation: isWeekend ? 'weekend' : 'evening',
        goal: 'escape'
      },
      night: {
        mood: 'peaceful',
        situation: 'before_bed',
        goal: 'relaxation'
      }
    };

    console.log(`${this.LOG_PREFIX} Generated smart defaults for ${timeOfDay} (${isWeekend ? 'weekend' : 'weekday'}):`, defaults[timeOfDay]);
    
    return defaults[timeOfDay];
  }

  /**
   * Check if context seems stale and suggest refresh
   */
  public static isContextStale(context: ContextVector, lastUpdated?: string): boolean {
    if (!lastUpdated) return false;

    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const hoursStale = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // Consider stale if:
    // - More than 6 hours old
    // - Time of day has changed significantly (morning to evening, etc.)
    const isTimeStale = hoursStale > 6;
    const currentTimeOfDay = this.getCurrentTimeOfDay();
    const hasTimeShifted = context.timeOfDay && context.timeOfDay !== currentTimeOfDay;

    return isTimeStale || !!hasTimeShifted;
  }

  /**
   * Get context persistence key for localStorage
   */
  public static getContextStorageKey(userId?: string): string {
    return userId ? `user_context_${userId}` : 'anonymous_user_context';
  }

  /**
   * Save context to localStorage
   */
  public static saveContext(context: ContextVector, userId?: string): void {
    try {
      const storageData = {
        ...context,
        lastUpdated: new Date().toISOString(),
        timeOfDay: this.getCurrentTimeOfDay() // Always use current time
      };
      
      const key = this.getContextStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(storageData));
      
      console.log(`${this.LOG_PREFIX} Context saved for ${userId ? 'user' : 'anonymous'}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error saving context:`, error);
    }
  }

  /**
   * Load context from localStorage with smart refresh
   */
  public static loadContext(userId?: string): ContextVector | null {
    try {
      const key = this.getContextStorageKey(userId);
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        console.log(`${this.LOG_PREFIX} No stored context found, using smart defaults`);
        return this.getSmartTimeDefaults();
      }

      const context = JSON.parse(stored);
      const currentTimeOfDay = this.getCurrentTimeOfDay();
      
      // Auto-refresh time of day
      context.timeOfDay = currentTimeOfDay;
      
      // Check if context is stale and suggest refresh
      if (this.isContextStale(context, context.lastUpdated)) {
        console.log(`${this.LOG_PREFIX} Context is stale, suggesting smart defaults`);
        const smartDefaults = this.getSmartTimeDefaults();
        
        // Keep user's explicit choices but refresh time-sensitive ones
        return {
          mood: context.mood || smartDefaults.mood,
          situation: context.situation || smartDefaults.situation,  
          goal: context.goal || smartDefaults.goal,
          timeOfDay: currentTimeOfDay
        };
      }

      console.log(`${this.LOG_PREFIX} Loaded stored context for ${userId ? 'user' : 'anonymous'}`);
      return context;
      
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error loading context:`, error);
      return this.getSmartTimeDefaults();
    }
  }

  private static normalizeVector(vector: number[]): number[] {
    // L2 normalization
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return vector; // Avoid division by zero
    }
    
    return vector.map(val => val / magnitude);
  }

  private static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
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

  private static generateContextSignature(context: ContextVector): string {
    const parts = [
      context.mood || 'none',
      context.situation || 'none', 
      context.goal || 'none',
      context.timeOfDay || 'none'
    ];
    
    return parts.join('|');
  }

  private static contextToString(context: ContextVector): string {
    const parts = [];
    if (context.mood) parts.push(`mood:${context.mood}`);
    if (context.situation) parts.push(`situation:${context.situation}`);
    if (context.goal) parts.push(`goal:${context.goal}`);
    if (context.timeOfDay) parts.push(`time:${context.timeOfDay}`);
    
    return parts.join(', ') || 'neutral context';
  }

  private static generateSimilarityExplanation(
    context1: ContextVector,
    context2: ContextVector,
    similarity: number
  ): string {
    const explanations = [];
    
    if (context1.mood === context2.mood && context1.mood) {
      explanations.push(`same mood (${context1.mood})`);
    }
    
    if (context1.situation === context2.situation && context1.situation) {
      explanations.push(`same situation (${context1.situation})`);
    }
    
    if (context1.goal === context2.goal && context1.goal) {
      explanations.push(`same goal (${context1.goal})`);
    }
    
    if (similarity > 0.8) {
      return `Very similar contexts: ${explanations.join(', ')}`;
    } else if (similarity > 0.6) {
      return `Similar contexts: ${explanations.join(', ')}`;
    } else if (similarity > 0.4) {
      return `Somewhat similar contexts: ${explanations.join(', ')}`;
    } else {
      return `Different contexts`;
    }
  }

  private static getDefaultEncodedContext(context: ContextVector): EncodedContext {
    const defaultVector = new Array(this.TOTAL_DIM).fill(0);
    
    return {
      vector: defaultVector,
      dimensions: {
        mood: new Array(this.MOOD_DIM).fill(0),
        situation: new Array(this.SITUATION_DIM).fill(0),
        goal: new Array(this.GOAL_DIM).fill(0),
        temporal: new Array(this.TEMPORAL_DIM).fill(0),
        user: new Array(this.USER_DIM).fill(0)
      },
      metadata: {
        originalContext: context,
        encoding: 'default',
        timestamp: new Date().toISOString(),
        vectorLength: defaultVector.length
      }
    };
  }
}