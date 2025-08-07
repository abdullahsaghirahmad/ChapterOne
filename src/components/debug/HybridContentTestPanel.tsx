/**
 * Hybrid Content Test Panel
 * 
 * Admin panel for testing the hybrid content creation system.
 * Allows testing of the complete pipeline from external APIs to AI enhancement.
 */

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  CpuChipIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { BookCreationIntegrationService, BookCreationResult } from '../../services/bookCreationIntegration.service';

export const HybridContentTestPanel: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookCreationResult | null>(null);
  const [testInput, setTestInput] = useState({
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: ''
  });
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🚀 Testing hybrid content creation for:', testInput);
      
      const testResult = await BookCreationIntegrationService.createEnhancedBook({
        title: testInput.title,
        author: testInput.author,
        isbn: testInput.isbn || undefined,
        source: 'admin',
        userId: user?.id
      });
      
      setResult(testResult);
      console.log('✅ Test completed:', testResult);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({
        success: false,
        bookData: {
          title: testInput.title,
          author: testInput.author,
          description: 'Test failed',
          quote: 'Error occurred'
        },
        processingTime: 0,
        sourcesUsed: [],
        enhancementsApplied: [],
        qualityReport: {
          summary: 'Test failed',
          confidence: 0,
          adminFlags: ['test_error']
        },
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPipelineStatus = async () => {
    try {
      const status = await BookCreationIntegrationService.getPipelineStatus(user?.id);
      setPipelineStatus(status);
      console.log('Pipeline status:', status);
    } catch (error) {
      console.error('Failed to get pipeline status:', error);
    }
  };

  React.useEffect(() => {
    checkPipelineStatus();
  }, [user?.id]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'google_books':
      case 'open_library':
        return <GlobeAltIcon className="h-4 w-4 text-blue-500" />;
      case 'ai_generated':
      case 'ai_refined':
        return <CpuChipIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (success: boolean) => {
    if (success) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Success
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Failed
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className={`text-lg font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          🚀 Hybrid Content Creation Test
        </h3>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Test the complete pipeline: External APIs → Quality Assessment → AI Enhancement → Storage
        </p>
      </div>

      {/* Pipeline Status */}
      {pipelineStatus && (
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        } border`}>
          <h4 className={`font-medium mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Pipeline Status
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                System Available: {pipelineStatus.available ? '✅' : '❌'}
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Hybrid Creation: {pipelineStatus.featuresEnabled?.hybridCreation ? '✅' : '❌'}
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                AI Enhancement: {pipelineStatus.featuresEnabled?.aiEnhancement ? '✅' : '❌'}
              </p>
            </div>
            <div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Cost per Book: {pipelineStatus.estimatedCosts?.perBook}
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Source Tracking: {pipelineStatus.featuresEnabled?.sourceTracking ? '✅' : '❌'}
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Admin Dashboard: {pipelineStatus.featuresEnabled?.adminDashboard ? '✅' : '❌'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Test Input */}
      <div className={`p-4 rounded-lg ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border`}>
        <h4 className={`font-medium mb-3 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Test Book Creation
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Title
            </label>
            <input
              type="text"
              value={testInput.title}
              onChange={(e) => setTestInput({ ...testInput, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter book title"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Author
            </label>
            <input
              type="text"
              value={testInput.author}
              onChange={(e) => setTestInput({ ...testInput, author: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter author name"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              ISBN (Optional)
            </label>
            <input
              type="text"
              value={testInput.isbn}
              onChange={(e) => setTestInput({ ...testInput, isbn: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter ISBN"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={runTest}
            disabled={loading || !testInput.title || !testInput.author}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              loading || !testInput.title || !testInput.author
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 inline mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Run Test'
            )}
          </button>
          
          <button
            onClick={checkPipelineStatus}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Test Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className={`font-medium ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Test Results
            </h4>
            {getStatusBadge(result.success)}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Processing Time
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {result.processingTime}ms
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Sources Used
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {result.sourcesUsed.length || 'None'}
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Enhancements
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {result.enhancementsApplied.length}
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Confidence
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {result.qualityReport.confidence}%
              </p>
            </div>
          </div>

          {/* Content Results */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                {getSourceIcon(result.bookData.description_source || 'unknown')}
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description ({result.bookData.description_source || 'unknown'})
                </p>
                {result.bookData.description_quality_score && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    result.bookData.description_quality_score >= 4
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : result.bookData.description_quality_score >= 3
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    Quality: {result.bookData.description_quality_score}/5
                  </span>
                )}
              </div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {result.bookData.description}
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                {getSourceIcon(result.bookData.quote_source || 'unknown')}
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Quote ({result.bookData.quote_source || 'unknown'})
                </p>
                {result.bookData.quote_quality_score && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    result.bookData.quote_quality_score >= 4
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : result.bookData.quote_quality_score >= 3
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    Quality: {result.bookData.quote_quality_score}/5
                  </span>
                )}
              </div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {result.bookData.quote}
              </p>
            </div>
          </div>

          {/* Warnings and Errors */}
          {(result.warnings.length > 0 || result.errors.length > 0) && (
            <div className="mt-4 space-y-2">
              {result.warnings.map((warning, index) => (
                <p key={index} className={`text-xs text-yellow-600 dark:text-yellow-400`}>
                  ⚠️ {warning}
                </p>
              ))}
              {result.errors.map((error, index) => (
                <p key={index} className={`text-xs text-red-600 dark:text-red-400`}>
                  ❌ {error}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};