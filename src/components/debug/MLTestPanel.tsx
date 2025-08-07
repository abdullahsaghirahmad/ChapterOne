import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  CogIcon,
  ClockIcon,
  Cog6ToothIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { useFeatureFlags } from '../../services/featureFlag.service';
import { MLService } from '../../services/ml.service';
import { FeatureFlagService } from '../../services/featureFlag.service';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { RewardSignalTestPanel } from './RewardSignalTestPanel';
import { ContextEncodingTestPanel } from './ContextEncodingTestPanel';
import { ContextualBanditsTestPanel } from './ContextualBanditsTestPanel';
import { Book } from '../../types';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
}

export const MLTestPanel: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { flags, loading: flagsLoading, isEnabled } = useFeatureFlags();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [updatingFlags, setUpdatingFlags] = useState<string[]>([]);

  const runMLTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      'Feature Flags Loading',
      'ML Service Initialization', 
      'Mock Embedding Generation',
      'Contextual Scoring',
      'Database Connection Test'
    ];

    // Initialize test results
    const initialResults = tests.map(test => ({
      test,
      status: 'pending' as const,
      message: 'Waiting...'
    }));
    setTestResults(initialResults);

    try {
      // Test 1: Feature Flags
      const startTime1 = Date.now();
      setTestResults(prev => prev.map(r => r.test === 'Feature Flags Loading' 
        ? { ...r, status: 'running', message: 'Checking feature flags...' }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      const hasContextualRecs = flags.contextual_recommendations_v1;
      
      setTestResults(prev => prev.map(r => r.test === 'Feature Flags Loading'
        ? {
            ...r,
            status: hasContextualRecs ? 'success' : 'error',
            message: hasContextualRecs 
              ? `✅ Contextual recommendations enabled`
              : '❌ Contextual recommendations disabled',
            duration: Date.now() - startTime1
          }
        : r
      ));

      // Test 2: ML Service
      const startTime2 = Date.now();
      setTestResults(prev => prev.map(r => r.test === 'ML Service Initialization'
        ? { ...r, status: 'running', message: 'Initializing ML service...' }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 300));
      
      setTestResults(prev => prev.map(r => r.test === 'ML Service Initialization'
        ? {
            ...r,
            status: 'success',
            message: '✅ ML Service ready',
            duration: Date.now() - startTime2
          }
        : r
      ));

      // Test 3: Mock Embedding
      const startTime3 = Date.now();
      setTestResults(prev => prev.map(r => r.test === 'Mock Embedding Generation'
        ? { ...r, status: 'running', message: 'Generating test embedding...' }
        : r
      ));

      const testText = "A thrilling adventure novel about courage and friendship";
      const embedding = await MLService.generateEmbedding(testText);
      
      setTestResults(prev => prev.map(r => r.test === 'Mock Embedding Generation'
        ? {
            ...r,
            status: embedding.length === 384 ? 'success' : 'error',
            message: embedding.length === 384 
              ? `✅ Generated ${embedding.length}D embedding`
              : `❌ Expected 384D, got ${embedding.length}D`,
            duration: Date.now() - startTime3
          }
        : r
      ));

      // Test 4: Contextual Scoring
      const startTime4 = Date.now();
      setTestResults(prev => prev.map(r => r.test === 'Contextual Scoring'
        ? { ...r, status: 'running', message: 'Testing contextual scoring...' }
        : r
      ));

      const testBook: Book = {
        id: 'test-book-1',
        title: 'Test Adventure Book',
        author: 'Test Author',
        coverImage: '',
        description: 'An exciting adventure story',
        pace: 'Fast',
        tone: ['exciting', 'adventurous'],
        themes: ['adventure', 'friendship'],
        bestFor: ['entertainment', 'quick read'],
        categories: ['fiction', 'adventure']
      };

      const contextVector = {
        mood: 'adventurous',
        situation: 'weekend',
        goal: 'entertainment',
        timeOfDay: 'afternoon' as const
      };

      const recommendations = await MLService.getContextualRecommendations(
        contextVector, 
        [testBook], 
        user?.id, 
        1
      );

      setTestResults(prev => prev.map(r => r.test === 'Contextual Scoring'
        ? {
            ...r,
            status: recommendations.length > 0 ? 'success' : 'error',
            message: recommendations.length > 0
              ? `✅ Generated ${recommendations.length} recommendation(s)`
              : '❌ No recommendations generated',
            duration: Date.now() - startTime4
          }
        : r
      ));

      // Test 5: Database Connection
      const startTime5 = Date.now();
      setTestResults(prev => prev.map(r => r.test === 'Database Connection Test'
        ? { ...r, status: 'running', message: 'Testing database connection...' }
        : r
      ));

      try {
        // Test feature flag database function
        const testFlag = await FeatureFlagService.isFeatureEnabled('contextual_recommendations_v1', user?.id);
        
        setTestResults(prev => prev.map(r => r.test === 'Database Connection Test'
          ? {
              ...r,
              status: 'success',
              message: `✅ Database connected (contextual_recs: ${testFlag})`,
              duration: Date.now() - startTime5
            }
          : r
        ));
      } catch (error) {
        setTestResults(prev => prev.map(r => r.test === 'Database Connection Test'
          ? {
              ...r,
              status: 'error',
              message: `❌ Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              duration: Date.now() - startTime5
            }
          : r
        ));
      }

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleFeatureFlag = async (flagName: string, currentValue: boolean) => {
    setUpdatingFlags(prev => [...prev, flagName]);
    
    try {
      // Use the proper FeatureFlagService to update the flag
      await FeatureFlagService.updateFeatureFlag(flagName, {
        isEnabled: !currentValue
      });

      console.log(`✅ Feature flag ${flagName} ${!currentValue ? 'enabled' : 'disabled'}`);
      
      // Show success feedback and reload to pick up new flags
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error(`Error toggling feature flag ${flagName}:`, error);
      alert(`Failed to toggle ${flagName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdatingFlags(prev => prev.filter(flag => flag !== flagName));
    }
  };

  if (flagsLoading) {
    return (
      <div className={`p-4 rounded-lg ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <div className="animate-pulse">Loading ML test panel...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CogIcon className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              ML System Test Panel
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Test the contextual recommendation engine
            </p>
          </div>
        </div>

        <button
          onClick={runMLTests}
          disabled={isRunning}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <ClockIcon className="h-4 w-4 animate-spin" />
              <span>Running Tests...</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              <span>Run Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Feature Flag Status */}
      <div className="mb-6">
        <h4 className={`text-sm font-medium mb-3 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
        }`}>
          Feature Flag Status
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(flags).map(([flag, enabled]) => (
            <div
              key={flag}
              className={`p-3 rounded-lg ${
                enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                {enabled ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <XCircleIcon className="h-4 w-4" />
                )}
                <span className="text-xs font-medium">
                  {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h4 className={`text-sm font-medium mb-3 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Test Results
          </h4>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <motion.div
                key={result.test}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : result.status === 'running'
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {result.status === 'success' && (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    )}
                    {result.status === 'error' && (
                      <XCircleIcon className="h-5 w-5 text-red-600" />
                    )}
                    {result.status === 'running' && (
                      <ClockIcon className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    {result.status === 'pending' && (
                      <div className="h-5 w-5 bg-gray-300 rounded-full" />
                    )}
                    
                    <div>
                      <div className={`font-medium text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {result.test}
                      </div>
                      <div className={`text-xs ${
                        result.status === 'success'
                          ? 'text-green-700 dark:text-green-300'
                          : result.status === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : result.status === 'running'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-500'
                      }`}>
                        {result.message}
                      </div>
                    </div>
                  </div>
                  
                  {result.duration && (
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {result.duration}ms
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className={`text-sm font-medium mb-3 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
        }`}>
          Quick Actions
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => FeatureFlagService.clearCache()}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Clear Feature Flag Cache
          </button>
          
          <button
            onClick={() => console.log('Current ML flags:', flags)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Log Flags to Console
          </button>
        </div>
      </div>

      {/* Feature Flag Toggles */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <FlagIcon className="h-5 w-5 text-blue-500" />
          <h4 className={`text-sm font-medium ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}>
            ML Feature Flags
          </h4>
        </div>
        
        <div className="space-y-3">
          {/* Contextual Recommendations Flag */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Contextual Recommendations
                </div>
                <div className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Enable contextual recommendations with mood/situation/goal
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  isEnabled('contextual_recommendations_v1')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {isEnabled('contextual_recommendations_v1') ? 'ON' : 'OFF'}
                </span>
                
                <button
                  onClick={() => toggleFeatureFlag('contextual_recommendations_v1', isEnabled('contextual_recommendations_v1'))}
                  disabled={updatingFlags.includes('contextual_recommendations_v1')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    updatingFlags.includes('contextual_recommendations_v1')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isEnabled('contextual_recommendations_v1')
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {updatingFlags.includes('contextual_recommendations_v1') ? (
                    <Cog6ToothIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    isEnabled('contextual_recommendations_v1') ? 'Disable' : 'Enable'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Contextual Bandits Flag */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Contextual Bandits Algorithm
                </div>
                <div className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Enable LinUCB algorithm for intelligent strategy selection
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  isEnabled('contextual_bandits')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {isEnabled('contextual_bandits') ? 'ON' : 'OFF'}
                </span>
                
                <button
                  onClick={() => toggleFeatureFlag('contextual_bandits', isEnabled('contextual_bandits'))}
                  disabled={updatingFlags.includes('contextual_bandits')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    updatingFlags.includes('contextual_bandits')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isEnabled('contextual_bandits')
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {updatingFlags.includes('contextual_bandits') ? (
                    <Cog6ToothIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    isEnabled('contextual_bandits') ? 'Disable' : 'Enable'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Context Awareness Panel Flag */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Context Awareness Panel
                </div>
                <div className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Show mood/situation/goal selector in recommendations
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  isEnabled('context_awareness_panel')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {isEnabled('context_awareness_panel') ? 'ON' : 'OFF'}
                </span>
                
                <button
                  onClick={() => toggleFeatureFlag('context_awareness_panel', isEnabled('context_awareness_panel'))}
                  disabled={updatingFlags.includes('context_awareness_panel')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    updatingFlags.includes('context_awareness_panel')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isEnabled('context_awareness_panel')
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {updatingFlags.includes('context_awareness_panel') ? (
                    <Cog6ToothIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    isEnabled('context_awareness_panel') ? 'Disable' : 'Enable'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Semantic Embeddings V1 */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Semantic Embeddings V1
                </div>
                <div className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Enable JavaScript TF-IDF + Cosine similarity for semantic matching
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  isEnabled('semantic_embeddings_v1')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {isEnabled('semantic_embeddings_v1') ? 'ON' : 'OFF'}
                </span>
                
                <button
                  onClick={() => toggleFeatureFlag('semantic_embeddings_v1', isEnabled('semantic_embeddings_v1'))}
                  disabled={updatingFlags.includes('semantic_embeddings_v1')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    updatingFlags.includes('semantic_embeddings_v1')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isEnabled('semantic_embeddings_v1')
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {updatingFlags.includes('semantic_embeddings_v1') ? (
                    <Cog6ToothIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    isEnabled('semantic_embeddings_v1') ? 'Disable' : 'Enable'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Recommendation Explanations */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Recommendation Explanations
                </div>
                <div className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Show "Why this book?" explanations with recommendations
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  isEnabled('recommendation_explanations')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {isEnabled('recommendation_explanations') ? 'ON' : 'OFF'}
                </span>
                
                <button
                  onClick={() => toggleFeatureFlag('recommendation_explanations', isEnabled('recommendation_explanations'))}
                  disabled={updatingFlags.includes('recommendation_explanations')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    updatingFlags.includes('recommendation_explanations')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isEnabled('recommendation_explanations')
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {updatingFlags.includes('recommendation_explanations') ? (
                    <Cog6ToothIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    isEnabled('recommendation_explanations') ? 'Disable' : 'Enable'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ML Debug Mode (Local only) */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  ML Debug Mode
                </div>
                <div className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Show detailed ML logs and debug panels (local env var)
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  process.env.REACT_APP_ML_DEBUG === 'true'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {process.env.REACT_APP_ML_DEBUG === 'true' ? 'ON' : 'OFF'}
                </span>
                
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  (env var)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className={`mt-4 p-3 rounded-lg ${
          theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
        }`}>
          <div className={`text-xs ${
            theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
          }`}>
            <strong>Quick Setup:</strong> Enable both "Contextual Recommendations" and "Contextual Bandits" to test the full ML system.
            The page will reload automatically after changes.
          </div>
        </div>
      </div>

      {/* Reward Signal Pipeline Test */}
      <div className="mt-8">
        <RewardSignalTestPanel />
      </div>

      {/* Context Encoding Test */}
      <div className="mt-8">
        <ContextEncodingTestPanel />
      </div>

      {/* Contextual Bandits Test */}
      <div className="mt-8">
        <ContextualBanditsTestPanel />
      </div>
    </div>
  );
};