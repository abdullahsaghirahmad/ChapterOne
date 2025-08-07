/**
 * Content Management Panel
 * 
 * Admin interface for monitoring and managing hybrid content creation:
 * - Content source tracking
 * - Quality assessment results  
 * - AI enhancement history
 * - Bulk enhancement operations
 * 
 * @author Senior Engineer - Content Strategy Team
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import {
  GlobeAltIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowPathIcon,
  FunnelIcon,
  EyeIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ContentStats {
  total: number;
  bySource: {
    google_books: number;
    open_library: number;
    ai_generated: number;
    ai_refined: number;
    manual: number;
    unknown: number;
  };
  byQuality: {
    perfect: number; // 5
    good: number;    // 4
    okay: number;    // 3
    poor: number;    // 2
    missing: number; // 1
  };
  needsEnhancement: number;
  recentEnhancements: number;
}

interface BookContentItem {
  id: string;
  title: string;
  author: string;
  description_source: string;
  quote_source: string;
  description_quality_score: number;
  quote_quality_score: number;
  ai_enhancement_needed: boolean;
  last_ai_enhancement_at?: string;
  created_at: string;
}

type FilterType = 'all' | 'needs_enhancement' | 'ai_generated' | 'external_source' | 'low_quality';

export const ContentManagementPanel: React.FC = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<ContentStats>({
    total: 0,
    bySource: {
      google_books: 0,
      open_library: 0,
      ai_generated: 0,
      ai_refined: 0,
      manual: 0,
      unknown: 0
    },
    byQuality: {
      perfect: 0,
      good: 0,
      okay: 0,
      poor: 0,
      missing: 0
    },
    needsEnhancement: 0,
    recentEnhancements: 0
  });

  const [books, setBooks] = useState<BookContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedBook, setSelectedBook] = useState<BookContentItem | null>(null);

  useEffect(() => {
    fetchContentStats();
    fetchBooksWithContentTracking();
  }, [filter]);

  const fetchContentStats = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.admin.getContentStats();
      
      // Mock data for demonstration
      setStats({
        total: 127,
        bySource: {
          google_books: 45,
          open_library: 32,
          ai_generated: 28,
          ai_refined: 15,
          manual: 5,
          unknown: 2
        },
        byQuality: {
          perfect: 23,
          good: 38,
          okay: 41,
          poor: 18,
          missing: 7
        },
        needsEnhancement: 25,
        recentEnhancements: 12
      });
    } catch (error) {
      console.error('Error fetching content stats:', error);
    }
  };

  const fetchBooksWithContentTracking = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await api.admin.getBooksWithContentTracking({ filter });
      
      // Mock data for demonstration
      const mockBooks: BookContentItem[] = [
        {
          id: '1',
          title: 'Dune',
          author: 'Frank Herbert',
          description_source: 'google_books',
          quote_source: 'ai_generated',
          description_quality_score: 5,
          quote_quality_score: 4,
          ai_enhancement_needed: false,
          last_ai_enhancement_at: '2024-12-06T10:30:00Z',
          created_at: '2024-12-05T15:20:00Z'
        },
        {
          id: '2', 
          title: 'The Lord of the Rings',
          author: 'J.R.R. Tolkien',
          description_source: 'open_library',
          quote_source: 'ai_refined',
          description_quality_score: 3,
          quote_quality_score: 3,
          ai_enhancement_needed: true,
          created_at: '2024-12-04T09:15:00Z'
        },
        {
          id: '3',
          title: 'Thinking, Fast and Slow',
          author: 'Daniel Kahneman',
          description_source: 'ai_generated',
          quote_source: 'ai_generated',
          description_quality_score: 4,
          quote_quality_score: 4,
          ai_enhancement_needed: false,
          last_ai_enhancement_at: '2024-12-06T14:45:00Z',
          created_at: '2024-12-03T11:30:00Z'
        }
      ];

      setBooks(mockBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'google_books':
      case 'open_library':
        return <GlobeAltIcon className="h-4 w-4" />;
      case 'ai_generated':
      case 'ai_refined':
        return <CpuChipIcon className="h-4 w-4" />;
      default:
        return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'google_books':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
      case 'open_library':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
      case 'ai_generated':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300';
      case 'ai_refined':
        return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300';
      case 'manual':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 5) return 'text-green-600';
    if (score >= 4) return 'text-blue-600';
    if (score >= 3) return 'text-yellow-600';
    if (score >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  const enhanceBook = async (bookId: string) => {
    try {
      // TODO: Implement AI enhancement API call
      console.log(`Enhancing book ${bookId}...`);
      // await api.admin.enhanceBookContent(bookId);
      fetchBooksWithContentTracking(); // Refresh data
    } catch (error) {
      console.error('Error enhancing book:', error);
    }
  };

  const bulkEnhanceBooks = async () => {
    const booksNeedingEnhancement = books.filter(book => book.ai_enhancement_needed);
    console.log(`Bulk enhancing ${booksNeedingEnhancement.length} books...`);
    
    // TODO: Implement bulk enhancement
    // await api.admin.bulkEnhanceBooks(booksNeedingEnhancement.map(b => b.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Content Management
          </h2>
          <p className={`mt-1 text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Monitor and manage AI-enhanced book content
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={bulkEnhanceBooks}
            disabled={stats.needsEnhancement === 0}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              stats.needsEnhancement > 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-2" />
            Bulk Enhance ({stats.needsEnhancement})
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Books */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="flex items-center">
            <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Books
              </p>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.total}
              </p>
            </div>
          </div>
        </div>

        {/* AI Enhanced */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="flex items-center">
            <CpuChipIcon className="h-5 w-5 text-purple-600 mr-2" />
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                AI Enhanced
              </p>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.bySource.ai_generated + stats.bySource.ai_refined}
              </p>
            </div>
          </div>
        </div>

        {/* External Sources */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="flex items-center">
            <GlobeAltIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                External Sources
              </p>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.bySource.google_books + stats.bySource.open_library}
              </p>
            </div>
          </div>
        </div>

        {/* High Quality */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                High Quality
              </p>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.byQuality.perfect + stats.byQuality.good}
              </p>
            </div>
          </div>
        </div>

        {/* Needs Enhancement */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mr-2" />
            <div>
              <p className={`text-xs font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Needs Enhancement
              </p>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.needsEnhancement}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <FunnelIcon className={`h-5 w-5 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`} />
        <div className="flex space-x-2">
          {[
            { id: 'all', label: 'All Books' },
            { id: 'needs_enhancement', label: 'Needs Enhancement' },
            { id: 'ai_generated', label: 'AI Generated' },
            { id: 'external_source', label: 'External Source' },
            { id: 'low_quality', label: 'Low Quality' }
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id as FilterType)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === filterOption.id
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Books Table */}
      <div className={`overflow-hidden rounded-lg ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Book
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Description
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Quote
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
            }`}>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                      Loading books...
                    </div>
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No books found
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id} className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {book.title}
                        </div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {book.author}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getSourceColor(book.description_source)
                        }`}>
                          {getSourceIcon(book.description_source)}
                          <span className="ml-1 capitalize">
                            {book.description_source.replace('_', ' ')}
                          </span>
                        </span>
                        <span className={`text-sm font-medium ${
                          getQualityColor(book.description_quality_score)
                        }`}>
                          {book.description_quality_score}/5
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getSourceColor(book.quote_source)
                        }`}>
                          {getSourceIcon(book.quote_source)}
                          <span className="ml-1 capitalize">
                            {book.quote_source.replace('_', ' ')}
                          </span>
                        </span>
                        <span className={`text-sm font-medium ${
                          getQualityColor(book.quote_quality_score)
                        }`}>
                          {book.quote_quality_score}/5
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {book.ai_enhancement_needed ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                          Needs Enhancement
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Ready
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedBook(book)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {book.ai_enhancement_needed && (
                          <button
                            onClick={() => enhanceBook(book.id)}
                            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedBook(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`max-w-2xl w-full mx-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            } p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Content Details: {selectedBook.title}
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Author: {selectedBook.author}
                </p>
              </div>
              
              <div>
                <p className={`text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description Source & Quality:
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getSourceColor(selectedBook.description_source)
                  }`}>
                    {getSourceIcon(selectedBook.description_source)}
                    <span className="ml-1 capitalize">
                      {selectedBook.description_source.replace('_', ' ')}
                    </span>
                  </span>
                  <span className={`text-sm font-medium ${
                    getQualityColor(selectedBook.description_quality_score)
                  }`}>
                    Quality: {selectedBook.description_quality_score}/5
                  </span>
                </div>
              </div>

              <div>
                <p className={`text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Quote Source & Quality:
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getSourceColor(selectedBook.quote_source)
                  }`}>
                    {getSourceIcon(selectedBook.quote_source)}
                    <span className="ml-1 capitalize">
                      {selectedBook.quote_source.replace('_', ' ')}
                    </span>
                  </span>
                  <span className={`text-sm font-medium ${
                    getQualityColor(selectedBook.quote_quality_score)
                  }`}>
                    Quality: {selectedBook.quote_quality_score}/5
                  </span>
                </div>
              </div>

              {selectedBook.last_ai_enhancement_at && (
                <div>
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Last Enhanced: {new Date(selectedBook.last_ai_enhancement_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              {selectedBook.ai_enhancement_needed && (
                <button
                  onClick={() => {
                    enhanceBook(selectedBook.id);
                    setSelectedBook(null);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Enhance Content
                </button>
              )}
              <button
                onClick={() => setSelectedBook(null)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};