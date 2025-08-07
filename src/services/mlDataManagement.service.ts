import { supabase } from '../lib/supabase';

export interface MLTrainingData {
  recommendation_interactions: any[];
  user_contextual_preferences: any[];
  recommendation_impressions: any[];
  recommendation_actions: any[];
  export_metadata: {
    export_date: string;
    total_interactions: number;
    total_preferences: number;
    total_impressions: number;
    total_actions: number;
    version: string;
  };
}

export interface MLResetResult {
  success: boolean;
  deleted_counts: {
    recommendation_interactions: number;
    user_contextual_preferences: number;
    recommendation_impressions: number;
    recommendation_actions: number;
  };
  reset_timestamp: string;
}

export interface MLRestoreResult {
  success: boolean;
  imported_counts: {
    recommendation_interactions: number;
    user_contextual_preferences: number;
    recommendation_impressions: number;
    recommendation_actions: number;
  };
  restore_timestamp: string;
}

export class MLDataManagementService {
  private static readonly LOG_PREFIX = '[ML_DATA_MGMT]';

  /**
   * Export all ML training data for backup
   */
  static async exportTrainingData(): Promise<MLTrainingData> {
    console.log(`${this.LOG_PREFIX} Starting ML training data export...`);
    
    try {
      // Export all ML training tables in parallel
      const [interactions, preferences, impressions, actions] = await Promise.all([
        supabase.from('recommendation_interactions').select('*'),
        supabase.from('user_contextual_preferences').select('*'),
        supabase.from('recommendation_impressions').select('*'),
        supabase.from('recommendation_actions').select('*')
      ]);
      
      if (interactions.error) {
        throw new Error(`Failed to export interactions: ${interactions.error.message}`);
      }
      if (preferences.error) {
        throw new Error(`Failed to export preferences: ${preferences.error.message}`);
      }
      if (impressions.error) {
        throw new Error(`Failed to export impressions: ${impressions.error.message}`);
      }
      if (actions.error) {
        throw new Error(`Failed to export actions: ${actions.error.message}`);
      }

      const exportData: MLTrainingData = {
        recommendation_interactions: interactions.data || [],
        user_contextual_preferences: preferences.data || [],
        recommendation_impressions: impressions.data || [],
        recommendation_actions: actions.data || [],
        export_metadata: {
          export_date: new Date().toISOString(),
          total_interactions: interactions.data?.length || 0,
          total_preferences: preferences.data?.length || 0,
          total_impressions: impressions.data?.length || 0,
          total_actions: actions.data?.length || 0,
          version: '2.0'
        }
      };

      console.log(`${this.LOG_PREFIX} ✅ Export completed:`, {
        interactions: exportData.recommendation_interactions.length,
        preferences: exportData.user_contextual_preferences.length,
        impressions: exportData.recommendation_impressions.length,
        actions: exportData.recommendation_actions.length
      });

      return exportData;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} ❌ Export failed:`, error);
      throw error;
    }
  }

  /**
   * Reset all ML training data (clear the slate)
   */
  static async resetTrainingData(): Promise<MLResetResult> {
    console.log(`${this.LOG_PREFIX} Starting comprehensive ML training data reset...`);
    
    try {
      // Count current records before deletion
      const [interactionsCount, preferencesCount, impressionsCount, actionsCount] = await Promise.all([
        supabase.from('recommendation_interactions').select('*', { count: 'exact', head: true }),
        supabase.from('user_contextual_preferences').select('*', { count: 'exact', head: true }),
        supabase.from('recommendation_impressions').select('*', { count: 'exact', head: true }),
        supabase.from('recommendation_actions').select('*', { count: 'exact', head: true })
      ]);

      console.log(`${this.LOG_PREFIX} Found records to delete:`, {
        interactions: interactionsCount.count || 0,
        preferences: preferencesCount.count || 0,
        impressions: impressionsCount.count || 0,
        actions: actionsCount.count || 0
      });

      // Delete all ML training data in parallel
      const deletions = await Promise.all([
        supabase.from('recommendation_interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('user_contextual_preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('recommendation_impressions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('recommendation_actions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      // Check for errors
      const [interactionsDelete, preferencesDelete, impressionsDelete, actionsDelete] = deletions;
      
      if (interactionsDelete.error) {
        throw new Error(`Failed to reset interactions: ${interactionsDelete.error.message}`);
      }
      if (preferencesDelete.error) {
        throw new Error(`Failed to reset preferences: ${preferencesDelete.error.message}`);
      }
      if (impressionsDelete.error) {
        throw new Error(`Failed to reset impressions: ${impressionsDelete.error.message}`);
      }
      if (actionsDelete.error) {
        throw new Error(`Failed to reset actions: ${actionsDelete.error.message}`);
      }

      const resetResult: MLResetResult = {
        success: true,
        deleted_counts: {
          recommendation_interactions: interactionsCount.count || 0,
          user_contextual_preferences: preferencesCount.count || 0,
          recommendation_impressions: impressionsCount.count || 0,
          recommendation_actions: actionsCount.count || 0
        },
        reset_timestamp: new Date().toISOString()
      };

      console.log(`${this.LOG_PREFIX} ✅ Comprehensive reset completed:`, resetResult.deleted_counts);

      // Clear any cached ML data
      this.clearMLCaches();

      return resetResult;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} ❌ Reset failed:`, error);
      throw error;
    }
  }

  /**
   * Restore ML training data from backup
   */
  static async restoreTrainingData(backupData: MLTrainingData): Promise<MLRestoreResult> {
    console.log(`${this.LOG_PREFIX} Starting comprehensive ML training data restore...`);
    
    try {
      // Validate backup data format
      if (!backupData.export_metadata) {
        throw new Error('Invalid backup data format - missing metadata');
      }

      console.log(`${this.LOG_PREFIX} Restoring from backup dated: ${backupData.export_metadata.export_date}`);
      console.log(`${this.LOG_PREFIX} Backup contains:`, {
        interactions: backupData.recommendation_interactions?.length || 0,
        preferences: backupData.user_contextual_preferences?.length || 0,
        impressions: backupData.recommendation_impressions?.length || 0,
        actions: backupData.recommendation_actions?.length || 0
      });

      // Clear existing data first
      await this.resetTrainingData();

      // Restore all tables in parallel
      const restorePromises = [];
      let importedCounts = {
        recommendation_interactions: 0,
        user_contextual_preferences: 0,
        recommendation_impressions: 0,
        recommendation_actions: 0
      };

      // Restore recommendation interactions
      if (backupData.recommendation_interactions?.length > 0) {
        restorePromises.push(
          supabase.from('recommendation_interactions').insert(backupData.recommendation_interactions)
            .then(result => {
              if (result.error) throw new Error(`Failed to restore interactions: ${result.error.message}`);
              importedCounts.recommendation_interactions = backupData.recommendation_interactions.length;
            })
        );
      }

      // Restore user contextual preferences
      if (backupData.user_contextual_preferences?.length > 0) {
        restorePromises.push(
          supabase.from('user_contextual_preferences').insert(backupData.user_contextual_preferences)
            .then(result => {
              if (result.error) throw new Error(`Failed to restore preferences: ${result.error.message}`);
              importedCounts.user_contextual_preferences = backupData.user_contextual_preferences.length;
            })
        );
      }

      // Restore recommendation impressions
      if (backupData.recommendation_impressions?.length > 0) {
        restorePromises.push(
          supabase.from('recommendation_impressions').insert(backupData.recommendation_impressions)
            .then(result => {
              if (result.error) throw new Error(`Failed to restore impressions: ${result.error.message}`);
              importedCounts.recommendation_impressions = backupData.recommendation_impressions.length;
            })
        );
      }

      // Restore recommendation actions
      if (backupData.recommendation_actions?.length > 0) {
        restorePromises.push(
          supabase.from('recommendation_actions').insert(backupData.recommendation_actions)
            .then(result => {
              if (result.error) throw new Error(`Failed to restore actions: ${result.error.message}`);
              importedCounts.recommendation_actions = backupData.recommendation_actions.length;
            })
        );
      }

      // Wait for all restore operations to complete
      await Promise.all(restorePromises);

      const restoreResult: MLRestoreResult = {
        success: true,
        imported_counts: importedCounts,
        restore_timestamp: new Date().toISOString()
      };

      console.log(`${this.LOG_PREFIX} ✅ Comprehensive restore completed:`, restoreResult.imported_counts);

      return restoreResult;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} ❌ Restore failed:`, error);
      throw error;
    }
  }

  /**
   * Download backup data as JSON file
   */
  static downloadBackup(data: MLTrainingData, filename?: string): void {
    const defaultFilename = `ml-training-backup-${new Date().toISOString().split('T')[0]}.json`;
    const finalFilename = filename || defaultFilename;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log(`${this.LOG_PREFIX} ✅ Backup downloaded as ${finalFilename}`);
  }

  /**
   * Parse uploaded backup file
   */
  static async parseBackupFile(file: File): Promise<MLTrainingData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          
          // Validate backup structure
          if (!data.export_metadata || !data.recommendation_interactions) {
            throw new Error('Invalid backup file format');
          }
          
          console.log(`${this.LOG_PREFIX} ✅ Backup file parsed successfully`);
          resolve(data);
        } catch (error) {
          console.error(`${this.LOG_PREFIX} ❌ Failed to parse backup file:`, error);
          reject(new Error('Invalid JSON backup file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read backup file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Get comprehensive ML training data statistics
   */
  static async getTrainingDataStats(): Promise<{
    total_interactions: number;
    total_preferences: number;
    total_impressions: number;
    total_actions: number;
    last_interaction_date: string | null;
    unique_users: number;
  }> {
    try {
      // Get counts from all ML tables in parallel
      const [interactionsCount, preferencesCount, impressionsCount, actionsCount] = await Promise.all([
        supabase.from('recommendation_interactions').select('*', { count: 'exact', head: true }),
        supabase.from('user_contextual_preferences').select('*', { count: 'exact', head: true }),
        supabase.from('recommendation_impressions').select('*', { count: 'exact', head: true }),
        supabase.from('recommendation_actions').select('*', { count: 'exact', head: true })
      ]);

      // Get latest activity from all tables
      const [latestInteraction, latestImpression, latestAction] = await Promise.all([
        supabase.from('recommendation_interactions').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('recommendation_impressions').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('recommendation_actions').select('created_at').order('created_at', { ascending: false }).limit(1).single()
      ]);

      // Find the most recent activity across all tables
      const activityDates = [
        latestInteraction.data?.created_at,
        latestImpression.data?.created_at,
        latestAction.data?.created_at
      ].filter(Boolean).map(date => new Date(date as string));
      
      const lastActivityDate = activityDates.length > 0 
        ? activityDates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString()
        : null;

      // Get unique users count from actions table (most comprehensive)
      const { data: uniqueUsers } = await supabase
        .from('recommendation_actions')
        .select('user_id')
        .not('user_id', 'is', null);

      const uniqueUserIds = new Set(uniqueUsers?.map(u => u.user_id) || []);

      return {
        total_interactions: interactionsCount.count || 0,
        total_preferences: preferencesCount.count || 0,
        total_impressions: impressionsCount.count || 0,
        total_actions: actionsCount.count || 0,
        last_interaction_date: lastActivityDate,
        unique_users: uniqueUserIds.size
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting comprehensive stats:`, error);
      return {
        total_interactions: 0,
        total_preferences: 0,
        total_impressions: 0,
        total_actions: 0,
        last_interaction_date: null,
        unique_users: 0
      };
    }
  }

  /**
   * Clear ML-related caches
   */
  private static clearMLCaches(): void {
    try {
      // Clear feature flag cache
      const FeatureFlagService = require('./featureFlag.service').FeatureFlagService;
      FeatureFlagService.clearCache();
      
      // Clear any browser localStorage caches related to ML
      if (typeof window !== 'undefined') {
        // Clear any ML performance cache
        localStorage.removeItem('ml-performance-cache');
        localStorage.removeItem('reward-signals-cache');
        localStorage.removeItem('bandit-state-cache');
        
        // Clear any session-based ML caches
        sessionStorage.removeItem('ml-recommendations-cache');
        sessionStorage.removeItem('contextual-bandits-cache');
      }
      
      console.log(`${this.LOG_PREFIX} All ML caches cleared`);
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} Error clearing ML caches:`, error);
    }
  }
}