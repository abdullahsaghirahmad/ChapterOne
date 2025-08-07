import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ContextVector } from './ml.service';

// Types for reward signal system
export interface RecommendationImpression {
  id: string;
  userId?: string;
  sessionId?: string;
  bookId: string;
  context: ContextVector;
  recommendationSource: 'semantic' | 'bandit' | 'collaborative' | 'trending' | 'hybrid';
  recommendationRank: number; // Position in the list (1st, 2nd, 3rd recommendation)
  recommendationScore: number;
  recommendationMetadata: Record<string, any>;
  shownAt: string;
  viewDurationMs?: number;
}

export interface UserAction {
  id: string;
  userId?: string;
  sessionId?: string;
  bookId: string;
  actionType: 'click' | 'save' | 'unsave' | 'rate' | 'view' | 'dismiss' | 'share';
  actionValue?: number; // For ratings (1-5), duration (ms), etc.
  actionContext?: Record<string, any>;
  actionTimestamp: string;
}

export interface RewardAttribution {
  impressionId: string;
  actionId: string;
  rewardValue: number;
  attributionConfidence: number; // 0-1, how confident we are in this attribution
  attributionReason: string;
  timeDecay: number; // Reduced reward for older impressions
  contextMatch: number; // Bonus for similar context when shown vs when acted
}

export interface ProcessedReward {
  impressionId: string;
  totalReward: number;
  rewardBreakdown: {
    immediate: number;
    delayed: number;
    contextBonus: number;
    timeDecay: number;
  };
  confidenceScore: number;
  lastUpdated: string;
}

export class RewardSignalService {
  private static readonly LOG_PREFIX = '[REWARD_SIGNALS]';
  private static readonly ATTRIBUTION_WINDOW_HOURS = 168; // 7 days
  private static readonly MIN_VIEW_DURATION_MS = 2000; // 2 seconds minimum view
  
  // Reward values based on our discussion
  private static readonly REWARD_VALUES = {
    click: 1,
    save: 3,
    unsave: -1,
    rate_1: 1,
    rate_2: 2,
    rate_3: 3,
    rate_4: 4,
    rate_5: 5,
    view_engaged: 0.5, // Viewed for significant time
    dismiss: -0.5,
    share: 2
  };

  /**
   * Record a recommendation impression (when we show a recommendation to a user)
   */
  static async recordImpression(
    impression: Omit<RecommendationImpression, 'id' | 'shownAt'>
  ): Promise<string | null> {
    try {
      console.log(`${this.LOG_PREFIX} Recording impression for book ${impression.bookId}`);
      
      const { data, error } = await supabase
        .from('recommendation_impressions')
        .insert({
          user_id: impression.userId || null,
          session_id: impression.sessionId || null,
          book_id: impression.bookId,
          context_vector: impression.context,
          source: impression.recommendationSource,
          score: impression.recommendationScore,
          rank: impression.recommendationRank
        })
        .select('id')
        .single();

      if (error) {
        console.error(`${this.LOG_PREFIX} Error recording impression:`, error);
        return null;
      }

      console.log(`${this.LOG_PREFIX} Recorded impression ${data.id}`);
      return data.id;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in recordImpression:`, error);
      return null;
    }
  }

  /**
   * Record a user action and attempt to attribute it to recent impressions
   */
  static async recordUserAction(action: Omit<UserAction, 'id'>): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Recording ${action.actionType} for book ${action.bookId}`);

      // Step 1: Record the action
      const { data: actionData, error: actionError } = await supabase
        .from('recommendation_actions')
        .insert({
          user_id: action.userId || null,
          session_id: action.sessionId || null,
          book_id: action.bookId,
          action_type: action.actionType,
          value: action.actionValue
        })
        .select('id')
        .single();

      if (actionError) {
        throw new Error(`Failed to record action: ${actionError.message}`);
      }

      // Step 2: Find and attribute to recent impressions
      await this.attributeActionToImpressions({
        id: actionData.id,
        ...action
      });

      console.log(`${this.LOG_PREFIX} Recorded and attributed ${action.actionType}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error recording user action:`, error);
    }
  }

  /**
   * Find recent impressions and calculate attribution for a user action
   */
  private static async attributeActionToImpressions(action: UserAction): Promise<void> {
    try {
      // Look for impressions of this book within the attribution window
      const attributionCutoff = new Date();
      attributionCutoff.setHours(attributionCutoff.getHours() - this.ATTRIBUTION_WINDOW_HOURS);

      const { data: impressions, error } = await supabase
        .from('recommendation_impressions')
        .select('*')
        .eq('book_id', action.bookId)
        .gte('created_at', attributionCutoff.toISOString())
        .order('created_at', { ascending: false });

      if (error || !impressions || impressions.length === 0) {
        console.log(`${this.LOG_PREFIX} No recent impressions found for attribution`);
        return;
      }

      // Filter impressions for this user/session
      const userImpressions = impressions.filter(imp => 
        (action.userId && imp.user_id === action.userId) ||
        (action.sessionId && imp.session_id === action.sessionId)
      );

      if (userImpressions.length === 0) {
        console.log(`${this.LOG_PREFIX} No user-specific impressions found for attribution`);
        return;
      }

      console.log(`${this.LOG_PREFIX} Found ${userImpressions.length} impressions for attribution`);

      // Calculate attribution for each impression
      for (const impression of userImpressions) {
        const attribution = this.calculateAttribution(impression, action);
        
        if (attribution.rewardValue > 0) {
          await this.updateImpressionReward(impression.id, attribution);
        }
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in attribution:`, error);
    }
  }

  /**
   * Calculate attribution between an impression and an action
   */
  private static calculateAttribution(
    impression: any, 
    action: UserAction
  ): RewardAttribution {
    // Base reward value for this action
    let baseReward = this.getBaseReward(action);
    
    // Time decay: reduce reward for older impressions
    const impressionTime = new Date(impression.created_at).getTime();
    const actionTime = new Date(action.actionTimestamp).getTime();
    const hoursSinceImpression = (actionTime - impressionTime) / (1000 * 60 * 60);
    
    // Exponential decay: 100% at 0 hours, ~50% at 24 hours, ~25% at 48 hours
    const timeDecay = Math.exp(-hoursSinceImpression / 48);
    
    // Context matching bonus (simplified for now)
    const contextMatch = 1.0; // Would compare impression context with action context
    
    // Recency bonus: most recent impression gets highest attribution
    const recencyBonus = 1.1; // TODO: Calculate based on impression recency relative to others
    
    // Final reward calculation
    const finalReward = baseReward * timeDecay * contextMatch * recencyBonus;
    
    // Attribution confidence based on recency and context match
    const confidence = timeDecay * contextMatch;

    return {
      impressionId: impression.id,
      actionId: action.id,
      rewardValue: finalReward,
      attributionConfidence: confidence,
      attributionReason: this.getAttributionReason(hoursSinceImpression, contextMatch),
      timeDecay,
      contextMatch
    };
  }

  /**
   * Get base reward value for an action
   */
  private static getBaseReward(action: UserAction): number {
    switch (action.actionType) {
      case 'click':
        return this.REWARD_VALUES.click;
      case 'save':
        return this.REWARD_VALUES.save;
      case 'unsave':
        return this.REWARD_VALUES.unsave;
      case 'rate':
        const rating = action.actionValue || 3;
        return this.REWARD_VALUES[`rate_${rating}` as keyof typeof this.REWARD_VALUES] || 3;
      case 'view':
        // Reward based on view duration
        const duration = action.actionValue || 0;
        if (duration >= this.MIN_VIEW_DURATION_MS) {
          return this.REWARD_VALUES.view_engaged;
        }
        return 0;
      case 'dismiss':
        return this.REWARD_VALUES.dismiss;
      case 'share':
        return this.REWARD_VALUES.share;
      default:
        return 0;
    }
  }

  /**
   * Update impression with calculated reward
   */
  private static async updateImpressionReward(
    impressionId: string, 
    attribution: RewardAttribution
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('recommendation_impressions')
        .update({
          reward: attribution.rewardValue,
          attributed_at: new Date().toISOString()
        })
        .eq('id', impressionId);

      if (error) {
        throw new Error(`Failed to update reward: ${error.message}`);
      }

      console.log(`${this.LOG_PREFIX} Updated impression ${impressionId} with reward ${attribution.rewardValue.toFixed(2)}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error updating impression reward:`, error);
    }
  }

  /**
   * Batch process delayed rewards (run periodically)
   */
  static async processDelayedRewards(): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Processing delayed rewards...`);

      // Look for actions that might have delayed rewards (ratings, completions)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data: recentActions, error } = await supabase
        .from('recommendation_actions')
        .select('*')
        .in('action_type', ['rate', 'save'])
        .gte('created_at', oneDayAgo.toISOString());

      if (error || !recentActions) {
        console.log(`${this.LOG_PREFIX} No delayed rewards to process`);
        return;
      }

      // TODO: Implement delayed reward processing when database supports it
      console.log(`${this.LOG_PREFIX} Found ${recentActions.length} recent actions (delayed rewards not yet implemented)`);

      console.log(`${this.LOG_PREFIX} Processed delayed rewards for ${recentActions.length} actions`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error processing delayed rewards:`, error);
    }
  }

  /**
   * Calculate delayed reward bonus
   */
  private static calculateDelayedReward(action: any): number {
    // Simplified delayed reward logic
    // In practice, this would look at subsequent user behavior
    if (action.interaction_type === 'save') {
      // Check if user later rated the book highly
      return 0.5; // Placeholder
    }
    return 0;
  }

  /**
   * Get recent reward signals for a user context (for bandit learning)
   */
  static async getRewardSignals(
    userId?: string,
    hoursBack: number = 168
  ): Promise<ProcessedReward[]> {
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hoursBack);

      let query = supabase
        .from('recommendation_impressions')
        .select('*')
        .gte('created_at', cutoff.toISOString())
        .not('reward', 'is', null);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: signals, error } = await query.order('created_at', { ascending: false });

      if (error || !signals) {
        return [];
      }

      return signals.map(signal => ({
        impressionId: signal.id,
        totalReward: signal.reward || 0,
        rewardBreakdown: {
          immediate: signal.reward || 0,
          delayed: 0, // Not yet implemented in database
          contextBonus: 0, // Would be calculated based on context match
          timeDecay: 1.0 // Would be calculated based on recency
        },
        confidenceScore: 0.8, // Would be calculated based on attribution confidence
        lastUpdated: signal.attributed_at || signal.created_at
      }));
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting reward signals:`, error);
      return [];
    }
  }

  // Helper methods

  private static getAttributionReason(hours: number, contextMatch: number): string {
    if (hours < 1) return 'immediate_interaction';
    if (hours < 24) return 'same_day_interaction';
    if (hours < 72) return 'recent_interaction';
    return 'delayed_interaction';
  }
}

/**
 * React hook for tracking recommendation impressions and user actions
 */
export const useRewardTracking = () => {
  const recordImpression = useCallback(async (
    bookId: string,
    context: ContextVector,
    source: string,
    rank: number,
    score: number,
    userId?: string,
    sessionId?: string
  ) => {
    return await RewardSignalService.recordImpression({
      userId,
      sessionId,
      bookId,
      context,
      recommendationSource: source as any,
      recommendationRank: rank,
      recommendationScore: score,
      recommendationMetadata: {}
    });
  }, []);

  const recordAction = useCallback(async (
    bookId: string,
    actionType: UserAction['actionType'],
    actionValue?: number,
    userId?: string,
    sessionId?: string
  ) => {
    return await RewardSignalService.recordUserAction({
      userId,
      sessionId,
      bookId,
      actionType,
      actionValue,
      actionTimestamp: new Date().toISOString()
    });
  }, []);

  return {
    recordImpression,
    recordAction
  };
};