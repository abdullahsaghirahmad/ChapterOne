import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  LightBulbIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFeatureFlags } from '../../services/featureFlag.service';
import { MLService, ContextVector } from '../../services/ml.service';
import { EnhancedMLService, EnhancedMLRecommendation } from '../../services/enhancedMLService.service';
import { useRewardTracking } from '../../services/rewardSignal.service';
import { ContextualBanditsService } from '../../services/contextualBandits.service';
import { ContextEncoderService } from '../../services/contextEncoder.service';
import { AnonymousSessionService } from '../../services/anonymousSession.service';
import { Book } from '../../types';
import { BookCard } from './BookCard';
import { AnonymousUserOnboardingModal } from '../ui/AnonymousUserOnboardingModal';
import api from '../../services/api.supabase';

interface ContextualRecommendationsProps {
  availableBooks?: Book[];
  maxRecommendations?: number;
  showContextPanel?: boolean;
  className?: string;
}

interface UserContext {
  mood: string;
  situation: string;
  goal: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

const MOOD_OPTIONS = [
  { id: 'motivated', label: 'Motivated', icon: '💪', description: 'Ready to tackle challenges' },
  { id: 'curious', label: 'Curious', icon: '🤔', description: 'Want to learn something new' },
  { id: 'relaxed', label: 'Relaxed', icon: '😌', description: 'Looking for something peaceful' },
  { id: 'adventurous', label: 'Adventurous', icon: '🌟', description: 'Seeking excitement' },
  { id: 'nostalgic', label: 'Nostalgic', icon: '📚', description: 'In a reflective mood' },
  { id: 'focused', label: 'Focused', icon: '🎯', description: 'Ready for deep thinking' }
];

const SITUATION_OPTIONS = [
  { id: 'commuting', label: 'Commuting', icon: '🚊' },
  { id: 'before_bed', label: 'Before Bed', icon: '🌙' },
  { id: 'weekend', label: 'Weekend Reading', icon: '☕' },
  { id: 'lunch_break', label: 'Lunch Break', icon: '🍽️' },
  { id: 'traveling', label: 'Traveling', icon: '✈️' },
  { id: 'studying', label: 'Study Session', icon: '📖' }
];

const GOAL_OPTIONS = [
  { id: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { id: 'learning', label: 'Learning', icon: '🧠' },
  { id: 'professional', label: 'Professional Growth', icon: '💼' },
  { id: 'inspiration', label: 'Inspiration', icon: '✨' },
  { id: 'relaxation', label: 'Relaxation', icon: '🌸' },
  { id: 'perspective', label: 'New Perspective', icon: '🔄' }
];

export const ContextualRecommendations: React.FC<ContextualRecommendationsProps> = ({
  availableBooks = [],
  maxRecommendations = 6,
  showContextPanel = true,
  className = ''
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { flags, isEnabled } = useFeatureFlags();
  const { recordImpression } = useRewardTracking();
  
  // State management
  const [books, setBooks] = useState<Book[]>(availableBooks);
  const [recommendations, setRecommendations] = useState<EnhancedMLRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [selectedBanditStrategy, setSelectedBanditStrategy] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [showContextualPrompt, setShowContextualPrompt] = useState(false);
  const [hasSeenContextualPrompt, setHasSeenContextualPrompt] = useState(false);
  
  // User context state with smart defaults and persistence
  const [userContext, setUserContext] = useState<UserContext>(() => {
    // Load from localStorage with smart defaults
    const loadedContext = ContextEncoderService.loadContext(user?.id);
    if (loadedContext) {
      return {
        mood: loadedContext.mood || '',
        situation: loadedContext.situation || '',
        goal: loadedContext.goal || '',
        timeOfDay: loadedContext.timeOfDay as 'morning' | 'afternoon' | 'evening' | 'night'
      };
    }
    
    // Fallback to basic initialization
    return {
      mood: '',
      situation: '',
      goal: '',
      timeOfDay: ContextEncoderService.getCurrentTimeOfDay() as 'morning' | 'afternoon' | 'evening' | 'night'
    };
  });

  // Feature flag checks
  const showContextAwarenessPanel = isEnabled('context_awareness_panel') && showContextPanel;
  const showRecommendationExplanations = isEnabled('recommendation_explanations');

  // Initialize session for anonymous users
  useEffect(() => {
    const initializeSession = async () => {
      if (!user?.id) {
        try {
          const session = await AnonymousSessionService.getOrCreateSession();
          setSessionId(session.sessionId);
          console.log('[CONTEXTUAL_RECS] Initialized anonymous session:', session.sessionId);
          
          // Check if anonymous user should see onboarding
          const hasPreferences = session.preferences && 
            ((session.preferences.favoriteGenres?.length ?? 0) > 0 || session.preferences.mood);
          
          setHasCompletedOnboarding(!!hasPreferences);
          
          // Track interaction count for contextual prompts (no auto-popup)
          setInteractionCount(session.interactionCount || 0);
          
          // Check if user has seen the contextual prompt
          const hasSeenPrompt = localStorage.getItem('chapterone_seen_contextual_prompt');
          setHasSeenContextualPrompt(!!hasSeenPrompt);
        } catch (error) {
          console.error('[CONTEXTUAL_RECS] Error initializing session:', error);
          // Fallback to simple session ID
          setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        }
      } else {
        setSessionId(undefined); // Clear session ID for authenticated users
        setHasCompletedOnboarding(true); // Authenticated users don't need anonymous onboarding
      }
    };

    initializeSession();
  }, [user?.id]);

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

    if (flags.contextual_recommendations_v1) {
      loadBooks();
    }
  }, [availableBooks.length, flags.contextual_recommendations_v1]); // Use flag value, not function

  // Generate recommendations when context or books change
  useEffect(() => {
    const runGenerateRecommendations = async () => {
      if (!flags.contextual_recommendations_v1 || books.length === 0) {
        return;
      }

      setLoading(true);
      try {
        const contextVector: ContextVector = {
          mood: userContext.mood || undefined,
          situation: userContext.situation || undefined,
          goal: userContext.goal || undefined,
          timeOfDay: userContext.timeOfDay,
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
          userHistory: user ? {
            favoriteGenres: [], // Would come from user preferences
            recentInteractions: [], // Would come from interaction history
            averageRating: 0 // Would come from user rating history
          } : undefined
        };

        console.log('[CONTEXTUAL_RECS] Generating recommendations with context:', contextVector);

        // 🤖 Get contextual bandits strategy selection if enabled
        let banditStrategy: string | null = null;
        if (flags.contextual_bandits) {
          console.log('[CONTEXTUAL_RECS] Using contextual bandits for strategy selection');
          
          try {
            const banditRecommendation = await ContextualBanditsService.getBestRecommendationStrategy(
              contextVector,
              user?.id
            );
            banditStrategy = banditRecommendation.armId;
            setSelectedBanditStrategy(banditStrategy);
            
            console.log(`[CONTEXTUAL_RECS] Bandit selected strategy: ${banditRecommendation.armName}`);
          } catch (error) {
            console.error('[CONTEXTUAL_RECS] Bandit strategy selection failed:', error);
          }
        }

        // 🚀 Use enhanced ML service with semantic embeddings integration
        const mlRecommendations = await EnhancedMLService.getEnhancedContextualRecommendations(
          contextVector,
          books,
          user?.id,
          maxRecommendations
        );

        setRecommendations(mlRecommendations);

        // 🎯 Record impressions for reward tracking
        if (mlRecommendations.length > 0) {
          console.log('[CONTEXTUAL_RECS] Recording impressions for reward tracking');
          
          for (let i = 0; i < mlRecommendations.length; i++) {
            const rec = mlRecommendations[i];
            
            // Record impression for each recommendation shown
            try {
              await recordImpression(
                rec.book.id,
                contextVector,
                banditStrategy || 'contextual_basic', // Use bandit strategy or fallback
                i + 1, // Rank (1st, 2nd, 3rd recommendation)
                rec.score,
                user?.id,
                sessionId
              );
            } catch (impressionError) {
              console.error('[CONTEXTUAL_RECS] Error recording impression:', impressionError);
            }
          }
          
          console.log(`[CONTEXTUAL_RECS] Recorded ${mlRecommendations.length} recommendation impressions`);
        }
      } catch (error) {
        console.error('Error generating contextual recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    runGenerateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books.length, userContext.mood, userContext.situation, userContext.goal, userContext.timeOfDay, user?.id, maxRecommendations, flags.contextual_recommendations_v1, flags.contextual_bandits]);

  // Auto-detect time of day (only update when category changes)
  useEffect(() => {
    const updateTimeOfDay = () => {
      const newTimeOfDay = ContextEncoderService.getCurrentTimeOfDay() as 'morning' | 'afternoon' | 'evening' | 'night';
      setUserContext(prev => {
        // Only update if the time category actually changed
        if (prev.timeOfDay !== newTimeOfDay) {
          console.log(`[CONTEXTUAL_RECS] Time of day changed: ${prev.timeOfDay} → ${newTimeOfDay}`);
          return {
            ...prev,
            timeOfDay: newTimeOfDay
          };
        }
        return prev; // No change needed
      });
    };

    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Re-enabled after fixing React hook dependencies

  // Don't render if feature is disabled
  if (!flags.contextual_recommendations_v1) {
    return null;
  }

  const handleContextChange = (type: 'mood' | 'situation' | 'goal', value: string) => {
    setUserContext(prev => {
      const newContext = {
        ...prev,
        [type]: prev[type] === value ? '' : value // Toggle selection
      };
      
      // Save to localStorage for persistence
      ContextEncoderService.saveContext(newContext, user?.id);
      
      return newContext;
    });
  };

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
        console.error('[CONTEXTUAL_RECS] Error updating interaction count:', error);
      }
    }
    
    // Show contextual prompt after 2nd interaction
    if (newCount >= 2 && !showContextualPrompt && !hasSeenContextualPrompt) {
      // Add a small delay to avoid showing immediately after click
      setTimeout(() => {
        setShowContextualPrompt(true);
      }, 2000);
    }
    
    console.log(`[CONTEXTUAL_RECS] Interaction tracked: ${interactionType} (count: ${newCount})`);
  };

  /**
   * Record bandit learning when user interacts with recommendation
   */
  const recordBanditLearning = async (
    interactionType: 'click' | 'save' | 'unsave' | 'dismiss',
    bookId: string
  ) => {
    if (!isEnabled('contextual_bandits') || !selectedBanditStrategy) {
      return; // Bandit learning not enabled or no strategy selected
    }

    try {
      // Convert user interaction to reward signal
      const rewardMap = {
        'click': 0.3,     // Moderate positive signal
        'save': 1.0,      // Strong positive signal  
        'unsave': -0.5,   // Negative signal
        'dismiss': -0.2   // Weak negative signal
      };

      const reward = rewardMap[interactionType] || 0;
      
      // Create context vector from current user context
      const contextVector: ContextVector = {
        mood: userContext.mood || undefined,
        situation: userContext.situation || undefined, 
        goal: userContext.goal || undefined,
        timeOfDay: userContext.timeOfDay,
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        userHistory: user ? {
          favoriteGenres: [],
          recentInteractions: [],
          averageRating: 0
        } : undefined
      };

      console.log(`[CONTEXTUAL_RECS] Recording bandit learning: ${interactionType} -> ${reward} for strategy ${selectedBanditStrategy}`);

      // Record the learning signal
      await MLService.recordBanditLearning(
        selectedBanditStrategy,
        contextVector,
        reward,
        user?.id
      );

      console.log(`[CONTEXTUAL_RECS] Bandit learning recorded for ${interactionType} on book ${bookId}`);
    } catch (error) {
      console.error('[CONTEXTUAL_RECS] Error recording bandit learning:', error);
    }
  };

  const getContextSummary = () => {
    const parts = [];
    if (userContext.mood) parts.push(MOOD_OPTIONS.find(m => m.id === userContext.mood)?.label);
    if (userContext.situation) parts.push(SITUATION_OPTIONS.find(s => s.id === userContext.situation)?.label);
    if (userContext.goal) parts.push(GOAL_OPTIONS.find(g => g.id === userContext.goal)?.label);
    return parts.join(' • ') || 'General recommendations';
  };

  return (
    <div className={`contextual-recommendations ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <SparklesIcon className="h-6 w-6 text-purple-500" />
          <div>
            <h2 className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              For You Right Now
            </h2>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {getContextSummary()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Get Personalized Button (if not personalized) */}
          {(!hasCompletedOnboarding && !showOnboarding) && (
            <button
              onClick={() => setShowOnboarding(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-purple-900 hover:bg-purple-800 text-purple-300 border border-purple-700'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
              }`}
            >
              <UserPlusIcon className="h-4 w-4" />
              <span>Get Personalized</span>
            </button>
          )}
          
          {/* Time indicator */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
            theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            <ClockIcon className="h-3 w-3" />
            <span>{userContext.timeOfDay}</span>
          </div>

          {/* Context panel toggle */}
          {showContextAwarenessPanel && (
            <button
              onClick={() => setContextPanelOpen(!contextPanelOpen)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              <span>Context</span>
              {contextPanelOpen ? (
                <ChevronUpIcon className="h-3 w-3" />
              ) : (
                <ChevronDownIcon className="h-3 w-3" />
              )}
            </button>
          )}

          {/* Explanations toggle */}
          {showRecommendationExplanations && recommendations.length > 0 && (
            <button
              onClick={() => setShowExplanations(!showExplanations)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showExplanations
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  : theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <InformationCircleIcon className="h-4 w-4" />
              <span>Why?</span>
            </button>
          )}
        </div>
      </div>

      {/* Context Awareness Panel */}
      <AnimatePresence>
        {contextPanelOpen && showContextAwarenessPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mb-6 p-4 rounded-xl border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            {/* Panel Header with Smart Defaults */}
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Set Your Reading Context
              </h3>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const newContext = {
                      mood: '',
                      situation: '',
                      goal: '',
                      timeOfDay: ContextEncoderService.getCurrentTimeOfDay() as 'morning' | 'afternoon' | 'evening' | 'night'
                    };
                    setUserContext(newContext);
                    ContextEncoderService.saveContext(newContext, user?.id);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Clear All
                </button>
                
                <button
                  onClick={() => {
                    const smartDefaults = ContextEncoderService.getSmartTimeDefaults();
                    const newContext = {
                      mood: smartDefaults.mood,
                      situation: smartDefaults.situation,
                      goal: smartDefaults.goal,
                      timeOfDay: ContextEncoderService.getCurrentTimeOfDay() as 'morning' | 'afternoon' | 'evening' | 'night'
                    };
                    setUserContext(newContext);
                    ContextEncoderService.saveContext(newContext, user?.id);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-purple-900 hover:bg-purple-800 text-purple-300'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                >
                  ⚡ Smart Defaults
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mood Selection */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  How are you feeling?
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.id}
                      onClick={() => handleContextChange('mood', mood.id)}
                      className={`p-2 rounded-lg text-xs transition-all ${
                        userContext.mood === mood.id
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 ring-2 ring-purple-500'
                          : theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                      title={mood.description}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{mood.icon}</span>
                        <span>{mood.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Situation Selection */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  What's your situation?
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {SITUATION_OPTIONS.map((situation) => (
                    <button
                      key={situation.id}
                      onClick={() => handleContextChange('situation', situation.id)}
                      className={`p-2 rounded-lg text-xs transition-all ${
                        userContext.situation === situation.id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ring-2 ring-blue-500'
                          : theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{situation.icon}</span>
                        <span>{situation.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Selection */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  What's your goal?
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => handleContextChange('goal', goal.id)}
                      className={`p-2 rounded-lg text-xs transition-all ${
                        userContext.goal === goal.id
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ring-2 ring-green-500'
                          : theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{goal.icon}</span>
                        <span>{goal.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className={`animate-pulse rounded-xl h-96 ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec, index) => (
            <div key={rec.book.id} className="relative">
              <BookCard
                {...rec.book}
                onInteraction={(type) => {
                  // Track interaction for contextual prompts
                  trackBookInteraction(type, rec.book.id);
                  // Record bandit learning
                  recordBanditLearning(type, rec.book.id);
                }}
              />
              
              {/* Explanation Overlay */}
              <AnimatePresence>
                {showExplanations && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute top-2 left-2 right-2 p-3 rounded-lg backdrop-blur-sm ${
                      theme === 'dark'
                        ? 'bg-black/80 text-white'
                        : 'bg-white/90 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <LightBulbIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium mb-1">
                          Score: {(rec.score * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs space-y-1">
                          {rec.explanation.map((exp, i) => (
                            <div key={i}>• {exp}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      ) : (
        // Fallback: Show basic books when no recommendations available (preserves interaction tracking)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {books.slice(0, 6).map((book) => (
            <BookCard
              key={book.id}
              {...book}
              onInteraction={(type) => {
                // Track interaction for contextual prompts
                trackBookInteraction(type, book.id);
                // Record bandit learning
                recordBanditLearning(type, book.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Debug Info (Dev Only)</h4>
          <div className="text-xs space-y-1">
            <div>Feature Flags: {Object.entries(flags).filter(([_, enabled]) => enabled).map(([flag]) => flag).join(', ') || 'None'}</div>
            <div>Books Available: {books.length}</div>
            <div>Recommendations Generated: {recommendations.length}</div>
            <div>Context: {JSON.stringify(userContext)}</div>
          </div>
        </div>
      )}
      
      {/* Contextual Prompt (after 2 interactions) */}
      <AnimatePresence>
        {showContextualPrompt && !hasCompletedOnboarding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 max-w-sm"
          >
            <div className={`p-4 rounded-xl shadow-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold mb-1">Enjoying these books?</h3>
                  <p className={`text-xs mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    We can make them even better for you!
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setShowContextualPrompt(false);
                        setShowOnboarding(true);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-medium transition-colors"
                    >
                      Get Personalized
                    </button>
                    <button
                      onClick={() => {
                        setShowContextualPrompt(false);
                        setHasSeenContextualPrompt(true);
                        localStorage.setItem('chapterone_seen_contextual_prompt', 'true');
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      These are great
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowContextualPrompt(false);
                    setHasSeenContextualPrompt(true);
                    localStorage.setItem('chapterone_seen_contextual_prompt', 'true');
                  }}
                  className={`flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Anonymous User Onboarding Modal */}
      <AnonymousUserOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(preferences) => {
          console.log('[CONTEXTUAL_RECS] Anonymous onboarding completed:', preferences);
          setHasCompletedOnboarding(true);
          setShowOnboarding(false);
          
          // Update user context with preferences
          setUserContext(prev => ({
            ...prev,
            mood: preferences.preferredMood || prev.mood,
            goal: preferences.readingGoal || prev.goal,
          }));
          
          // Force recommendations refresh with new preferences
          setRecommendations([]);
        }}
      />
    </div>
  );
};

