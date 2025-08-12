import React from 'react';
import { supabase } from '../lib/supabase';
import { requestDeduplicationService } from './requestDeduplication.service';
import { useAuth } from '../contexts/AuthContext';

export interface FeatureFlag {
  id: string;
  flagName: string;
  description?: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  userWhitelist?: string[];
  userBlacklist?: string[];
  abTestConfig?: Record<string, any>;
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  updatedAt: string;
}

export type MLFeatureFlags = {
  'contextual_recommendations_v1': boolean;
  'semantic_similarity': boolean;
  'semantic_embeddings_v1': boolean;
  'contextual_bandits': boolean;
  'neural_content_filter': boolean;
  'context_awareness_panel': boolean;
  'recommendation_explanations': boolean;
  
  // Hybrid Content System flags
  'hybrid_content_creation': boolean;
  'content_source_tracking': boolean;
  'ai_content_enhancement': boolean;
  'admin_content_dashboard': boolean;
  
  // Threads feature flag (OFF by default - threads hidden)
  'threads_feature_enabled': boolean;
};

export class FeatureFlagService {
  private static readonly LOG_PREFIX = '[FEATURE_FLAGS]';
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static cache: Map<string, { data: MLFeatureFlags; timestamp: number }> = new Map();

  /**
   * Check if a specific ML feature is enabled for the current user
   * PERFORMANCE OVERRIDE: All flags enabled to skip API calls
   */
  static async isFeatureEnabled(
    flagName: keyof MLFeatureFlags,
    userId?: string
  ): Promise<boolean> {
    // Special case: threads feature is OFF by default
    if (flagName === 'threads_feature_enabled') {
      console.log(`${this.LOG_PREFIX} Feature flag ${flagName} disabled (threads hidden)`);
      return false;
    }
    
    // TEMPORARY: Skip all API calls and return true for all other flags
    console.log(`${this.LOG_PREFIX} Feature flag ${flagName} enabled (performance override)`);
    return true;
  }

  /**
   * Get all ML feature flags for the current user (for bulk checking)
   */
  static async getAllMLFeatureFlags(userId?: string): Promise<MLFeatureFlags> {
    console.log(`${this.LOG_PREFIX} All ML feature flags enabled (performance override)`);
    
    // TEMPORARY: Return all flags as enabled to skip API calls
    return {
      contextual_recommendations_v1: true,
      semantic_similarity: true,
      semantic_embeddings_v1: true,
      contextual_bandits: true,
      neural_content_filter: true,
      context_awareness_panel: true,
      recommendation_explanations: true,
      
      // Hybrid Content System flags
      hybrid_content_creation: true,
      content_source_tracking: true,
      ai_content_enhancement: true,
      admin_content_dashboard: true,
      
      // Threads feature flag (OFF by default - threads hidden)
      threads_feature_enabled: false
    };
  }

  /**
   * Update a feature flag (admin function)
   */
  static async updateFeatureFlag(
    flagName: string,
    updates: Partial<Pick<FeatureFlag, 'isEnabled' | 'rolloutPercentage' | 'description'>>
  ): Promise<void> {
    const environment = this.getCurrentEnvironment();
    
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: any = {};
      if ('isEnabled' in updates) {
        dbUpdates.is_enabled = updates.isEnabled;
      }
      if ('rolloutPercentage' in updates) {
        dbUpdates.rollout_percentage = updates.rolloutPercentage;
      }
      if ('description' in updates) {
        dbUpdates.description = updates.description;
      }

      const { data, error } = await supabase
        .from('feature_flags')
        .update(dbUpdates)
        .eq('flag_name', flagName)
        .eq('environment', environment)
        .select(); // Return updated records

      if (error) {
        throw new Error(`Failed to update feature flag: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error(`No records updated. Flag '${flagName}' might not exist in environment '${environment}'`);
      }

      // Clear cache to force refresh
      this.clearCache();
      
      console.log(`${this.LOG_PREFIX} Updated feature flag ${flagName} in ${environment}:`, updates);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error updating feature flag ${flagName}:`, error);
      throw error;
    }
  }

  /**
   * Get feature flag configuration (admin function)
   */
  static async getFeatureFlag(flagName: string): Promise<FeatureFlag | null> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_name', flagName)
        .eq('environment', this.getCurrentEnvironment())
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new Error(`Failed to get feature flag: ${error.message}`);
      }

      return {
        id: data.id,
        flagName: data.flag_name,
        description: data.description,
        isEnabled: data.is_enabled,
        rolloutPercentage: data.rollout_percentage,
        userWhitelist: data.user_whitelist,
        userBlacklist: data.user_blacklist,
        abTestConfig: data.ab_test_config,
        environment: data.environment,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting feature flag:`, error);
      return null;
    }
  }

  /**
   * Clear the feature flag cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log(`${this.LOG_PREFIX} Cache cleared`);
  }

  /**
   * Get current environment
   */
  private static getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    // If connected to production Supabase, always use 'production' environment
    // regardless of NODE_ENV (which is 'development' on localhost)
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    
    let result: 'development' | 'staging' | 'production';
    
    if (supabaseUrl?.includes('supabase.co')) {
      // Connected to production Supabase
      result = 'production';
    } else {
      // Local/staging Supabase
      const env = process.env.NODE_ENV;
      if (env === 'staging') result = 'staging';
      else result = 'development';
    }
    
    console.log(`${this.LOG_PREFIX} Environment: ${result} (${supabaseUrl?.includes('supabase.co') ? 'production Supabase' : 'local/dev'})`);
    
    return result;
  }

  /**
   * Generate session ID for anonymous users
   */
  static generateSessionId(): string {
    return 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

/**
 * React hook for accessing feature flags
 */
export const useFeatureFlags = () => {
  // PERFORMANCE OVERRIDE: Skip all API calls and return all flags as enabled
  const flags: MLFeatureFlags = {
    contextual_recommendations_v1: true,
    semantic_similarity: true,
    semantic_embeddings_v1: true,
    contextual_bandits: true,
    neural_content_filter: true,
    context_awareness_panel: true,
    recommendation_explanations: true,
    
    // Hybrid Content System flags
    hybrid_content_creation: true,
    content_source_tracking: true,
    ai_content_enhancement: true,
    admin_content_dashboard: true,
    
    // Threads feature flag (OFF by default - threads hidden)
    threads_feature_enabled: false
  };

  const isEnabled = React.useCallback((flagName: keyof MLFeatureFlags): boolean => {
    // Special case: threads feature is OFF by default
    if (flagName === 'threads_feature_enabled') {
      return false;
    }
    return true; // All other flags enabled for performance
  }, []);

  return {
    flags,
    loading: false, // No loading needed
    isEnabled,
    refresh: () => Promise.resolve() // No-op for performance
  };
};

