import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { 
  CogIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { SemanticEmbeddingsService, EmbeddingBatchResult, UserContext, SimilaritySearchResult } from '../../services/semanticEmbeddings.service';
import { Book } from '../../types';
import { supabase } from '../../lib/supabase';

interface ProcessingStatus {
  isProcessing: boolean;
  processed: number;
  total: number;
  currentBook?: string;
}

export const SemanticEmbeddingsPanel: React.FC = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<{ total: number; modelName: string; lastUpdated: string | null }>({ total: 0, modelName: '', lastUpdated: null });
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    processed: 0,
    total: 0
  });
  const [batchResult, setBatchResult] = useState<EmbeddingBatchResult | null>(null);
  const [testContext, setTestContext] = useState<UserContext>({
    mood: 'curious',
    situation: 'commuting',
    goal: 'learn something new'
  });
  const [searchResults, setSearchResults] = useState<SimilaritySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load initial data
  useEffect(() => {
    loadStats();
    loadBooks();
  }, []);

  const loadStats = async () => {
    try {
      const embeddingStats = await SemanticEmbeddingsService.getEmbeddingStats();
      setStats(embeddingStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('book')
        .select('*')
        .limit(50);

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedBooks.length === books.length) {
      setSelectedBooks([]);
    } else {
      setSelectedBooks(books.map(book => book.id));
    }
  };

  const handleBookSelection = (bookId: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleBatchProcess = async () => {
    if (selectedBooks.length === 0) return;

    const booksToProcess = books.filter(book => selectedBooks.includes(book.id));
    
    setProcessingStatus({
      isProcessing: true,
      processed: 0,
      total: booksToProcess.length
    });

    setBatchResult(null);

    try {
      const result = await SemanticEmbeddingsService.batchProcessBooks(
        booksToProcess,
        (processed, total) => {
          setProcessingStatus(prev => ({
            ...prev,
            processed,
            total,
            currentBook: processed < booksToProcess.length ? booksToProcess[processed]?.title : undefined
          }));
        }
      );

      setBatchResult(result);
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleTestSearch = async () => {
    setIsSearching(true);
    setSearchResults([]);

    try {
      // Generate context embedding
      const contextEmbedding = await SemanticEmbeddingsService.generateContextEmbedding(testContext);
      
      // Find similar books
      const results = await SemanticEmbeddingsService.findSimilarBooks(contextEmbedding, 8, 0.1);
      
      // Enrich with book data
      const enrichedResults = await Promise.all(
        results.map(async (result) => {
          const book = books.find(b => b.id === result.bookId);
          return { ...result, book };
        })
      );

      setSearchResults(enrichedResults.filter(r => r.book));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const isConfigured = SemanticEmbeddingsService.isConfigured();

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <CogIcon className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Semantic Embeddings (Server-Side)</h2>
        {!isConfigured && (
          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
            Using Mock Data
          </span>
        )}
      </div>

      {/* Configuration Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-lg border ${
          isConfigured
            ? theme === 'dark'
              ? 'bg-green-900/20 border-green-500/20'
              : 'bg-green-50 border-green-200'
            : theme === 'dark'
              ? 'bg-orange-900/20 border-orange-500/20'
              : 'bg-orange-50 border-orange-200'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isConfigured ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <InformationCircleIcon className="h-5 w-5 text-orange-600" />
          )}
          <span className={`font-medium ${
            isConfigured ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'
          }`}>
            {isConfigured ? 'Hugging Face API Connected' : 'Hugging Face API Not Configured'}
          </span>
        </div>
        <p className={`mt-1 text-sm ${
          isConfigured ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'
        }`}>
          {isConfigured 
            ? 'Using sentence-transformers/all-MiniLM-L6-v2 for production-quality embeddings'
            : 'Set REACT_APP_HUGGING_FACE_TOKEN in your environment to enable real embeddings'
          }
        </p>
      </motion.div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <h3 className="font-semibold mb-3">Embedding Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Books Processed
            </p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Model
            </p>
            <p className="text-sm font-medium">{stats.modelName}</p>
          </div>
          <div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Last Updated
            </p>
            <p className="text-sm font-medium">
              {stats.lastUpdated 
                ? new Date(stats.lastUpdated).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
        </div>
      </motion.div>

      {/* Batch Processing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <h3 className="font-semibold mb-3">Batch Process Books</h3>
        
        <div className="space-y-4">
          {/* Book Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Select Books to Process ({selectedBooks.length}/{books.length})</span>
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {selectedBooks.length === books.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
              {books.map(book => (
                <label key={book.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBooks.includes(book.id)}
                    onChange={() => handleBookSelection(book.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{book.title} by {book.author}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Processing Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBatchProcess}
              disabled={selectedBooks.length === 0 || processingStatus.isProcessing}
              className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedBooks.length === 0 || processingStatus.isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {processingStatus.isProcessing ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Process Selected Books
                </>
              )}
            </button>

            {processingStatus.isProcessing && (
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Progress: {processingStatus.processed}/{processingStatus.total}</span>
                  <span>{Math.round((processingStatus.processed / processingStatus.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(processingStatus.processed / processingStatus.total) * 100}%` }}
                  />
                </div>
                {processingStatus.currentBook && (
                  <p className="text-xs text-gray-600 mt-1">
                    Processing: {processingStatus.currentBook}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Batch Results */}
          {batchResult && (
            <div className={`p-3 rounded-lg ${
              batchResult.failed === 0 
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-500/20'
                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-500/20'
            } border`}>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total:</span> {batchResult.total}
                </div>
                <div>
                  <span className="font-medium">Successful:</span> {batchResult.successful}
                </div>
                <div>
                  <span className="font-medium">Failed:</span> {batchResult.failed}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {Math.round(batchResult.duration / 1000)}s
                </div>
              </div>
              {batchResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">View Errors ({batchResult.errors.length})</summary>
                  <div className="mt-2 space-y-1">
                    {batchResult.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 dark:text-red-400">
                        {books.find(b => b.id === error.bookId)?.title}: {error.error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Similarity Search Test */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <h3 className="font-semibold mb-3">Test Similarity Search</h3>
        
        <div className="space-y-4">
          {/* Context Input */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mood</label>
              <select
                value={testContext.mood || ''}
                onChange={(e) => setTestContext(prev => ({ ...prev, mood: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="curious">Curious</option>
                <option value="relaxed">Relaxed</option>
                <option value="focused">Focused</option>
                <option value="adventurous">Adventurous</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Situation</label>
              <select
                value={testContext.situation || ''}
                onChange={(e) => setTestContext(prev => ({ ...prev, situation: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="commuting">Commuting</option>
                <option value="home">At Home</option>
                <option value="traveling">Traveling</option>
                <option value="working">Working</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Goal</label>
              <select
                value={testContext.goal || ''}
                onChange={(e) => setTestContext(prev => ({ ...prev, goal: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="learn something new">Learn something new</option>
                <option value="relax and unwind">Relax and unwind</option>
                <option value="solve a problem">Solve a problem</option>
                <option value="be entertained">Be entertained</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleTestSearch}
            disabled={isSearching || stats.total === 0}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              isSearching || stats.total === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSearching ? (
              <>
                <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <BookOpenIcon className="h-4 w-4 mr-2" />
                Find Similar Books
              </>
            )}
          </button>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Similar Books (Top {searchResults.length})</h4>
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <div 
                    key={result.bookId}
                    className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{result.book?.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          by {result.book?.author}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {Math.round(result.similarity * 100)}% match
                        </div>
                        <div className="text-xs text-gray-500">
                          Rank #{index + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};