import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon,
  UserIcon,
  ChartBarIcon,
  EyeIcon,
  BookOpenIcon,
  HeartIcon,
  ArrowTrendingUpIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { usePersonalization } from '../../hooks/usePersonalization';
import { useTheme } from '../../contexts/ThemeContext';
import { Book } from '../../types';
import { BookCard } from './BookCard';
import api from '../../services/api.supabase';

interface PersonalizedRecommendationsProps {
  availableBooks?: Book[];
  maxRecommendations?: number;
  showInsights?: boolean;
  className?: string;
}

const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({
  availableBooks = [],
  maxRecommendations = 6,
  showInsights = true,
  className = ''
}) => {
  const { theme } = useTheme();
  const {
    getRecommendations,
    recommendations,
    loadingRecommendations,
    getInsights,
    insights,
    loadingInsights,
    isPersonalizationEnabled
  } = usePersonalization();

  const [books, setBooks] = useState<Book[]>(availableBooks);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load books if not provided
  useEffect(() => {
    const loadBooks = async () => {
      if (availableBooks.length === 0) {
        try {
          const allBooks = await api.books.getAll();
          setBooks(allBooks.slice(0, 100)); // Limit for performance
        } catch (error) {
          console.error('Error loading books for recommendations:', error);
        }
      }
    };

    if (isPersonalizationEnabled) {
      loadBooks();
    }
  }, [availableBooks, isPersonalizationEnabled]);

  // Generate recommendations when books are available
  useEffect(() => {
    if (isPersonalizationEnabled && books.length > 0) {
      getRecommendations(books, maxRecommendations * 2); // Get more than needed for filtering
      if (showInsights) {
        getInsights();
      }
    }
  }, [books, isPersonalizationEnabled, maxRecommendations, showInsights, getRecommendations, getInsights]);

  // Filter recommendations by category
  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.category === selectedCategory);

  const displayedRecommendations = showAllRecommendations 
    ? filteredRecommendations 
    : filteredRecommendations.slice(0, maxRecommendations);

  // Category statistics
  const categoryStats = recommendations.reduce((acc, rec) => {
    acc[rec.category] = (acc[rec.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'perfect_match': return <HeartIcon className="w-4 h-4" />;
      case 'good_fit': return <BookOpenIcon className="w-4 h-4" />;
      case 'explore_new': return <SparklesIcon className="w-4 h-4" />;
      case 'trending': return <ArrowTrendingUpIcon className="w-4 h-4" />;
      default: return <BookOpenIcon className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'perfect_match': return 'text-red-500';
      case 'good_fit': return 'text-green-500';
      case 'explore_new': return 'text-purple-500';
      case 'trending': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getThemeClasses = () => {
    return {
      container: theme === 'light'
        ? 'bg-white border border-gray-200'
        : theme === 'dark'
        ? 'bg-gray-800 border border-gray-700'
        : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200',
      text: theme === 'light'
        ? 'text-gray-900'
        : theme === 'dark'
        ? 'text-white'
        : 'text-gray-900',
      subtext: theme === 'light'
        ? 'text-gray-600'
        : theme === 'dark'
        ? 'text-gray-400'
        : 'text-gray-700',
      button: theme === 'light'
        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
        : theme === 'dark'
        ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-700'
        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200',
      activeButton: theme === 'light'
        ? 'bg-blue-100 text-blue-800 border-blue-300'
        : theme === 'dark'
        ? 'bg-blue-800 text-blue-200 border-blue-600'
        : 'bg-purple-100 text-purple-800 border-purple-300'
    };
  };

  const themeClasses = getThemeClasses();

  if (!isPersonalizationEnabled) {
    return (
      <div className={`rounded-lg p-6 ${themeClasses.container} ${className}`}>
        <div className="text-center">
          <UserIcon className={`w-12 h-12 mx-auto mb-4 ${themeClasses.subtext}`} />
          <h3 className={`text-lg font-semibold mb-2 ${themeClasses.text}`}>
            Sign in for Personalized Recommendations
          </h3>
          <p className={themeClasses.subtext}>
            Get book recommendations tailored to your reading preferences and history.
          </p>
        </div>
      </div>
    );
  }

  if (loadingRecommendations) {
    return (
      <div className={`rounded-lg p-6 ${themeClasses.container} ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 bg-gray-300 rounded mr-3"></div>
            <div className="h-6 bg-gray-300 rounded w-48"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`rounded-lg p-6 ${themeClasses.container} ${className}`}>
        <div className="text-center">
          <ChartBarIcon className={`w-12 h-12 mx-auto mb-4 ${themeClasses.subtext}`} />
          <h3 className={`text-lg font-semibold mb-2 ${themeClasses.text}`}>
            Building Your Profile
          </h3>
          <p className={themeClasses.subtext}>
            Search and interact with books to get personalized recommendations!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-6 ${themeClasses.container} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className={`w-6 h-6 mr-3 ${getCategoryColor('perfect_match')}`} />
          <h2 className={`text-xl font-bold ${themeClasses.text}`}>
            Personalized for You
          </h2>
        </div>
        
        {recommendations.length > maxRecommendations && (
          <button
            onClick={() => setShowAllRecommendations(!showAllRecommendations)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${themeClasses.button}`}
          >
            {showAllRecommendations ? 'Show Less' : `Show All (${recommendations.length})`}
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
            selectedCategory === 'all' ? themeClasses.activeButton : themeClasses.button
          }`}
        >
          All ({recommendations.length})
        </button>
        
        {Object.entries(categoryStats).map(([category, count]) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 flex items-center ${
              selectedCategory === category ? themeClasses.activeButton : themeClasses.button
            }`}
          >
            <span className={`mr-1 ${getCategoryColor(category)}`}>
              {getCategoryIcon(category)}
            </span>
            {category.replace('_', ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Recommendations Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {displayedRecommendations.map((recommendation, index) => (
            <motion.div
              key={recommendation.book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative"
            >
              {/* Recommendation Score Badge */}
              <div className={`absolute top-2 left-2 z-20 px-2 py-1 rounded-full text-xs font-medium ${
                recommendation.score >= 0.8 
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : recommendation.score >= 0.6
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : recommendation.score >= 0.4
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {Math.round(recommendation.score * 100)}% match
              </div>

              <BookCard
                title={recommendation.book.title}
                author={recommendation.book.author}
                coverImage={recommendation.book.coverImage}
                description={recommendation.book.description}
                pace={recommendation.book.pace}
                themes={recommendation.book.themes}
                isExternal={recommendation.book.isExternal}
              />

              {/* Recommendation Reasons */}
              {recommendation.reasons.length > 0 && (
                <div className={`mt-3 p-3 rounded-lg ${themeClasses.container}`}>
                  <h4 className={`text-sm font-medium mb-2 ${themeClasses.text}`}>
                    Why we recommend this:
                  </h4>
                  <div className="space-y-1">
                    {recommendation.reasons.slice(0, 2).map((reason, idx) => (
                      <div key={idx} className={`text-xs ${themeClasses.subtext} flex items-center`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${getCategoryColor(reason.type)}`}></div>
                        {reason.explanation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Insights Section */}
      {showInsights && insights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className={`mt-8 p-4 rounded-lg ${themeClasses.container}`}
        >
          <div className="flex items-center mb-4">
            <EyeIcon className={`w-5 h-5 mr-2 ${themeClasses.subtext}`} />
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
              Your Reading Insights
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Top Genres */}
            {insights.topGenres.length > 0 && (
              <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-gray-50' : theme === 'dark' ? 'bg-gray-700' : 'bg-purple-25'}`}>
                <h4 className={`text-sm font-medium mb-2 ${themeClasses.text}`}>Top Genres</h4>
                <div className="space-y-1">
                  {insights.topGenres.slice(0, 3).map((genre, idx) => (
                    <div key={idx} className={`text-xs ${themeClasses.subtext} flex justify-between`}>
                      <span>{genre.genre}</span>
                      <span>{Math.round(genre.score * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reading Style */}
            <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-gray-50' : theme === 'dark' ? 'bg-gray-700' : 'bg-purple-25'}`}>
              <h4 className={`text-sm font-medium mb-2 ${themeClasses.text}`}>Reading Style</h4>
              <div className="space-y-1">
                <div className={`text-xs ${themeClasses.subtext} flex justify-between`}>
                  <span>Exploration Level</span>
                  <span className="capitalize">{insights.personalityProfile.explorationLevel}</span>
                </div>
                <div className={`text-xs ${themeClasses.subtext} flex justify-between`}>
                  <span>Genre Diversity</span>
                  <span>{Math.round(insights.personalityProfile.genreDiversity * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Predictions */}
            {insights.nextSearchPredictions.length > 0 && (
              <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-gray-50' : theme === 'dark' ? 'bg-gray-700' : 'bg-purple-25'}`}>
                <h4 className={`text-sm font-medium mb-2 ${themeClasses.text}`}>You Might Search For</h4>
                <div className="space-y-1">
                  {insights.nextSearchPredictions.slice(0, 3).map((prediction, idx) => (
                    <div key={idx} className={`text-xs ${themeClasses.subtext}`}>
                      "{prediction}"
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PersonalizedRecommendations; 