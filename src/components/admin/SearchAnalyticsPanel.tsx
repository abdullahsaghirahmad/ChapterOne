import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  MagnifyingGlassIcon,
  SparklesIcon,
  EyeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { personalizationService } from '../../services/personalization.service';

interface SearchAnalyticsData {
  totalSearches: number;
  totalHelperUsage: number;
  inspirationPanelOpens: number;
  topHelpers: Array<{
    type: string;
    value: string;
    count: number;
    percentage: number;
  }>;
  searchPatterns: Array<{
    searchType: string;
    count: number;
    averageResults: number;
  }>;
  timeDistribution: Array<{
    hour: number;
    searches: number;
  }>;
  userTypes: {
    anonymous: number;
    authenticated: number;
  };
}

export const SearchAnalyticsPanel: React.FC = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<SearchAnalyticsData>({
    totalSearches: 0,
    totalHelperUsage: 0,
    inspirationPanelOpens: 0,
    topHelpers: [],
    searchPatterns: [],
    timeDistribution: [],
    userTypes: { anonymous: 0, authenticated: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchSearchAnalytics();
  }, [timeRange]);

  const fetchSearchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert timeRange to hours
      const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720; // 30d = 720h
      
      // Fetch real analytics data from PersonalizationService
      const analyticsData = await personalizationService.getSearchAnalytics(timeRangeHours);
      
      // Add empty timeDistribution since we don't track hourly data yet
      const enrichedData: SearchAnalyticsData = {
        ...analyticsData,
        timeDistribution: [] // We can implement this later if needed
      };
      
      setData(enrichedData);
      console.log('[SEARCH_ANALYTICS] Fetched real analytics data:', enrichedData);
    } catch (err) {
      console.error('[SEARCH_ANALYTICS] Error fetching data:', err);
      setError('Failed to load search analytics data');
    } finally {
      setLoading(false);
    }
  };

  const helperUsageRate = data.totalSearches > 0 ? (data.totalHelperUsage / data.totalSearches * 100).toFixed(1) : '0';
  const inspirationRate = data.totalHelperUsage > 0 ? (data.inspirationPanelOpens / data.totalHelperUsage * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="text-center text-red-500">
          <p className="font-medium">Error loading analytics</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={fetchSearchAnalytics}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
          }`}>
            <MagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Search Analytics
            </h2>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              User search behavior and inspiration helper usage
            </p>
          </div>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex space-x-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Searches
              </p>
              <p className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {data.totalSearches.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <SparklesIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Helper Usage
              </p>
              <p className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {data.totalHelperUsage}
              </p>
              <p className="text-sm text-purple-600 font-medium">
                {helperUsageRate}% of searches
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <EyeIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Inspiration Panel
              </p>
              <p className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {data.inspirationPanelOpens}
              </p>
              <p className="text-sm text-orange-600 font-medium">
                {inspirationRate}% open rate
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                User Split
              </p>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {Math.round(data.userTypes.authenticated / (data.userTypes.anonymous + data.userTypes.authenticated) * 100)}% auth
              </p>
              <p className="text-sm text-green-600 font-medium">
                {data.userTypes.authenticated} / {data.userTypes.anonymous}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Search Helpers */}
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Most Popular Search Helpers
        </h3>
        
        <div className="space-y-3">
          {data.topHelpers.map((helper, index) => (
            <div key={`${helper.type}-${helper.value}`} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < 3 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {helper.value}
                  </p>
                  <p className={`text-sm capitalize ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {helper.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {helper.count}
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {helper.percentage}%
                </p>
              </div>
              
              {/* Progress bar */}
              <div className="w-20 ml-4">
                <div className={`h-2 rounded-full ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <div 
                    className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${helper.percentage * 5}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Patterns */}
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Search Pattern Analysis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.searchPatterns.map((pattern) => (
            <div key={pattern.searchType} className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`font-medium capitalize ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {pattern.searchType.replace('search_helper_', '').replace('_', ' ')}
                </p>
                <span className={`text-sm px-2 py-1 rounded ${
                  theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {pattern.count}
                </span>
              </div>
              
              {pattern.averageResults > 0 && (
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Avg. {pattern.averageResults} results
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Insights Summary */}
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Key Insights
        </h3>
        
        <div className="space-y-3">
          {data.totalSearches > 0 ? (
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
            } border`}>
              <p className={`font-medium text-blue-600 dark:text-blue-400 mb-1`}>
                🎯 Discovery Behavior
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {helperUsageRate}% of users use search helpers, indicating {
                  parseFloat(helperUsageRate) > 20 ? 'strong' : parseFloat(helperUsageRate) > 10 ? 'moderate' : 'emerging'
                } discovery behavior. 
                {data.topHelpers.length > 0 && ` ${data.topHelpers[0].type.replace('_', ' ')} is the most popular helper type.`}
              </p>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-900/20 border-gray-700' : 'bg-gray-50 border-gray-200'
            } border`}>
              <p className={`font-medium text-gray-600 dark:text-gray-400 mb-1`}>
                📊 Getting Started
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                No search data yet. Users need to interact with the "Search Inspiration" panel to generate analytics. 
                Try using mood/theme helpers on the homepage to see data appear here.
              </p>
            </div>
          )}
          
          {data.totalHelperUsage > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'
            } border`}>
              <p className={`font-medium text-purple-600 dark:text-purple-400 mb-1`}>
                ✨ Inspiration Panel Effectiveness
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {inspirationRate}% of helper users open the inspiration panel, showing {
                  parseFloat(inspirationRate) > 30 ? 'excellent' : parseFloat(inspirationRate) > 15 ? 'good' : 'emerging'
                } discoverability of the "Search Inspiration" feature.
              </p>
            </div>
          )}

          {(data.userTypes.anonymous > 0 || data.userTypes.authenticated > 0) && (
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
            } border`}>
              <p className={`font-medium text-green-600 dark:text-green-400 mb-1`}>
                👥 User Engagement
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {data.userTypes.anonymous > 0 && data.userTypes.authenticated > 0 ? (
                  <>
                    Balanced mix of anonymous ({Math.round(data.userTypes.anonymous / (data.userTypes.anonymous + data.userTypes.authenticated) * 100)}%) 
                    and authenticated ({Math.round(data.userTypes.authenticated / (data.userTypes.anonymous + data.userTypes.authenticated) * 100)}%) users, 
                    indicating broad appeal across user types.
                  </>
                ) : data.userTypes.authenticated > 0 ? (
                  `Primarily authenticated users (${data.userTypes.authenticated}), showing strong user engagement.`
                ) : (
                  `Primarily anonymous users (${data.userTypes.anonymous}), indicating good discovery experience for new visitors.`
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
