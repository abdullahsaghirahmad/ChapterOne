/**
 * JavaScript Semantic Similarity Admin Panel
 * 
 * Testing and management interface for the pure JavaScript similarity service.
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { JSSemanticSimilarityService, BookSimilarityResult, ContextualRecommendation } from '../../services/jsSimilarity.service';
import { UserContext, Book } from '../../types';
import { useFeatureFlags } from '../../services/featureFlag.service';

interface DiagnosticResult {
  success: boolean;
  message: string;
  stats: any;
}

export const JSSemanticSimilarityPanel: React.FC = () => {
  const { theme } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const [stats, setStats] = useState<any>({});
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoInitializing, setIsAutoInitializing] = useState(false);

  // Test context form
  const [testContext, setTestContext] = useState<UserContext>({
    mood: 'curious',
    situation: 'commuting',
    goal: 'learn something new'
  });

  // Search results
  const [searchResults, setSearchResults] = useState<BookSimilarityResult[]>([]);
  const [recommendations, setRecommendations] = useState<ContextualRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load stats and auto-initialize if feature flag is enabled
  useEffect(() => {
    const initializeIfEnabled = async () => {
      loadStats();
      
      // Auto-initialize if semantic embeddings feature is enabled
      if (isEnabled('semantic_embeddings_v1')) {
        const currentStats = JSSemanticSimilarityService.getStats();
        if (!currentStats.isInitialized) {
          console.log('[JS_SIMILARITY_PANEL] Auto-initializing because semantic_embeddings_v1 is enabled');
          setIsAutoInitializing(true);
          try {
            await JSSemanticSimilarityService.initialize();
            loadStats(); // Refresh stats after initialization
          } catch (error) {
            console.error('[JS_SIMILARITY_PANEL] Auto-initialization failed:', error);
          } finally {
            setIsAutoInitializing(false);
          }
        }
      }
    };
    
    initializeIfEnabled();
  }, [isEnabled]);

  const loadStats = () => {
    const currentStats = JSSemanticSimilarityService.getStats();
    setStats(currentStats);
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const result = await JSSemanticSimilarityService.runDiagnostics();
      setDiagnostics(result);
      loadStats();
    } catch (error) {
      setDiagnostics({
        success: false,
        message: `Error running diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats: {}
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleRefreshCorpus = async () => {
    setIsRefreshing(true);
    try {
      await JSSemanticSimilarityService.refresh();
      loadStats();
      setDiagnostics({
        success: true,
        message: '✅ Book corpus refreshed successfully',
        stats: JSSemanticSimilarityService.getStats()
      });
    } catch (error) {
      setDiagnostics({
        success: false,
        message: `❌ Failed to refresh corpus: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats: {}
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestSimilarity = async () => {
    setIsSearching(true);
    try {
      const [similarBooks, contextRecs] = await Promise.all([
        JSSemanticSimilarityService.findSimilarBooks(testContext, { limit: 5, threshold: 0.1 }),
        JSSemanticSimilarityService.getContextualRecommendations(testContext, 5)
      ]);
      
      setSearchResults(similarBooks);
      setRecommendations(contextRecs);
    } catch (error) {
      console.error('Error testing similarity:', error);
      setSearchResults([]);
      setRecommendations([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleContextChange = (field: keyof UserContext, value: string) => {
    setTestContext((prev: UserContext) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
      <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        🚀 JavaScript Semantic Similarity (TF-IDF + Cosine)
      </h3>

      {/* Service Status */}
      <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          📊 Service Status
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Status
            </span>
                            <span className={`font-mono ${
                  isAutoInitializing 
                    ? 'text-yellow-500' 
                    : stats.isInitialized ? 'text-green-500' : 'text-red-500'
                }`}>
                  {isAutoInitializing 
                    ? '🔄 Initializing...' 
                    : stats.isInitialized ? '✅ Ready' : '❌ Not Ready'}
                </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Books Indexed
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.booksIndexed || 0}
            </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Vocabulary Size
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.vocabularySize || 0}
            </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Memory Usage
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.memoryUsage || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-initialization Info */}
      {isEnabled('semantic_embeddings_v1') && !stats.isInitialized && !isAutoInitializing && (
        <div className={`p-3 rounded-lg mb-4 ${
          theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'
        } border`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
            💡 <strong>Auto-initialization enabled:</strong> JavaScript similarity will initialize automatically when "Semantic Embeddings V1" is ON.
          </p>
        </div>
      )}

      {!isEnabled('semantic_embeddings_v1') && (
        <div className={`p-3 rounded-lg mb-4 ${
          theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        } border`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            ℹ️ <strong>Feature disabled:</strong> Enable "Semantic Embeddings V1" in Configuration tab to use JavaScript similarity.
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleRunDiagnostics}
          disabled={isRunningDiagnostics}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunningDiagnostics
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isRunningDiagnostics ? '⏳ Running...' : '🔍 Run Diagnostics'}
        </button>

        <button
          onClick={handleRefreshCorpus}
          disabled={isRefreshing}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isRefreshing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh Corpus'}
        </button>
      </div>

      {/* Diagnostics Results */}
      {diagnostics && (
        <div className={`p-4 rounded-lg mb-6 ${
          diagnostics.success 
            ? (theme === 'dark' ? 'bg-green-900/30 border-green-500' : 'bg-green-50 border-green-200')
            : (theme === 'dark' ? 'bg-red-900/30 border-red-500' : 'bg-red-50 border-red-200')
        } border`}>
          <h4 className={`font-semibold mb-2 ${
            diagnostics.success ? 'text-green-500' : 'text-red-500'
          }`}>
            Diagnostics Result
          </h4>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {diagnostics.message}
          </p>
          {diagnostics.stats && Object.keys(diagnostics.stats).length > 0 && (
            <pre className={`mt-2 text-xs p-2 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} overflow-x-auto`}>
              {JSON.stringify(diagnostics.stats, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Test Similarity Search */}
      <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          🧪 Test Context Similarity
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Mood
            </label>
            <select
              value={testContext.mood || ''}
              onChange={(e) => handleContextChange('mood', e.target.value)}
              className={`w-full p-2 rounded border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select mood...</option>
              <option value="curious">Curious</option>
              <option value="relaxed">Relaxed</option>
              <option value="motivated">Motivated</option>
              <option value="contemplative">Contemplative</option>
              <option value="adventurous">Adventurous</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Situation
            </label>
            <select
              value={testContext.situation || ''}
              onChange={(e) => handleContextChange('situation', e.target.value)}
              className={`w-full p-2 rounded border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select situation...</option>
              <option value="commuting">Commuting</option>
              <option value="bedtime">Bedtime</option>
              <option value="lunch break">Lunch Break</option>
              <option value="weekend">Weekend</option>
              <option value="traveling">Traveling</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Goal
            </label>
            <select
              value={testContext.goal || ''}
              onChange={(e) => handleContextChange('goal', e.target.value)}
              className={`w-full p-2 rounded border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select goal...</option>
              <option value="learn something new">Learn Something New</option>
              <option value="relax and unwind">Relax and Unwind</option>
              <option value="get inspired">Get Inspired</option>
              <option value="solve a problem">Solve a Problem</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleTestSimilarity}
          disabled={isSearching}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSearching
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white`}
        >
          {isSearching ? '⏳ Searching...' : '🔍 Find Similar Books'}
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📚 Similar Books Found ({searchResults.length})
          </h4>
          <div className="space-y-3">
            {searchResults.map((result, index) => (
              <div
                key={result.book.id}
                className={`p-3 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {result.book.title}
                    </h5>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      by {result.book.author}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    result.similarity >= 0.5 
                      ? 'bg-green-100 text-green-800' 
                      : result.similarity >= 0.3
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                {result.factors.length > 0 && (
                  <div className="text-xs">
                    <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Match factors: 
                    </span>
                    <span className={`ml-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                      {result.factors.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Recommendations */}
      {recommendations.length > 0 && (
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            💡 Contextual Recommendations ({recommendations.length})
          </h4>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={rec.book.id}
                className={`p-3 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {rec.book.title}
                    </h5>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      by {rec.book.author}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                      rec.confidence === 'high' 
                        ? 'bg-green-100 text-green-800' 
                        : rec.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rec.confidence}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-mono bg-blue-100 text-blue-800">
                      {(rec.contextMatch * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {rec.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};