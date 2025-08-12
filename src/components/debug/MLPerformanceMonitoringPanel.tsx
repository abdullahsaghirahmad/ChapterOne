import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  UsersIcon, 
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  HandThumbUpIcon,
  StarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { 
  MLPerformanceMetricsService, 
  MLPerformanceReport,
  BanditPerformanceMetrics 
} from '../../services/mlPerformanceMetrics.service';

interface MLPerformanceMonitoringPanelProps {}

export const MLPerformanceMonitoringPanel: React.FC<MLPerformanceMonitoringPanelProps> = () => {
  const { theme } = useTheme();
  const [performanceReport, setPerformanceReport] = useState<MLPerformanceReport | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24); // hours

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      console.log('Fetching ML performance data...');
      
      const [report, historical] = await Promise.all([
        MLPerformanceMetricsService.generatePerformanceReport(timeRange),
        MLPerformanceMetricsService.getHistoricalPerformance(7)
      ]);
      
      setPerformanceReport(report);
      setHistoricalData(historical);
      setLastRefresh(new Date().toISOString());
      
      console.log('ML performance data loaded:', report);
    } catch (error) {
      console.error('Error fetching ML performance data:', error);
      // Set mock data for development
      setPerformanceReport({
        recommendations: {
          totalImpressions: 0,
          totalActions: 0,
          clickThroughRate: 0,
          saveRate: 0,
          averageRating: 0,
          conversionRate: 0
        },
        bandits: [],
        system: {
          averageResponseTime: 0,
          errorRate: 0,
          activeUsers: 0,
          totalSessions: 0,
          recommendationCoverage: 0
        },
        engagement: {
          dailyActiveUsers: 0,
          averageSessionDuration: 0,
          bounceRate: 0,
          returningUserRate: 0,
          booksDiscovered: 0
        },
        generatedAt: new Date().toISOString(),
        timeRange: {
          from: new Date(Date.now() - timeRange * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
          hours: timeRange
        }
      });
      setHistoricalData([]);
    } finally {
      setLoading(false);
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

  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'poor': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircleIcon className="h-5 w-5" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'poor': return <ExclamationTriangleIcon className="h-5 w-5" />;
      default: return <ClockIcon className="h-5 w-5" />;
    }
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: React.ReactNode,
    status: string = 'neutral',
    trend?: 'up' | 'down'
  ) => (
    <div className={`p-4 rounded-lg border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {icon}
        </div>
        <div className={`flex items-center space-x-1 ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
          {trend && (
            trend === 'up' ? 
              <ArrowUpIcon className="h-4 w-4" /> : 
              <ArrowDownIcon className="h-4 w-4" />
          )}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {title}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {subtitle}
        </div>
      </div>
    </div>
  );

  const renderBanditPerformance = (bandits: BanditPerformanceMetrics[]) => (
    <div className={`p-6 rounded-lg border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <CpuChipIcon className="h-5 w-5 mr-2" />
          Bandit Algorithm Performance
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          bandits.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {bandits.length} Active Arms
        </div>
      </div>

      {bandits.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CpuChipIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No bandit performance data available</p>
          <p className="text-sm">Generate some recommendations to see metrics</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bandits.map((bandit, index) => (
            <div key={bandit.armId} className={`p-4 rounded-lg border ${
              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {bandit.armName}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {bandit.armId}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  index === 0 ? 'bg-green-100 text-green-800' :
                  index === 1 ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  #{index + 1}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {bandit.totalRecommendations}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Recommendations
                  </div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {bandit.averageReward.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Avg Reward
                  </div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {bandit.explorationRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Exploration Rate
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    [{bandit.confidenceInterval[0].toFixed(3)}, {bandit.confidenceInterval[1].toFixed(3)}]
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    95% Confidence
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistoricalChart = () => {
    if (historicalData.length === 0) return null;

    const maxCTR = Math.max(...historicalData.map(d => d.clickThroughRate));
    const maxSaveRate = Math.max(...historicalData.map(d => d.saveRate));

    return (
      <div className={`p-6 rounded-lg border ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      } shadow-sm`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
          <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
          7-Day Performance Trend
        </h3>

        <div className="space-y-4">
          {historicalData.map((day, index) => (
            <div key={day.date} className="flex items-center space-x-4">
              <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                {new Date(day.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-20 text-xs text-gray-600 dark:text-gray-400">CTR</div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${maxCTR > 0 ? (day.clickThroughRate / maxCTR) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-12 text-xs text-gray-900 dark:text-white font-medium">
                    {day.clickThroughRate.toFixed(1)}%
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-20 text-xs text-gray-600 dark:text-gray-400">Save</div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${maxSaveRate > 0 ? (day.saveRate / maxSaveRate) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-12 text-xs text-gray-900 dark:text-white font-medium">
                    {day.saveRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!performanceReport && !loading) {
    return (
      <div className={`space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center">
            <ChartBarIcon className="h-8 w-8 mr-3" />
            ML Performance Monitoring
          </h2>
          <button
            onClick={fetchPerformanceData}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'border-blue-600 hover:border-blue-500 bg-blue-700' 
                : 'border-blue-300 hover:border-blue-400 bg-blue-50'
            } transition-colors`}
          >
            <ChartBarIcon className="h-4 w-4" />
            <span>Generate Report</span>
          </button>
        </div>

        <div className={`p-8 rounded-lg border-2 border-dashed ${
          theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
        } text-center`}>
          <ChartBarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Performance Data</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click "Generate Report" to analyze your ML system's performance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <ChartBarIcon className="h-8 w-8 mr-3" />
          ML Performance Monitoring
        </h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className={`px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button
            onClick={fetchPerformanceData}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'border-blue-600 hover:border-blue-500 bg-blue-700' 
                : 'border-blue-300 hover:border-blue-400 bg-blue-50'
            } transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ChartBarIcon className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {lastRefresh && (
        <div className={`flex items-center justify-between p-3 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            <ClockIcon className="h-4 w-4" />
            <span>Last updated: {formatTimeAgo(lastRefresh)}</span>
          </div>
          {performanceReport && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Report period: {performanceReport.timeRange.hours}h 
              ({new Date(performanceReport.timeRange.from).toLocaleString()} - {new Date(performanceReport.timeRange.to).toLocaleString()})
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className={`p-8 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } text-center`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Analyzing ML performance data...</p>
        </div>
      )}

      {performanceReport && !loading && (
        <>
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderMetricCard(
              "Click-Through Rate",
              `${performanceReport.recommendations.clickThroughRate}%`,
              `${performanceReport.recommendations.totalImpressions} impressions`,
              <EyeIcon className="h-5 w-5" />,
              getPerformanceStatus(performanceReport.recommendations.clickThroughRate, { good: 5, warning: 2 })
            )}

            {renderMetricCard(
              "Save Rate",
              `${performanceReport.recommendations.saveRate}%`,
              `${performanceReport.recommendations.totalActions} total actions`,
              <HandThumbUpIcon className="h-5 w-5" />,
              getPerformanceStatus(performanceReport.recommendations.saveRate, { good: 3, warning: 1 })
            )}

            {renderMetricCard(
              "Average Rating",
              performanceReport.recommendations.averageRating.toFixed(1),
              "User satisfaction score",
              <StarIcon className="h-5 w-5" />,
              getPerformanceStatus(performanceReport.recommendations.averageRating, { good: 4, warning: 3 })
            )}

            {renderMetricCard(
              "Active Users",
              performanceReport.engagement.dailyActiveUsers,
              `${performanceReport.system.totalSessions} sessions`,
              <UsersIcon className="h-5 w-5" />,
              performanceReport.engagement.dailyActiveUsers > 0 ? 'good' : 'poor'
            )}
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderMetricCard(
              "Conversion Rate",
              `${performanceReport.recommendations.conversionRate}%`,
              "Saves + ratings",
              <ArrowTrendingUpIcon className="h-5 w-5" />,
              getPerformanceStatus(performanceReport.recommendations.conversionRate, { good: 5, warning: 2 })
            )}

            {renderMetricCard(
              "Books Discovered",
              performanceReport.engagement.booksDiscovered,
              "Unique recommendations",
              <EyeIcon className="h-5 w-5" />,
              'good'
            )}

            {renderMetricCard(
              "Recommendation Coverage",
              `${performanceReport.system.recommendationCoverage}%`,
              "Catalog coverage",
              <ChartBarIcon className="h-5 w-5" />,
              getPerformanceStatus(performanceReport.system.recommendationCoverage, { good: 20, warning: 10 })
            )}

            {renderMetricCard(
              "Session Duration",
              `${Math.floor(performanceReport.engagement.averageSessionDuration / 60)}m`,
              `${performanceReport.engagement.averageSessionDuration}s average`,
              <ClockIcon className="h-5 w-5" />,
              getPerformanceStatus(performanceReport.engagement.averageSessionDuration, { good: 300, warning: 120 })
            )}
          </div>

          {/* Bandit Performance */}
          {renderBanditPerformance(performanceReport.bandits)}

          {/* Historical Trend */}
          {renderHistoricalChart()}

          {/* Performance Insights */}
          <div className={`p-6 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } shadow-sm`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Performance Insights
            </h3>
            
            <div className="space-y-3">
              {performanceReport.recommendations.clickThroughRate < 2 && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">Low Click-Through Rate</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      Consider improving recommendation relevance or UI visibility
                    </div>
                  </div>
                </div>
              )}

              {performanceReport.system.recommendationCoverage < 10 && (
                <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-orange-800 dark:text-orange-200">Low Catalog Coverage</div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Only {performanceReport.system.recommendationCoverage}% of books are being recommended
                    </div>
                  </div>
                </div>
              )}

              {performanceReport.engagement.dailyActiveUsers === 0 && (
                <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800 dark:text-red-200">No Active Users</div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      Generate some user interactions to see meaningful metrics
                    </div>
                  </div>
                </div>
              )}

              {performanceReport.recommendations.clickThroughRate >= 5 && 
               performanceReport.recommendations.saveRate >= 3 && (
                <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">Excellent Performance</div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Your ML system is performing above industry benchmarks!
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MLPerformanceMonitoringPanel;