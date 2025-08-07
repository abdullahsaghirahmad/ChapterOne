import { supabase } from '../lib/supabase';

// Types for ML Performance Metrics
export interface RecommendationMetrics {
  totalImpressions: number;
  totalActions: number;
  clickThroughRate: number;
  saveRate: number;
  averageRating: number;
  conversionRate: number;
}

export interface BanditPerformanceMetrics {
  armId: string;
  armName: string;
  totalRecommendations: number;
  totalRewards: number;
  averageReward: number;
  explorationRate: number;
  confidenceInterval: [number, number];
  lastUpdated: string;
}

export interface SystemPerformanceMetrics {
  averageResponseTime: number;
  errorRate: number;
  activeUsers: number;
  totalSessions: number;
  recommendationCoverage: number;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  returningUserRate: number;
  booksDiscovered: number;
}

export interface MLPerformanceReport {
  recommendations: RecommendationMetrics;
  bandits: BanditPerformanceMetrics[];
  system: SystemPerformanceMetrics;
  engagement: EngagementMetrics;
  generatedAt: string;
  timeRange: {
    from: string;
    to: string;
    hours: number;
  };
}

export class MLPerformanceMetricsService {
  private static readonly LOG_PREFIX = '[ML_PERFORMANCE_METRICS]';

  /**
   * Generate comprehensive ML performance report
   */
  static async generatePerformanceReport(hoursBack: number = 24): Promise<MLPerformanceReport> {
    try {
      console.log(`${this.LOG_PREFIX} Generating performance report for last ${hoursBack} hours...`);

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (hoursBack * 60 * 60 * 1000));

      const [recommendations, bandits, system, engagement] = await Promise.all([
        this.getRecommendationMetrics(startTime, endTime),
        this.getBanditPerformanceMetrics(startTime, endTime),
        this.getSystemPerformanceMetrics(startTime, endTime),
        this.getEngagementMetrics(startTime, endTime)
      ]);

      const report: MLPerformanceReport = {
        recommendations,
        bandits,
        system,
        engagement,
        generatedAt: new Date().toISOString(),
        timeRange: {
          from: startTime.toISOString(),
          to: endTime.toISOString(),
          hours: hoursBack
        }
      };

      console.log(`${this.LOG_PREFIX} Performance report generated successfully`);
      return report;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error generating performance report:`, error);
      throw error;
    }
  }

  /**
   * Get recommendation accuracy and engagement metrics
   */
  private static async getRecommendationMetrics(
    startTime: Date, 
    endTime: Date
  ): Promise<RecommendationMetrics> {
    try {
      // Get impression data
      const { data: impressions, error: impressionError } = await supabase
        .from('recommendation_impressions')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString());

      if (impressionError) throw impressionError;

      // Get action data
      const { data: actions, error: actionError } = await supabase
        .from('recommendation_actions')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString());

      if (actionError) throw actionError;

      const totalImpressions = impressions?.length || 0;
      const totalActions = actions?.length || 0;

      // Calculate specific action metrics
      const clickActions = actions?.filter(a => a.action_type === 'click') || [];
      const saveActions = actions?.filter(a => a.action_type === 'save') || [];
      const ratingActions = actions?.filter(a => a.action_type === 'rate' && a.value) || [];

      const clickThroughRate = totalImpressions > 0 ? (clickActions.length / totalImpressions) * 100 : 0;
      const saveRate = totalImpressions > 0 ? (saveActions.length / totalImpressions) * 100 : 0;
      const averageRating = ratingActions.length > 0 
        ? ratingActions.reduce((sum, action) => sum + (action.value || 0), 0) / ratingActions.length 
        : 0;
      const conversionRate = totalImpressions > 0 ? ((saveActions.length + ratingActions.length) / totalImpressions) * 100 : 0;

      return {
        totalImpressions,
        totalActions,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        saveRate: Math.round(saveRate * 100) / 100,
        averageRating: Math.round(averageRating * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting recommendation metrics:`, error);
      return {
        totalImpressions: 0,
        totalActions: 0,
        clickThroughRate: 0,
        saveRate: 0,
        averageRating: 0,
        conversionRate: 0
      };
    }
  }

  /**
   * Get bandit algorithm performance metrics
   */
  private static async getBanditPerformanceMetrics(
    startTime: Date, 
    endTime: Date
  ): Promise<BanditPerformanceMetrics[]> {
    try {
      // Get bandit models
      const { data: banditModels, error: banditError } = await supabase
        .from('user_contextual_preferences')
        .select('*')
        .gte('last_updated', startTime.toISOString())
        .lte('last_updated', endTime.toISOString());

      if (banditError) throw banditError;

      // Get impressions grouped by source (bandit arm)
      const { data: impressions, error: impressionError } = await supabase
        .from('recommendation_impressions')
        .select('source, reward')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString())
        .not('source', 'is', null);

      if (impressionError) throw impressionError;

      // Group by bandit arm
      const armMetrics = new Map<string, {
        totalRecommendations: number;
        totalRewards: number;
        rewards: number[];
      }>();

      impressions?.forEach(impression => {
        const armId = impression.source;
        if (!armMetrics.has(armId)) {
          armMetrics.set(armId, {
            totalRecommendations: 0,
            totalRewards: 0,
            rewards: []
          });
        }

        const metrics = armMetrics.get(armId)!;
        metrics.totalRecommendations++;
        if (impression.reward) {
          metrics.totalRewards += impression.reward;
          metrics.rewards.push(impression.reward);
        }
      });

      // Calculate performance metrics for each arm
      const banditPerformance: BanditPerformanceMetrics[] = [];

      for (const [armId, metrics] of Array.from(armMetrics.entries())) {
        const averageReward = metrics.totalRecommendations > 0 
          ? metrics.totalRewards / metrics.totalRecommendations 
          : 0;

        // Calculate confidence interval (simple approximation)
        const standardError = metrics.rewards.length > 1 
          ? Math.sqrt(
              metrics.rewards.reduce((sum, r) => sum + Math.pow(r - averageReward, 2), 0) / 
              (metrics.rewards.length - 1)
            ) / Math.sqrt(metrics.rewards.length)
          : 0;

        const confidenceInterval: [number, number] = [
          Math.max(0, averageReward - (1.96 * standardError)),
          averageReward + (1.96 * standardError)
        ];

        // Find corresponding bandit model for additional info
        const banditModel = banditModels?.find(model => 
          model.context_signature === armId || 
          model.context_data?.armId === armId
        );

        banditPerformance.push({
          armId,
          armName: this.getArmDisplayName(armId),
          totalRecommendations: metrics.totalRecommendations,
          totalRewards: Math.round(metrics.totalRewards * 100) / 100,
          averageReward: Math.round(averageReward * 1000) / 1000,
          explorationRate: Math.round((metrics.totalRecommendations / (impressions?.length || 1)) * 10000) / 100,
          confidenceInterval: [
            Math.round(confidenceInterval[0] * 1000) / 1000,
            Math.round(confidenceInterval[1] * 1000) / 1000
          ],
          lastUpdated: banditModel?.last_updated || new Date().toISOString()
        });
      }

      return banditPerformance.sort((a, b) => b.averageReward - a.averageReward);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting bandit performance metrics:`, error);
      return [];
    }
  }

  /**
   * Get system performance metrics
   */
  private static async getSystemPerformanceMetrics(
    startTime: Date, 
    endTime: Date
  ): Promise<SystemPerformanceMetrics> {
    try {
      // Get active sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('recommendation_actions')
        .select('session_id, user_id, created_at')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString());

      if (sessionError) throw sessionError;

      // Calculate unique users and sessions
      const uniqueUserIds = new Set(sessions?.map(s => s.user_id || s.session_id) || []);
      const uniqueSessionIds = new Set(sessions?.map(s => s.session_id).filter(Boolean) || []);

      // Get total books for coverage calculation
      const { count: totalBooks } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });

      // Get unique books recommended
      const { data: recommendedBooks, error: bookError } = await supabase
        .from('recommendation_impressions')
        .select('book_id')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString());

      const uniqueBooksRecommended = new Set(recommendedBooks?.map(r => r.book_id) || []);
      const recommendationCoverage = totalBooks && totalBooks > 0 
        ? (uniqueBooksRecommended.size / totalBooks) * 100 
        : 0;

      return {
        averageResponseTime: 0, // TODO: Implement timing tracking
        errorRate: 0, // TODO: Implement error tracking
        activeUsers: uniqueUserIds.size,
        totalSessions: uniqueSessionIds.size,
        recommendationCoverage: Math.round(recommendationCoverage * 100) / 100
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting system performance metrics:`, error);
      return {
        averageResponseTime: 0,
        errorRate: 0,
        activeUsers: 0,
        totalSessions: 0,
        recommendationCoverage: 0
      };
    }
  }

  /**
   * Get user engagement metrics
   */
  private static async getEngagementMetrics(
    startTime: Date, 
    endTime: Date
  ): Promise<EngagementMetrics> {
    try {
      // Get all user actions
      const { data: actions, error: actionError } = await supabase
        .from('recommendation_actions')
        .select('user_id, session_id, created_at, action_type')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString());

      if (actionError) throw actionError;

      const uniqueUsers = new Set(actions?.map(a => a.user_id || a.session_id) || []);
      const dailyActiveUsers = uniqueUsers.size;

      // Calculate session durations (approximate)
      const sessionData = new Map<string, { start: Date; end: Date; actions: number }>();
      
      actions?.forEach(action => {
        const sessionId = action.session_id || action.user_id || 'unknown';
        const actionTime = new Date(action.created_at);
        
        if (!sessionData.has(sessionId)) {
          sessionData.set(sessionId, {
            start: actionTime,
            end: actionTime,
            actions: 0
          });
        }
        
        const session = sessionData.get(sessionId)!;
        session.start = new Date(Math.min(session.start.getTime(), actionTime.getTime()));
        session.end = new Date(Math.max(session.end.getTime(), actionTime.getTime()));
        session.actions++;
      });

      // Calculate average session duration
      const sessionDurations = Array.from(sessionData.values())
        .map(session => session.end.getTime() - session.start.getTime())
        .filter(duration => duration > 0 && duration < 24 * 60 * 60 * 1000); // Filter out unrealistic durations

      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length / 1000 // Convert to seconds
        : 0;

      // Calculate bounce rate (sessions with only 1 action)
      const singleActionSessions = Array.from(sessionData.values()).filter(session => session.actions === 1);
      const bounceRate = sessionData.size > 0 ? (singleActionSessions.length / sessionData.size) * 100 : 0;

      // Get unique books discovered
      const { data: discoveries, error: discoveryError } = await supabase
        .from('recommendation_impressions')
        .select('book_id')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString());

      const booksDiscovered = new Set(discoveries?.map(d => d.book_id) || []).size;

      return {
        dailyActiveUsers,
        averageSessionDuration: Math.round(averageSessionDuration),
        bounceRate: Math.round(bounceRate * 100) / 100,
        returningUserRate: 0, // TODO: Implement returning user tracking
        booksDiscovered
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting engagement metrics:`, error);
      return {
        dailyActiveUsers: 0,
        averageSessionDuration: 0,
        bounceRate: 0,
        returningUserRate: 0,
        booksDiscovered: 0
      };
    }
  }

  /**
   * Get display name for bandit arm
   */
  private static getArmDisplayName(armId: string): string {
    const armNames: Record<string, string> = {
      'semantic_similarity': 'Content-Based',
      'contextual_mood': 'Mood-Based',
      'trending_popular': 'Trending',
      'collaborative_filtering': 'Collaborative',
      'personalized_mix': 'Personalized Mix',
      'contextual_basic': 'Basic Contextual',
      'bandit': 'Legacy Bandit'
    };

    return armNames[armId] || armId;
  }

  /**
   * Get historical performance data for trending analysis
   */
  static async getHistoricalPerformance(days: number = 7): Promise<{
    date: string;
    clickThroughRate: number;
    saveRate: number;
    averageReward: number;
  }[]> {
    try {
      const historicalData = [];
      const endDate = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const dayStart = new Date(endDate);
        dayStart.setDate(endDate.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayMetrics = await this.getRecommendationMetrics(dayStart, dayEnd);
        
        // Get average reward for the day
        const { data: dayImpressions } = await supabase
          .from('recommendation_impressions')
          .select('reward')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString())
          .not('reward', 'is', null);

        const averageReward = dayImpressions && dayImpressions.length > 0
          ? dayImpressions.reduce((sum, imp) => sum + (imp.reward || 0), 0) / dayImpressions.length
          : 0;

        historicalData.push({
          date: dayStart.toISOString().split('T')[0],
          clickThroughRate: dayMetrics.clickThroughRate,
          saveRate: dayMetrics.saveRate,
          averageReward: Math.round(averageReward * 1000) / 1000
        });
      }

      return historicalData;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting historical performance:`, error);
      return [];
    }
  }
}