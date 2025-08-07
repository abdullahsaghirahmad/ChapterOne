/**
 * Anonymous User Onboarding Modal
 * 
 * Quick preference gathering for anonymous users to improve
 * immediate personalization without requiring signup.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  SparklesIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { AnonymousSessionService } from '../../services/anonymousSession.service';

interface AnonymousUserOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (preferences: AnonymousPreferences) => void;
}

interface AnonymousPreferences {
  favoriteGenres: string[];
  readingGoal: string;
  preferredMood: string;
  readingStyle: string;
}

const GENRE_OPTIONS = [
  { id: 'fiction', label: 'Fiction', icon: '📚' },
  { id: 'mystery', label: 'Mystery', icon: '🔍' },
  { id: 'romance', label: 'Romance', icon: '💕' },
  { id: 'scifi', label: 'Sci-Fi', icon: '🚀' },
  { id: 'fantasy', label: 'Fantasy', icon: '🧙‍♂️' },
  { id: 'thriller', label: 'Thriller', icon: '😱' },
  { id: 'biography', label: 'Biography', icon: '👤' },
  { id: 'history', label: 'History', icon: '🏛️' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'selfhelp', label: 'Self-Help', icon: '💪' }
];

const READING_GOALS = [
  { id: 'entertainment', label: 'Entertainment & Fun', icon: '🎭' },
  { id: 'learning', label: 'Learning & Growth', icon: '🧠' },
  { id: 'relaxation', label: 'Relaxation & Escape', icon: '🌴' },
  { id: 'inspiration', label: 'Inspiration & Motivation', icon: '✨' }
];

const MOOD_OPTIONS = [
  { id: 'curious', label: 'Curious', icon: '🤔' },
  { id: 'adventurous', label: 'Adventurous', icon: '⛰️' },
  { id: 'peaceful', label: 'Peaceful', icon: '🕊️' },
  { id: 'energetic', label: 'Energetic', icon: '⚡' }
];

const READING_STYLES = [
  { id: 'quick', label: 'Quick Reads', icon: '⚡', description: 'Short chapters, fast pacing' },
  { id: 'immersive', label: 'Deep Dives', icon: '🌊', description: 'Rich, detailed narratives' },
  { id: 'light', label: 'Easy Going', icon: '☁️', description: 'Light, comfortable reads' },
  { id: 'challenging', label: 'Challenging', icon: '🧗', description: 'Complex, thought-provoking' }
];

export const AnonymousUserOnboardingModal: React.FC<AnonymousUserOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<AnonymousPreferences>({
    favoriteGenres: [],
    readingGoal: '',
    preferredMood: '',
    readingStyle: ''
  });

  const handleGenreToggle = (genreId: string) => {
    setPreferences(prev => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genreId)
        ? prev.favoriteGenres.filter(g => g !== genreId)
        : [...prev.favoriteGenres, genreId].slice(0, 3) // Max 3 genres
    }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      // Update anonymous session with preferences
      AnonymousSessionService.updateSession({
        preferences: {
          favoriteGenres: preferences.favoriteGenres,
          goal: preferences.readingGoal,
          mood: preferences.preferredMood,
          readingStyle: preferences.readingStyle,
          // Store additional context
          recentInteractions: []
        }
      });

      onComplete(preferences);
      onClose();
    } catch (error) {
      console.error('Error saving anonymous preferences:', error);
      onComplete(preferences);
      onClose();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return preferences.favoriteGenres.length > 0;
      case 2: return preferences.readingGoal !== '' && preferences.preferredMood !== '';
      case 3: return preferences.readingStyle !== '';
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <BookOpenIcon className="h-16 w-16 mx-auto mb-4 text-blue-500" />
              <h3 className={`text-xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                What do you love to read?
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Pick up to 3 genres you enjoy (we'll find more as you explore!)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreToggle(genre.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    preferences.favoriteGenres.includes(genre.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : theme === 'dark'
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{genre.icon}</span>
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {genre.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <span className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Selected: {preferences.favoriteGenres.length}/3
              </span>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <SparklesIcon className="h-16 w-16 mx-auto mb-4 text-purple-500" />
              <h3 className={`text-xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                What's your reading goal & mood?
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Tell us why you're reading and how you're feeling
              </p>
            </div>

            {/* Reading Goals */}
            <div>
              <h4 className={`text-sm font-semibold mb-3 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Reading Goal
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {READING_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setPreferences(prev => ({ ...prev, readingGoal: goal.id }))}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      preferences.readingGoal === goal.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : theme === 'dark'
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{goal.icon}</div>
                    <div className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {goal.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Mood */}
            <div>
              <h4 className={`text-sm font-semibold mb-3 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Current Mood
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => setPreferences(prev => ({ ...prev, preferredMood: mood.id }))}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      preferences.preferredMood === mood.id
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                        : theme === 'dark'
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{mood.icon}</div>
                    <div className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {mood.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <BookOpenIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className={`text-xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                What's your reading style?
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Help us match your preferred reading pace and complexity
              </p>
            </div>

            <div className="space-y-3">
              {READING_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setPreferences(prev => ({ ...prev, readingStyle: style.id }))}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    preferences.readingStyle === style.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : theme === 'dark'
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{style.icon}</span>
                      <div>
                        <div className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {style.label}
                        </div>
                        <div className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {style.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );



      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`relative w-full max-w-md p-6 rounded-xl shadow-xl ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${
              theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Step {step} of 4
              </span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`w-2 h-2 rounded-full ${
                      stepNum <= step 
                        ? 'bg-blue-500' 
                        : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {renderStep()}
          </div>

          <div className="flex justify-between">
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Skip for now
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                canProceed()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              }`}
            >
              {step === 3 ? 'Get My Recommendations!' : 'Next'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};