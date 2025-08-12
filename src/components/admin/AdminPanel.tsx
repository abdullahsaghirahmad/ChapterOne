import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { 
  CogIcon, 
  ShieldCheckIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  HomeIcon,
  PresentationChartBarIcon,
  Cog6ToothIcon,
  BeakerIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { MLTestPanel } from '../debug/MLTestPanel';
import { JSSemanticSimilarityPanel } from '../debug/JSSemanticSimilarityPanel';
import { RewardSignalsTestPanel } from '../debug/RewardSignalsTestPanel';
import { MLPerformanceMonitoringPanel } from '../debug/MLPerformanceMonitoringPanel';
import { MLDataManagementPanel } from '../debug/MLDataManagementPanel';
import { ContentManagementPanel } from './ContentManagementPanel';
import { SearchAnalyticsPanel } from './SearchAnalyticsPanel';
import { HybridContentTestPanel } from '../debug/HybridContentTestPanel';
import { useNavigate } from 'react-router-dom';

// Admin configuration - Only this email can access the admin panel
const ADMIN_EMAIL = 'abdullahsaghirahmad@gmail.com';

interface AdminStats {
  totalUsers: number;
  totalBooks: number;
  mlRecommendations: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

type AdminTab = 'overview' | 'analytics' | 'content' | 'configuration' | 'development';

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const ADMIN_TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: HomeIcon,
    description: 'System dashboard and key metrics'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: PresentationChartBarIcon,
    description: 'Performance insights and ML metrics'
  },
  {
    id: 'content',
    label: 'Content',
    icon: DocumentTextIcon,
    description: 'AI-enhanced content management and quality tracking'
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: Cog6ToothIcon,
    description: 'System settings and feature flags'
  },
  {
    id: 'development',
    label: 'Development',
    icon: BeakerIcon,
    description: 'Testing tools and debugging'
  }
];

export const AdminPanel: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalBooks: 0,
    mlRecommendations: 0,
    systemHealth: 'healthy'
  });
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    // Restore tab from localStorage or default to overview
    const savedTab = localStorage.getItem('admin-panel-active-tab') as AdminTab;
    return savedTab && ['overview', 'analytics', 'content', 'configuration', 'development'].includes(savedTab) 
      ? savedTab 
      : 'overview';
  });

  // Check if user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    // TODO: Fetch real admin stats from your API
    setStats({
      totalUsers: 3,
      totalBooks: 50,
      mlRecommendations: 127,
      systemHealth: 'healthy'
    });
  }, []);

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Quick Stats - moved here */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
              <div className={`p-6 rounded-xl ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}>
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <CogIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Users
                    </p>
                    <p className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-xl ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}>
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Books Catalog
                    </p>
                    <p className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.totalBooks}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-xl ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}>
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      ML Recommendations
                    </p>
                    <p className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.mlRecommendations}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-xl ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    stats.systemHealth === 'healthy' 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    <ShieldCheckIcon className={`h-6 w-6 ${
                      stats.systemHealth === 'healthy' ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      System Health
                    </p>
                    <p className={`text-2xl font-bold capitalize ${
                      stats.systemHealth === 'healthy' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {stats.systemHealth}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Welcome message */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`p-6 rounded-xl ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}
            >
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                System Overview
              </h3>
              <p className={`${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Welcome to the ChapterOne Admin Panel. Your ML recommendation system is running smoothly with {stats.mlRecommendations} recommendations generated. All systems are operating normally.
              </p>
            </motion.div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <SearchAnalyticsPanel />
            <MLPerformanceMonitoringPanel />
          </div>
        );

      case 'content':
        return (
          <div className="space-y-6">
            <ContentManagementPanel />
          </div>
        );

      case 'configuration':
        return (
          <div className="space-y-6">
            <MLTestPanel />
          </div>
        );

      case 'development':
        return (
          <div className="space-y-6">
            <HybridContentTestPanel />
            <MLDataManagementPanel />
            <JSSemanticSimilarityPanel />
            <RewardSignalsTestPanel />
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Unauthorized access
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-auto text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This area is restricted to administrators only.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className={`text-3xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  ChapterOne Admin Panel
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Welcome back, {user.user_metadata?.full_name || user.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/')}
              className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to App
            </button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className={`border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <nav className="flex space-x-8">
              {ADMIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDevelopment = tab.id === 'development';
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      localStorage.setItem('admin-panel-active-tab', tab.id);
                    }}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? `border-blue-500 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`
                        : `border-transparent ${
                            theme === 'dark' 
                              ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`
                    } ${isDevelopment ? 'opacity-75' : ''}`}
                    title={tab.description}
                  >
                    <Icon className={`mr-2 h-5 w-5 ${
                      isActive 
                        ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')
                        : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
                    }`} />
                    {tab.label}
                    {isDevelopment && (
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        theme === 'dark' 
                          ? 'bg-yellow-900 text-yellow-200' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        Beta
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
};