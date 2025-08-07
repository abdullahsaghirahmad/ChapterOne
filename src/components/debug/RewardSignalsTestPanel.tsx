import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { ContextualBanditsService } from '../../services/contextualBandits.service';
import { 
  ChartBarIcon, 
  EyeIcon, 
  CursorArrowRippleIcon,
  ArrowPathIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface RewardSignalData {
  impressions: any[];
  actions: any[];
  attribution_summary: {
    total_impressions: number;
    total_actions: number;
    attributed_actions: number;
    total_reward: number;
  };
}

export const RewardSignalsTestPanel: React.FC = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<RewardSignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [banditProcessing, setBanditProcessing] = useState(false);
  const [banditInitializing, setBanditInitializing] = useState(false);
  const [lastBanditUpdate, setLastBanditUpdate] = useState<{
    processed: number;
    updated: number;
    errors: number;
    timestamp: string;
  } | null>(null);
  const [lastBanditInit, setLastBanditInit] = useState<{
    initialized: number;
    errors: number;
    timestamp: string;
  } | null>(null);

  const fetchRewardData = async () => {
    setLoading(true);
    try {
      // Fetch recent impressions (last 50)
      const { data: impressions, error: impressionsError } = await supabase
        .from('recommendation_impressions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (impressionsError) throw impressionsError;

      // Fetch recent actions (last 50)
      const { data: actions, error: actionsError } = await supabase
        .from('recommendation_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (actionsError) throw actionsError;

      // Calculate attribution summary
      const attributed_actions = actions?.filter(action => 
        impressions?.some(imp => 
          imp.book_id === action.book_id && 
          imp.reward && 
          imp.reward > 0
        )
      ).length || 0;

      const total_reward = impressions?.reduce((sum, imp) => sum + (imp.reward || 0), 0) || 0;

      setData({
        impressions: impressions || [],
        actions: actions || [],
        attribution_summary: {
          total_impressions: impressions?.length || 0,
          total_actions: actions?.length || 0,
          attributed_actions,
          total_reward
        }
      });
    } catch (error) {
      console.error('Error fetching reward data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeBandits = async () => {
    setBanditInitializing(true);
    try {
      console.log('Initializing bandit models...');
      const result = await ContextualBanditsService.initializeBanditModels(undefined);
      
      setLastBanditInit({
        ...result,
        timestamp: new Date().toISOString()
      });
      
      console.log('Bandit initialization complete:', result);
    } catch (error) {
      console.error('Error initializing bandits:', error);
    } finally {
      setBanditInitializing(false);
    }
  };

  const processBanditLearning = async () => {
    setBanditProcessing(true);
    try {
      console.log('Processing reward signals for bandit learning...');
      const result = await ContextualBanditsService.processRewardSignals(undefined, 24);
      
      setLastBanditUpdate({
        ...result,
        timestamp: new Date().toISOString()
      });
      
      console.log('Bandit learning update complete:', result);
    } catch (error) {
      console.error('Error processing bandit learning:', error);
    } finally {
      setBanditProcessing(false);
    }
  };

  useEffect(() => {
    fetchRewardData();
  }, []);

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'click': return 'text-blue-600';
      case 'save': return 'text-green-600';
      case 'unsave': return 'text-red-600';
      case 'rate': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold">Reward Signals Test Panel</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={initializeBandits}
            disabled={banditInitializing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'border-green-600 hover:border-green-500 bg-green-700' 
                : 'border-green-300 hover:border-green-400 bg-green-50'
            } transition-colors ${banditInitializing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <CpuChipIcon className={`h-4 w-4 ${banditInitializing ? 'animate-pulse' : ''}`} />
            <span>Initialize Bandits</span>
          </button>
          <button
            onClick={processBanditLearning}
            disabled={banditProcessing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'border-purple-600 hover:border-purple-500 bg-purple-700' 
                : 'border-purple-300 hover:border-purple-400 bg-purple-50'
            } transition-colors ${banditProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <CpuChipIcon className={`h-4 w-4 ${banditProcessing ? 'animate-pulse' : ''}`} />
            <span>Update Bandits</span>
          </button>
          <button
            onClick={fetchRewardData}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'border-gray-600 hover:border-gray-500 bg-gray-700' 
                : 'border-gray-300 hover:border-gray-400 bg-white'
            } transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2">
              <EyeIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Impressions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.attribution_summary.total_impressions}</p>
          </div>
          
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2">
              <CursorArrowRippleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Actions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.attribution_summary.total_actions}</p>
          </div>
          
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Attributed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.attribution_summary.attributed_actions}</p>
          </div>
          
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Total Reward</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.attribution_summary.total_reward.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Bandit Initialization Status */}
      {lastBanditInit && (
        <div className={`p-4 rounded-lg border-l-4 border-green-500 ${theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">🚀 Latest Bandit Initialization</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">
                {lastBanditInit.initialized > 0 ? 'Created:' : 'Status:'}
              </span> 
              {lastBanditInit.initialized > 0 
                ? `${lastBanditInit.initialized} new models` 
                : '✅ All models exist'
              }
            </div>
            <div>
              <span className="font-medium">Errors:</span> {lastBanditInit.errors}
            </div>
          </div>
          <p className="text-xs text-green-600 dark:text-green-200 mt-2">
            Last init: {formatTimeAgo(lastBanditInit.timestamp)} • 
            {lastBanditInit.initialized === 0 ? 'No new models needed' : `${lastBanditInit.initialized} models created`}
          </p>
        </div>
      )}

      {/* Bandit Learning Status */}
      {lastBanditUpdate && (
        <div className={`p-4 rounded-lg border-l-4 border-purple-500 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
          <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">🤖 Latest Bandit Learning Update</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Processed:</span> {lastBanditUpdate.processed} signals
            </div>
            <div>
              <span className="font-medium">Updated:</span> {lastBanditUpdate.updated} models
            </div>
            <div>
              <span className="font-medium">Errors:</span> {lastBanditUpdate.errors}
            </div>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-200 mt-2">
            Last update: {formatTimeAgo(lastBanditUpdate.timestamp)}
          </p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Impressions */}
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h3 className="text-lg font-semibold mb-4">Recent Impressions</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data?.impressions.slice(0, 10).map((impression) => (
              <div key={impression.id} className={`p-3 rounded border ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium truncate">{impression.book_id}</p>
                    <p className="text-sm text-gray-500">
                      Source: {impression.source} | Rank: {impression.rank} | Score: {impression.score?.toFixed(2)}
                    </p>
                    {impression.reward && (
                      <p className="text-sm text-green-600 font-medium">
                        Reward: +{impression.reward.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(impression.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Actions */}
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h3 className="text-lg font-semibold mb-4">Recent Actions</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data?.actions.slice(0, 10).map((action) => (
              <div key={action.id} className={`p-3 rounded border ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium truncate">{action.book_id}</p>
                    <p className={`text-sm font-medium ${getActionTypeColor(action.action_type)}`}>
                      {action.action_type.toUpperCase()}
                      {action.value && ` (${action.value})`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(action.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className={`p-4 rounded-lg border-l-4 border-blue-500 ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
        <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">🧪 Phase 3 Testing Instructions</h3>
        <ol className="text-sm space-y-1 text-blue-600 dark:text-blue-200">
          <li>1. <strong>First time?</strong> Click "Initialize Bandits" to set up bandit models</li>
          <li>2. Go to the homepage and view "For You Right Now" recommendations</li>
          <li>3. Click on a book card → Should see new "click" action</li>
          <li>4. Save a book → Should see new "save" action</li>
          <li>5. Return here and refresh → Check if actions are attributed to impressions</li>
          <li>6. Click "Update Bandits" → Processes reward signals for bandit learning</li>
          <li>7. Verify bandit learning: Check processed/updated counts</li>
          <li>8. The ML system is now learning from user interactions! 🎉</li>
        </ol>
        <div className="mt-3 text-xs text-blue-500 dark:text-blue-300">
          💡 Tip: If you see "Model not found" errors, initialize bandits first!
        </div>
      </div>
    </div>
  );
};