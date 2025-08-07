import React, { useEffect, useState } from 'react';
import { SearchBar } from './SearchBar';
import { ThreadCard } from './ThreadCard';
import { BookCard } from './BookCard';
import { Book, Thread } from '../../types';
import api from '../../services/api.supabase';
import { booksCacheService } from '../../services/booksCache.service';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { normalizeTag } from './ThreadPage'; // Import the normalizeTag function
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import PersonalizedRecommendations from './PersonalizedRecommendations';
import { ContextualRecommendations } from './ContextualRecommendations';
import { usePersonalization } from '../../hooks/usePersonalization';
import { useBatchSavedBooks } from '../../hooks/useBatchSavedBooks';
import { useFeatureFlags } from '../../services/featureFlag.service';
import { AnonymousSessionService } from '../../services/anonymousSession.service';
import { AnonymousUserOnboardingModal } from '../ui/AnonymousUserOnboardingModal';




export const HomePage = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isPersonalizationEnabled } = usePersonalization();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const { checkBooks, isBookSaved } = useBatchSavedBooks();
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PERFORMANCE: Hide featured books section to eliminate redundancy with "For You" section
  const SHOW_FEATURED_BOOKS = false;

  const navigate = useNavigate();

  // Anonymous onboarding state
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [interactionCount, setInteractionCount] = useState(0);
  const [showContextualPrompt, setShowContextualPrompt] = useState(false);
  const [hasSeenContextualPrompt, setHasSeenContextualPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch data in parallel for better performance
        // Skip featured books fetching for performance (redundant with "For You" section)
        const [threadsData, featuredBooks] = await Promise.all([
          api.threads.getAll(),
          SHOW_FEATURED_BOOKS ? booksCacheService.getFeatured() : Promise.resolve([])
        ]);
        
        // Process threads to match ThreadCard component props
        const processedThreads = threadsData.map(thread => {
          // Process tags to ensure they're properly formatted
          let processedTags = thread.tags;
          
          // If tags is a string that looks like a stringified array, parse it
          if (typeof thread.tags === 'string') {
            try {
              processedTags = JSON.parse(thread.tags as any);
            } catch {
              // If parsing fails, split by comma
              processedTags = (thread.tags as any).split(',').map((t: string) => t.trim());
            }
          }
          
          // Normalize each tag to extract clean string values
          if (Array.isArray(processedTags)) {
            processedTags = processedTags.map(normalizeTag);
          } else if (processedTags) {
            // If somehow not an array, make it a single-item array
            processedTags = [normalizeTag(processedTags)];
          } else {
            // Default to empty array if tags is null/undefined
            processedTags = [];
          }
          
          return {
            ...thread,
            tags: processedTags,
            timestamp: new Date(thread.createdAt).toLocaleDateString()
          };
        });
        
        setTrendingBooks(featuredBooks);
        setThreads(processedThreads);
        
        // Pre-check saved status for featured books (only if feature enabled)
        if (SHOW_FEATURED_BOOKS && user?.id && featuredBooks.length > 0) {
          checkBooks(featuredBooks.map(book => book.id));
        }
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, checkBooks]);

  // Initialize anonymous session for interaction tracking
  useEffect(() => {
    const initializeSession = async () => {
      if (!user?.id) {
        try {
          const session = await AnonymousSessionService.getOrCreateSession();
          setSessionId(session.sessionId);
          console.log('[HOMEPAGE] Initialized anonymous session:', session.sessionId);

          const hasPreferences = session.preferences &&
            ((session.preferences.favoriteGenres?.length ?? 0) > 0 || session.preferences.mood);

          setHasCompletedOnboarding(!!hasPreferences);

          // Track interaction count for contextual prompt
          setInteractionCount(session.interactionCount);
          setHasSeenContextualPrompt(false); // Reset for new sessions

        } catch (error) {
          console.error('[HOMEPAGE] Error initializing session:', error);
          setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        }
      } else {
        setSessionId(undefined); // Clear session ID for authenticated users
        setHasCompletedOnboarding(true); // Authenticated users don't need anonymous onboarding
      }
    };
    initializeSession();
  }, [user?.id]);

  /**
   * Track user interactions for contextual prompts
   * Shows personalization prompt after 2 interactions
   */
  const trackBookInteraction = async (interactionType: 'click' | 'save' | 'unsave' | 'dismiss', bookId: string) => {
    // Only track for users who haven't completed onboarding
    if (hasCompletedOnboarding || hasSeenContextualPrompt) {
      return;
    }
    
    const newCount = interactionCount + 1;
    setInteractionCount(newCount);
    
    // Update anonymous session interaction count
    if (!user?.id && sessionId) {
      try {
        await AnonymousSessionService.incrementInteractionCount(sessionId);
      } catch (error) {
        console.error('[HOMEPAGE] Error updating interaction count:', error);
      }
    }
    
    // Show contextual prompt after 2nd interaction
    if (newCount >= 2 && !showContextualPrompt && !hasSeenContextualPrompt) {
      // Add a small delay to avoid showing immediately after click
      setTimeout(() => {
        setShowContextualPrompt(true);
      }, 2000);
    }
    
    console.log(`[HOMEPAGE] Interaction tracked: ${interactionType} (count: ${newCount})`);
  };



  const handleSearch = async (query: string, searchType: string = 'all') => {
    // Use React Router navigation to preserve smooth transitions
    const searchParams = new URLSearchParams();
    searchParams.set('query', query);
    if (searchType && searchType !== 'all') {
      searchParams.set('type', searchType);
    }
    navigate(`/books?${searchParams.toString()}`);
  };

  const handleColorSearch = (color: any) => {
    // Use React Router navigation for color search
    navigate(`/books?color=${encodeURIComponent(color.emotion)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className={`text-4xl font-bold transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-900'
            : theme === 'dark'
            ? 'text-white'
            : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
        }`}>
          Discover Your Next Great Read
        </h1>
        <p className={`text-xl max-w-2xl mx-auto transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          Get personalized book recommendations based on your mood, interests, and reading style
        </p>
        <div className="max-w-3xl mx-auto">
          <SearchBar 
            onSearch={handleSearch}
            onMoodSelect={(mood) => handleSearch(mood, 'mood')}
            onColorSearch={handleColorSearch}
          />
        </div>
        
        {/* Search error message */}
        {error && (
          <div className={`mt-4 transition-colors duration-300 ${
            theme === 'light'
              ? 'text-red-500'
              : theme === 'dark'
              ? 'text-red-400'
              : 'text-pink-600'
          }`}>
            {error}
          </div>
        )}
      </section>

      {/* Personalized/Contextual Recommendations - Available for all users */}
      {flagsLoading ? (
        <section className="mx-auto max-w-7xl mb-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </section>
      ) : isEnabled('contextual_recommendations_v1') ? (
        <section>
          <ContextualRecommendations 
            availableBooks={trendingBooks}
            maxRecommendations={6}
            showContextPanel={true}
            className="mx-auto max-w-7xl"
          />
        </section>
      ) : isPersonalizationEnabled ? (
        <section>
          <PersonalizedRecommendations 
            availableBooks={trendingBooks}
            maxRecommendations={6}
            showInsights={true}
            className="mx-auto max-w-7xl"
          />
        </section>
      ) : null}

      {/* Featured Books - Hidden for performance (redundant with "For You" section) */}
      {SHOW_FEATURED_BOOKS && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-primary-900'
                : theme === 'dark'
                ? 'text-white'
                : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
            }`}>
              Featured Books
            </h2>
            <Link 
              to="/books" 
              className={`flex items-center space-x-1 transition-all duration-300 hover:scale-105 ${
                theme === 'light'
                  ? 'text-primary-600 hover:text-primary-800'
                  : theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-purple-600 hover:text-purple-800'
              }`}
            >
              <span>View All Books</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {trendingBooks.map((book) => (
              <BookCard 
                key={book.id} 
                {...book} 
                isSaved={isBookSaved(book.id)}
                onInteraction={(type) => trackBookInteraction(type, book.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Popular Threads */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${
            theme === 'light'
              ? 'text-primary-900'
              : theme === 'dark'
              ? 'text-white'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
          }`}>
            Popular Threads
          </h2>
          <Link 
            to="/threads" 
            className={`flex items-center space-x-1 transition-all duration-300 hover:scale-105 ${
              theme === 'light'
                ? 'text-primary-600 hover:text-primary-800'
                : theme === 'dark'
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-purple-600 hover:text-purple-800'
            }`}
          >
            <span>View All</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {threads.slice(0, 4).map((thread) => (
            <ThreadCard
              key={thread.id}
              id={thread.id}
              title={thread.title}
              description={thread.description}
              upvotes={thread.upvotes}
              comments={thread.comments}
              timestamp={thread.timestamp || new Date(thread.createdAt).toLocaleDateString()}
              tags={thread.tags}
            />
          ))}
        </div>
      </section>

      {/* Contextual Prompt (after 2 interactions) */}
      {showContextualPrompt && !hasCompletedOnboarding && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`p-4 rounded-xl shadow-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-xl">📚</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">Enjoying these books?</h3>
                <p className={`text-xs mb-3 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Get personalized recommendations based on your preferences!
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowOnboarding(true);
                      setShowContextualPrompt(false);
                    }}
                    className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Get Started
                  </button>
                  <button
                    onClick={() => {
                      setShowContextualPrompt(false);
                      setHasSeenContextualPrompt(true);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-600 hover:text-gray-700'
                    }`}
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anonymous User Onboarding Modal */}
      <AnonymousUserOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(preferences) => {
          console.log('[HOMEPAGE] Anonymous onboarding completed:', preferences);
          setHasCompletedOnboarding(true);
          setShowOnboarding(false);
        }}
      />

    </div>
  );
}; 