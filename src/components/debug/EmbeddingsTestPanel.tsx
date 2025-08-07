/**
 * Embeddings Test Panel
 * 
 * Debug interface for testing Hugging Face embeddings integration
 * Allows testing API connection, generating test embeddings, and processing books
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { EmbeddingsService, BatchResult } from '../../services/embeddings.service';
import api from '../../services/api.supabase';
import { Book } from '../../types';

interface EmbeddingStats {
  totalEmbeddings: number;
  modelBreakdown: Record<string, number>;
  latestGenerated: string | null;
}

export const EmbeddingsTestPanel: React.FC = () => {
  const { theme } = useTheme();
  const [apiStatus, setApiStatus] = useState<'unknown' | 'checking' | 'connected' | 'error'>('unknown');
  const [apiError, setApiError] = useState<string | null>(null);
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [testText, setTestText] = useState('This is a test book about artificial intelligence and machine learning.');
  const [testEmbedding, setTestEmbedding] = useState<number[] | null>(null);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [isBatchProcessing, setBatchProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  // Check API status on mount
  useEffect(() => {
    checkApiStatus();
    loadStats();
    loadAvailableBooks();
  }, []);

  const checkApiStatus = async () => {
    setApiStatus('checking');
    setApiError(null);

    try {
      if (!EmbeddingsService.isConfigured()) {
        setApiStatus('error');
        setApiError('Hugging Face API token not configured');
        return;
      }

      const result = await EmbeddingsService.testConnection();
      if (result.success) {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
        setApiError(result.error || 'Connection test failed');
      }
    } catch (error) {
      setApiStatus('error');
      setApiError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const loadStats = async () => {
    try {
      const embeddingStats = await EmbeddingsService.getEmbeddingStats();
      setStats(embeddingStats);
    } catch (error) {
      console.error('Error loading embedding stats:', error);
    }
  };

  const loadAvailableBooks = async () => {
    try {
      const books = await api.books.getAll();
      // Limit to first 20 books for the test panel
      setAvailableBooks(books.slice(0, 20));
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const generateTestEmbedding = async () => {
    setIsGeneratingTest(true);
    setTestEmbedding(null);

    try {
      const embedding = await EmbeddingsService.generateEmbedding(testText);
      setTestEmbedding(embedding);
    } catch (error) {
      console.error('Error generating test embedding:', error);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const processBatch = async () => {
    if (selectedBooks.length === 0) return;

    setBatchProcessing(true);
    setBatchResult(null);

    try {
      const result = await EmbeddingsService.batchGenerateEmbeddings(selectedBooks);
      setBatchResult(result);
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error('Error processing batch:', error);
    } finally {
      setBatchProcessing(false);
    }
  };

  const toggleBookSelection = (book: Book) => {
    setSelectedBooks(prev => {
      const isSelected = prev.some(b => b.id === book.id);
      if (isSelected) {
        return prev.filter(b => b.id !== book.id);
      } else {
        return [...prev, book];
      }
    });
  };

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'checking': return '🔄';
      case 'connected': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${
      theme === 'light'
        ? 'bg-white border-gray-200'
        : theme === 'dark'
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-purple-200'
    }`}>
      <h2 className={`text-xl font-bold mb-6 ${
        theme === 'light'
          ? 'text-gray-900'
          : theme === 'dark'
          ? 'text-white'
          : 'text-purple-900'
      }`}>
        🧠 Embeddings Test Panel
      </h2>

      {/* API Status */}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-800' : theme === 'dark' ? 'text-gray-200' : 'text-purple-800'
        }`}>
          API Connection Status
        </h3>
        
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {apiStatus === 'checking' && 'Checking connection...'}
            {apiStatus === 'connected' && 'Connected to Hugging Face API'}
            {apiStatus === 'error' && 'Connection failed'}
            {apiStatus === 'unknown' && 'Not checked'}
          </span>
        </div>

        {apiError && (
          <div className={`p-3 rounded-lg border ${
            theme === 'light'
              ? 'bg-red-50 border-red-200 text-red-700'
              : theme === 'dark'
              ? 'bg-red-900/20 border-red-700 text-red-300'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <p className="text-sm">{apiError}</p>
            
            {apiError.includes('token not configured') && (
              <div className="mt-2 text-xs">
                <p><strong>Setup Instructions:</strong></p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Get a free token from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">huggingface.co/settings/tokens</a></li>
                  <li>Create a <code>.env</code> file in your project root</li>
                  <li>Add: <code>REACT_APP_HUGGING_FACE_TOKEN=your_token_here</code></li>
                  <li>Restart the development server</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <button
          onClick={checkApiStatus}
          disabled={apiStatus === 'checking'}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            theme === 'light'
              ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              : theme === 'dark'
              ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-400'
              : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
          }`}
        >
          {apiStatus === 'checking' ? 'Checking...' : 'Test Connection'}
        </button>
      </div>

      {/* Current Statistics */}
      {stats && (
        <div className="mb-6">
          <h3 className={`text-lg font-semibold mb-3 ${
            theme === 'light' ? 'text-gray-800' : theme === 'dark' ? 'text-gray-200' : 'text-purple-800'
          }`}>
            Current Statistics
          </h3>
          
          <div className={`p-4 rounded-lg ${
            theme === 'light'
              ? 'bg-gray-50'
              : theme === 'dark'
              ? 'bg-gray-700'
              : 'bg-purple-50'
          }`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${
                  theme === 'light' ? 'text-gray-600' : theme === 'dark' ? 'text-gray-400' : 'text-purple-600'
                }`}>
                  Total Embeddings
                </p>
                <p className={`text-2xl font-bold ${
                  theme === 'light' ? 'text-gray-900' : theme === 'dark' ? 'text-white' : 'text-purple-900'
                }`}>
                  {stats.totalEmbeddings}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${
                  theme === 'light' ? 'text-gray-600' : theme === 'dark' ? 'text-gray-400' : 'text-purple-600'
                }`}>
                  Latest Generated
                </p>
                <p className={`text-sm font-medium ${
                  theme === 'light' ? 'text-gray-900' : theme === 'dark' ? 'text-white' : 'text-purple-900'
                }`}>
                  {stats.latestGenerated 
                    ? new Date(stats.latestGenerated).toLocaleDateString()
                    : 'None'
                  }
                </p>
              </div>
            </div>

            {Object.keys(stats.modelBreakdown).length > 0 && (
              <div className="mt-3">
                <p className={`text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-600' : theme === 'dark' ? 'text-gray-400' : 'text-purple-600'
                }`}>
                  Model Breakdown:
                </p>
                {Object.entries(stats.modelBreakdown).map(([model, count]) => (
                  <div key={model} className="flex justify-between text-sm">
                    <span>{model}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Embedding Generation */}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-800' : theme === 'dark' ? 'text-gray-200' : 'text-purple-800'
        }`}>
          Test Embedding Generation
        </h3>
        
        <div className="space-y-3">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={3}
            className={`w-full p-3 rounded-lg border text-sm ${
              theme === 'light'
                ? 'bg-white border-gray-300 text-gray-900'
                : theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-purple-300 text-purple-900'
            }`}
            placeholder="Enter text to generate embedding..."
          />

          <button
            onClick={generateTestEmbedding}
            disabled={isGeneratingTest || !testText.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-green-100 hover:bg-green-200 text-green-700 disabled:bg-gray-100 disabled:text-gray-400'
                : theme === 'dark'
                ? 'bg-green-900/20 hover:bg-green-900/30 text-green-400 disabled:bg-gray-700 disabled:text-gray-500'
                : 'bg-green-100 hover:bg-green-200 text-green-700 disabled:bg-gray-100 disabled:text-gray-400'
            }`}
          >
            {isGeneratingTest ? 'Generating...' : 'Generate Test Embedding'}
          </button>

          {testEmbedding && (
            <div className={`p-3 rounded-lg border ${
              theme === 'light'
                ? 'bg-green-50 border-green-200'
                : theme === 'dark'
                ? 'bg-green-900/20 border-green-700'
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-sm font-medium mb-2 ${
                theme === 'light' ? 'text-green-800' : theme === 'dark' ? 'text-green-300' : 'text-green-800'
              }`}>
                ✅ Generated {testEmbedding.length}D embedding
              </p>
              <p className={`text-xs font-mono ${
                theme === 'light' ? 'text-green-700' : theme === 'dark' ? 'text-green-400' : 'text-green-700'
              }`}>
                [{testEmbedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Book Selection for Batch Processing */}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-800' : theme === 'dark' ? 'text-gray-200' : 'text-purple-800'
        }`}>
          Batch Process Books ({selectedBooks.length} selected)
        </h3>

        <div className="space-y-3">
          <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
            {availableBooks.map((book) => (
              <label key={book.id} className="flex items-center space-x-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBooks.some(b => b.id === book.id)}
                  onChange={() => toggleBookSelection(book)}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    theme === 'light' ? 'text-gray-900' : theme === 'dark' ? 'text-white' : 'text-purple-900'
                  }`}>
                    {book.title}
                  </p>
                  <p className={`text-xs truncate ${
                    theme === 'light' ? 'text-gray-500' : theme === 'dark' ? 'text-gray-400' : 'text-purple-500'
                  }`}>
                    by {book.author}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setSelectedBooks(availableBooks)}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
              }`}
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedBooks([])}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
              }`}
            >
              Clear
            </button>
          </div>

          <button
            onClick={processBatch}
            disabled={isBatchProcessing || selectedBooks.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 disabled:bg-gray-100 disabled:text-gray-400'
                : theme === 'dark'
                ? 'bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 disabled:bg-gray-700 disabled:text-gray-500'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700 disabled:bg-gray-100 disabled:text-gray-400'
            }`}
          >
            {isBatchProcessing ? 'Processing...' : `Process ${selectedBooks.length} Books`}
          </button>

          {batchResult && (
            <div className={`p-4 rounded-lg border ${
              theme === 'light'
                ? 'bg-blue-50 border-blue-200'
                : theme === 'dark'
                ? 'bg-blue-900/20 border-blue-700'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                theme === 'light' ? 'text-blue-800' : theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
              }`}>
                Batch Processing Results
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className={theme === 'light' ? 'text-blue-600' : theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>
                    Processed:
                  </span>
                  <br />
                  <span className="font-medium">{batchResult.totalProcessed}</span>
                </div>
                <div>
                  <span className={theme === 'light' ? 'text-green-600' : theme === 'dark' ? 'text-green-400' : 'text-green-600'}>
                    Successful:
                  </span>
                  <br />
                  <span className="font-medium">{batchResult.successful}</span>
                </div>
                <div>
                  <span className={theme === 'light' ? 'text-red-600' : theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                    Failed:
                  </span>
                  <br />
                  <span className="font-medium">{batchResult.failed}</span>
                </div>
              </div>
              
              {batchResult.errors.length > 0 && (
                <details className="mt-3">
                  <summary className={`cursor-pointer text-sm ${
                    theme === 'light' ? 'text-blue-700' : theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    View Errors ({batchResult.errors.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {batchResult.errors.map((error, index) => (
                      <p key={index} className={`text-xs ${
                        theme === 'light' ? 'text-red-600' : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {error}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};