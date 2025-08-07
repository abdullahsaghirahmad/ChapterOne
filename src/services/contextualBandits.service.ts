import { supabase } from '../lib/supabase';
import { requestDeduplicationService } from './requestDeduplication.service';
import { ContextEncoderService, EncodedContext } from './contextEncoder.service';
import { RewardSignalService } from './rewardSignal.service';
import { ContextVector } from './ml.service';

// Types for contextual bandits
export interface BanditArm {
  armId: string;
  name: string;
  description: string;
  type: 'recommendation_strategy' | 'book_category' | 'content_type';
  metadata: Record<string, any>;
}

export interface LinUCBModel {
  armId: string;
  theta: number[]; // Parameter vector (learned weights)
  A: number[][]; // Design matrix A (covariance matrix)
  b: number[]; // Reward vector b
  lastUpdated: string;
  interactionCount: number;
  totalReward: number;
  averageReward: number;
}

export interface BanditPrediction {
  armId: string;
  armName: string;
  predictedReward: number;
  upperConfidenceBound: number;
  explorationBonus: number;
  confidence: number;
  contextMatch: number;
}

export interface BanditRecommendation {
  armId: string;
  armName: string;
  strategy: string;
  books: any[]; // Will be populated by the selected strategy
  confidence: number;
  explorationLevel: number;
  explanation: string;
}

export interface BanditLearningResult {
  armId: string;
  oldReward: number;
  newReward: number;
  improvement: number;
  confidence: number;
  learningRate: number;
}

export class ContextualBanditsService {
  private static readonly LOG_PREFIX = '[CONTEXTUAL_BANDITS]';
  private static readonly CONTEXT_DIM = 44; // From our context encoder
  private static readonly ALPHA = 0.1; // Exploration parameter (higher = more exploration)
  private static readonly LAMBDA = 1.0; // Regularization parameter
  private static readonly MIN_INTERACTIONS = 5; // Minimum interactions before trusting the model

  // Available arms (recommendation strategies)
  private static readonly BANDIT_ARMS: BanditArm[] = [
    {
      armId: 'semantic_similarity',
      name: 'Content-Based',
      description: 'Recommendations based on book content similarity',
      type: 'recommendation_strategy',
      metadata: { priority: 'content_match', speed: 'fast' }
    },
    {
      armId: 'contextual_mood',
      name: 'Mood-Based',
      description: 'Recommendations matching current mood and situation',
      type: 'recommendation_strategy', 
      metadata: { priority: 'mood_match', speed: 'medium' }
    },
    {
      armId: 'trending_popular',
      name: 'Trending',
      description: 'Popular and trending books',
      type: 'recommendation_strategy',
      metadata: { priority: 'popularity', speed: 'fast' }
    },
    {
      armId: 'collaborative_filtering',
      name: 'Collaborative',
      description: 'Books liked by similar users',
      type: 'recommendation_strategy',
      metadata: { priority: 'user_similarity', speed: 'slow' }
    },
    {
      armId: 'personalized_mix',
      name: 'Personalized Mix',
      description: 'Balanced mix of different approaches',
      type: 'recommendation_strategy',
      metadata: { priority: 'balanced', speed: 'medium' }
    },
    {
      armId: 'contextual_basic',
      name: 'Basic Contextual',
      description: 'Default contextual recommendation strategy',
      type: 'recommendation_strategy',
      metadata: { priority: 'basic', speed: 'fast' }
    }
  ];

  /**
   * Get the best recommendation strategy using LinUCB algorithm
   */
  static async getBestRecommendationStrategy(
    context: ContextVector,
    userId?: string
  ): Promise<BanditRecommendation> {
    try {
      console.log(`${this.LOG_PREFIX} Selecting best strategy using LinUCB for context:`, context);

      // Encode the context into feature vector
      const encodedContext = ContextEncoderService.encodeContext(context, userId);
      const contextVector = encodedContext.vector;

      // Load or initialize models for each arm
      const models = await this.loadLinUCBModels(userId);

      // Calculate predictions and confidence bounds for each arm
      const predictions: BanditPrediction[] = [];
      
      for (const arm of this.BANDIT_ARMS) {
        const model = models[arm.armId];
        const prediction = this.calculateLinUCBPrediction(model, contextVector, arm);
        predictions.push(prediction);
      }

      // Select the arm with highest upper confidence bound (exploration + exploitation)
      const selectedPrediction = predictions.reduce((best, current) => 
        current.upperConfidenceBound > best.upperConfidenceBound ? current : best
      );

      // Generate recommendation based on selected strategy
      const recommendation = await this.generateRecommendationFromStrategy(
        selectedPrediction, 
        context, 
        encodedContext,
        userId
      );

      console.log(`${this.LOG_PREFIX} Selected strategy: ${selectedPrediction.armName} (UCB: ${selectedPrediction.upperConfidenceBound.toFixed(3)})`);

      return recommendation;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in LinUCB strategy selection:`, error);
      return this.getFallbackRecommendation(context);
    }
  }

  /**
   * Update bandit model when reward is observed
   */
  static async updateBanditModel(
    armId: string,
    context: ContextVector,
    reward: number,
    userId?: string
  ): Promise<BanditLearningResult> {
    try {
      console.log(`${this.LOG_PREFIX} Updating model for arm ${armId} with reward ${reward}`);

      // Encode context
      const encodedContext = ContextEncoderService.encodeContext(context, userId);
      const contextVector = encodedContext.vector;

      // Load current model
      const models = await this.loadLinUCBModels(userId);
      const model = models[armId];

      if (!model) {
        throw new Error(`Model not found for arm ${armId}`);
      }

      // Store old reward for comparison
      const oldReward = model.averageReward;

      // LinUCB update equations
      // A = A + x * x^T (where x is context vector)
      // b = b + r * x (where r is reward)
      
      // Update A matrix (A = A + x * x^T)
      for (let i = 0; i < this.CONTEXT_DIM; i++) {
        for (let j = 0; j < this.CONTEXT_DIM; j++) {
          model.A[i][j] += contextVector[i] * contextVector[j];
        }
      }

      // Update b vector (b = b + r * x)
      for (let i = 0; i < this.CONTEXT_DIM; i++) {
        model.b[i] += reward * contextVector[i];
      }

      // Update statistics
      model.interactionCount += 1;
      model.totalReward += reward;
      model.averageReward = model.totalReward / model.interactionCount;
      model.lastUpdated = new Date().toISOString();

      // Recalculate theta (θ = A^-1 * b)
      try {
        model.theta = this.matrixVectorMultiply(
          this.invertMatrix(model.A), 
          model.b
        );
      } catch (mathError) {
        console.error(`${this.LOG_PREFIX} Matrix operation error for arm ${armId}:`, mathError);
        throw new Error(`Matrix computation failed for arm ${armId}`);
      }

      // Save updated model
      try {
        await this.saveLinUCBModel(model, userId);
        console.log(`${this.LOG_PREFIX} Successfully saved model for arm ${armId}`);
      } catch (saveError) {
        console.error(`${this.LOG_PREFIX} Failed to save model for arm ${armId}:`, saveError);
        throw saveError;
      }

      // Calculate learning metrics
      const improvement = model.averageReward - oldReward;
      const confidence = this.calculateModelConfidence(model);
      const learningRate = Math.abs(improvement) / Math.max(0.01, oldReward);

      console.log(`${this.LOG_PREFIX} Model updated - New avg reward: ${model.averageReward.toFixed(3)}, Improvement: ${improvement.toFixed(3)}`);

      return {
        armId,
        oldReward,
        newReward: model.averageReward,
        improvement,
        confidence,
        learningRate
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error updating bandit model:`, error);
      throw error;
    }
  }

  /**
   * Calculate LinUCB prediction for an arm
   */
  private static calculateLinUCBPrediction(
    model: LinUCBModel,
    contextVector: number[],
    arm: BanditArm
  ): BanditPrediction {
    // Calculate predicted reward: θ^T * x
    const predictedReward = this.vectorDotProduct(model.theta, contextVector);

    // Calculate confidence width: α * sqrt(x^T * A^-1 * x)
    const AInverse = this.invertMatrix(model.A);
    const xTAInverseX = this.quadraticForm(contextVector, AInverse);
    const explorationBonus = this.ALPHA * Math.sqrt(xTAInverseX);

    // Upper confidence bound
    const upperConfidenceBound = predictedReward + explorationBonus;

    // Calculate confidence based on number of interactions
    const confidence = Math.min(1.0, model.interactionCount / 100); // Max confidence after 100 interactions

    // Context match score (how well this arm fits the current context)
    const contextMatch = this.calculateContextMatch(arm, contextVector);

    return {
      armId: arm.armId,
      armName: arm.name,
      predictedReward,
      upperConfidenceBound,
      explorationBonus,
      confidence,
      contextMatch
    };
  }

  /**
   * Load LinUCB models for all arms
   */
  private static async loadLinUCBModels(userId?: string): Promise<Record<string, LinUCBModel>> {
    try {
      const models: Record<string, LinUCBModel> = {};
      const userIdToUse = userId ? String(userId) : 'anonymous';
      
      // Use deduplication to prevent multiple identical database calls
      const key = requestDeduplicationService.createKey('load_linucb_models', { userId: userIdToUse });
      
      return requestDeduplicationService.dedupe(key, async () => {
        for (const arm of this.BANDIT_ARMS) {
          try {
            const { data, error } = await supabase
              .from('user_contextual_preferences')
              .select('*')
              .eq('user_id', userIdToUse)
              .eq('context_signature', arm.armId)
              .maybeSingle();

            if (data && !error) {
              // Parse stored model
              models[arm.armId] = {
                armId: arm.armId,
                theta: data.feature_weights.theta || this.createZeroVector(this.CONTEXT_DIM),
                A: data.feature_weights.A || this.createIdentityMatrix(this.CONTEXT_DIM),
                b: data.feature_weights.b || this.createZeroVector(this.CONTEXT_DIM),
                lastUpdated: data.last_updated,
                interactionCount: data.interaction_count,
                totalReward: data.reward_totals.total || 0,
                averageReward: data.reward_totals.average || 0
              };
            } else {
              // Initialize new model
              models[arm.armId] = this.initializeLinUCBModel(arm.armId);
            }
          } catch (armError) {
            // Handle 406 errors and other database issues gracefully
            console.warn(`[CONTEXTUAL_BANDITS] Error loading model for arm ${arm.armId} (likely permissions):`, armError);
            models[arm.armId] = this.initializeLinUCBModel(arm.armId);
          }
        }

                return models;
      });
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error loading models:`, error);
      // Return default models
      const defaultModels: Record<string, LinUCBModel> = {};
      for (const arm of this.BANDIT_ARMS) {
        defaultModels[arm.armId] = this.initializeLinUCBModel(arm.armId);
      }
      return defaultModels;
    }
  }

  /**
   * Save LinUCB model to database
   */
  private static async saveLinUCBModel(model: LinUCBModel, userId?: string): Promise<void> {
    try {
      // Convert UUID to string if needed, or use 'anonymous'
      const userIdToUse = userId ? String(userId) : 'anonymous';
      console.log(`${this.LOG_PREFIX} Saving model for user=${userIdToUse}, arm=${model.armId}`);
      
      const modelData = {
        user_id: userIdToUse,
        context_signature: model.armId,
        context_data: { armId: model.armId, modelType: 'linucb' },
        feature_weights: {
          theta: model.theta,
          A: model.A,
          b: model.b
        },
        action_counts: { [model.armId]: model.interactionCount },
        reward_totals: {
          total: model.totalReward,
          average: model.averageReward
        },
        confidence_intervals: {},
        last_updated: model.lastUpdated,
        interaction_count: model.interactionCount
      };

      const { error } = await supabase
        .from('user_contextual_preferences')
        .upsert(modelData, {
          onConflict: 'user_id,context_signature',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`${this.LOG_PREFIX} Database error saving model:`, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          modelData: {
            user_id: userIdToUse,
            context_signature: model.armId,
            interaction_count: model.interactionCount
          }
        });
        throw new Error(`Failed to save model for ${model.armId}: ${error.message}`);
      }

      console.log(`${this.LOG_PREFIX} Successfully saved model for ${model.armId}, interactions: ${model.interactionCount}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error saving model for ${model.armId}:`, error);
      throw error; // Re-throw to handle at higher level
    }
  }

  /**
   * Initialize a new LinUCB model
   */
  private static initializeLinUCBModel(armId: string): LinUCBModel {
    return {
      armId,
      theta: this.createZeroVector(this.CONTEXT_DIM),
      A: this.createIdentityMatrix(this.CONTEXT_DIM), // A = λ * I (regularized)
      b: this.createZeroVector(this.CONTEXT_DIM),
      lastUpdated: new Date().toISOString(),
      interactionCount: 0,
      totalReward: 0,
      averageReward: 0
    };
  }

  // Mathematical utility methods

  private static createZeroVector(size: number): number[] {
    return new Array(size).fill(0);
  }

  private static createIdentityMatrix(size: number): number[][] {
    const matrix = Array(size).fill(null).map(() => Array(size).fill(0));
    for (let i = 0; i < size; i++) {
      matrix[i][i] = this.LAMBDA; // Regularized identity
    }
    return matrix;
  }

  private static vectorDotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  private static matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => this.vectorDotProduct(row, vector));
  }

  private static quadraticForm(vector: number[], matrix: number[][]): number {
    const matrixVector = this.matrixVectorMultiply(matrix, vector);
    return this.vectorDotProduct(vector, matrixVector);
  }

  private static invertMatrix(matrix: number[][]): number[][] {
    // Simplified matrix inversion for demo (in production, use robust numerical library)
    const n = matrix.length;
    const identity = this.createIdentityMatrix(n);
    
    // Create augmented matrix [A|I]
    const augmented = matrix.map((row, i) => [...row, ...identity[i]]);
    
    // Gauss-Jordan elimination (simplified)
    for (let i = 0; i < n; i++) {
      // Normalize diagonal element
      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    
    // Extract inverse matrix
    return augmented.map(row => row.slice(n));
  }

  private static calculateModelConfidence(model: LinUCBModel): number {
    // Simple confidence calculation based on interactions and reward stability
    const interactionConfidence = Math.min(1.0, model.interactionCount / 50);
    const rewardStability = Math.max(0, 1 - Math.abs(model.averageReward - 0.5)); // Assumes rewards are 0-1
    return (interactionConfidence + rewardStability) / 2;
  }

  private static calculateContextMatch(arm: BanditArm, contextVector: number[]): number {
    // Simplified context matching (would be enhanced with arm-specific context preferences)
    return 0.5 + Math.random() * 0.3; // Placeholder - would use learned arm preferences
  }

  /**
   * Generate recommendation from selected strategy (placeholder)
   */
  private static async generateRecommendationFromStrategy(
    prediction: BanditPrediction,
    context: ContextVector,
    encodedContext: EncodedContext,
    userId?: string
  ): Promise<BanditRecommendation> {
    const explorationLevel = prediction.explorationBonus / (prediction.predictedReward + prediction.explorationBonus);
    
    return {
      armId: prediction.armId,
      armName: prediction.armName,
      strategy: `LinUCB selected: ${prediction.armName}`,
      books: [], // Would be filled by the specific strategy implementation
      confidence: prediction.confidence,
      explorationLevel,
      explanation: `Selected ${prediction.armName} strategy (confidence: ${(prediction.confidence * 100).toFixed(1)}%, exploration: ${(explorationLevel * 100).toFixed(1)}%)`
    };
  }

  /**
   * Fallback recommendation when bandit fails
   */
  private static getFallbackRecommendation(context: ContextVector): BanditRecommendation {
    return {
      armId: 'semantic_similarity',
      armName: 'Content-Based (Fallback)',
      strategy: 'Fallback to content-based recommendations',
      books: [],
      confidence: 0.5,
      explorationLevel: 0.0,
      explanation: 'Using fallback strategy due to bandit error'
    };
  }

  /**
   * Initialize all bandit models for a user
   */
  static async initializeBanditModels(userId?: string): Promise<{
    initialized: number;
    errors: number;
  }> {
    try {
      const userIdToUse = userId ? String(userId) : 'anonymous';
      console.log(`${this.LOG_PREFIX} Initializing bandit models for user: ${userIdToUse}...`);
      
      let initialized = 0;
      let errors = 0;

      for (const arm of this.BANDIT_ARMS) {
        try {
          // Check if model already exists
          const userIdToUse = userId ? String(userId) : 'anonymous';
          const { data: existing } = await supabase
            .from('user_contextual_preferences')
            .select('id')
            .eq('user_id', userIdToUse)
            .eq('context_signature', arm.armId)
            .maybeSingle();

          if (!existing) {
            // Create new model
            const newModel = this.initializeLinUCBModel(arm.armId);
            await this.saveLinUCBModel(newModel, userIdToUse);
            initialized++;
            console.log(`${this.LOG_PREFIX} Initialized model for arm: ${arm.armId}`);
          } else {
            console.log(`${this.LOG_PREFIX} Model already exists for arm: ${arm.armId}`);
          }
        } catch (error) {
          console.error(`${this.LOG_PREFIX} Error initializing arm ${arm.armId}:`, error);
          errors++;
        }
      }

      console.log(`${this.LOG_PREFIX} Initialization complete: ${initialized} new models, ${errors} errors`);
      return { initialized, errors };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error during initialization:`, error);
      return { initialized: 0, errors: 1 };
    }
  }

  /**
   * Process reward signals and update bandit models
   * This connects Phase 2 (Reward Signals) with Phase 3 (Contextual Bandits)
   */
  static async processRewardSignals(userId?: string, hoursBack: number = 24): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    try {
      const userIdToUse = userId ? String(userId) : 'anonymous';
      console.log(`${this.LOG_PREFIX} Processing reward signals for bandit learning for user: ${userIdToUse}...`);
      
      // First, ensure all bandit models are initialized
      await this.initializeBanditModels(userIdToUse);
      
      // Get reward signals from Phase 2 pipeline
      const rewardSignals = await RewardSignalService.getRewardSignals(userId, hoursBack);
      
      if (!rewardSignals || rewardSignals.length === 0) {
        console.log(`${this.LOG_PREFIX} No reward signals found to process`);
        return { processed: 0, updated: 0, errors: 0 };
      }
      
      let processed = 0;
      let updated = 0;
      let errors = 0;

      // Fetch impressions with their context and source data
      console.log(`${this.LOG_PREFIX} Fetching impression details for ${rewardSignals.length} signals...`);
      const impressionIds = rewardSignals.map(s => s.impressionId);
      
      const { data: impressions, error: fetchError } = await supabase
        .from('recommendation_impressions')
        .select('*')
        .in('id', impressionIds);
        
      if (fetchError || !impressions) {
        console.error(`${this.LOG_PREFIX} Failed to fetch impression details:`, fetchError);
        return { processed: 0, updated: 0, errors: rewardSignals.length };
      }

      // Create a map for quick lookup
      const impressionMap = new Map(impressions.map(imp => [imp.id, imp]));

      for (const signal of rewardSignals) {
        try {
          processed++;
          console.log(`${this.LOG_PREFIX} Processing signal ${processed}/${rewardSignals.length}: impressionId=${signal.impressionId}, reward=${signal.totalReward}`);
          
          // Get the corresponding impression
          const impression = impressionMap.get(signal.impressionId);
          if (!impression) {
            console.warn(`${this.LOG_PREFIX} Impression not found for signal ${signal.impressionId}`);
            errors++;
            continue;
          }

          // Extract context and strategy from impression
          const context = impression.context_vector as ContextVector;
          const strategy = impression.source || 'contextual_basic';
          
          console.log(`${this.LOG_PREFIX} Processing impression: bookId=${impression.book_id}, strategy=${strategy}, rank=${impression.recommendation_rank}`);
          
                          // Ensure the strategy corresponds to a valid arm, with fallback mapping
                let validStrategy = strategy;
                const armExists = this.BANDIT_ARMS.some(arm => arm.armId === strategy);
                if (!armExists) {
                  // Map unknown strategies to known ones
                  const strategyMapping: Record<string, string> = {
                    'bandit': 'contextual_basic',
                    'default': 'contextual_basic',
                    'unknown': 'contextual_basic'
                  };
                  
                  validStrategy = strategyMapping[strategy] || 'contextual_basic';
                  console.log(`${this.LOG_PREFIX} ℹ️ Mapping legacy strategy '${strategy}' → '${validStrategy}'`);
                }
          
          console.log(`${this.LOG_PREFIX} Updating bandit model: strategy=${validStrategy}, reward=${signal.totalReward.toFixed(2)}`);
          
          // Update bandit model with attributed reward
          await this.updateBanditModel(
            validStrategy,
            context,
            signal.totalReward,
            userIdToUse
          );
          
          updated++;
          console.log(`${this.LOG_PREFIX} ✓ Successfully updated bandit model ${validStrategy} with reward ${signal.totalReward.toFixed(2)}`);
          
        } catch (error) {
          console.error(`${this.LOG_PREFIX} Error processing signal ${signal.impressionId}:`, error);
          errors++;
        }
      }

      console.log(`${this.LOG_PREFIX} Processed ${processed} signals: ${updated} updated, ${errors} errors`);
      
      return { processed, updated, errors };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error processing reward signals:`, error);
      return { processed: 0, updated: 0, errors: 1 };
    }
  }

  /**
   * Get bandit performance statistics
   */
  static async getBanditStats(userId?: string): Promise<Record<string, any>> {
    try {
      const userIdToUse = userId ? String(userId) : 'anonymous';
      const models = await this.loadLinUCBModels(userIdToUse);
      
      const stats = Object.entries(models).map(([armId, model]) => ({
        armId,
        armName: this.BANDIT_ARMS.find(arm => arm.armId === armId)?.name || armId,
        interactions: model.interactionCount,
        averageReward: model.averageReward,
        confidence: this.calculateModelConfidence(model),
        lastUpdated: model.lastUpdated
      }));

      return {
        totalInteractions: stats.reduce((sum, stat) => sum + stat.interactions, 0),
        bestPerformingArm: stats.reduce((best, current) => 
          current.averageReward > best.averageReward ? current : best
        ),
        armStats: stats,
        explorationRate: this.ALPHA,
        lastUpdated: Math.max(...stats.map(s => new Date(s.lastUpdated).getTime()))
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting bandit stats:`, error);
      return { error: 'Failed to load bandit statistics' };
    }
  }
}