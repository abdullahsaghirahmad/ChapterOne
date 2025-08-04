import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, SparklesIcon, BookOpenIcon, HeartIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ReadingPreferences } from '../../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (preferences: ReadingPreferences) => void;
}

const GENRE_OPTIONS = [
  'Science Fiction', 'Fantasy', 'Mystery', 'Romance', 'Historical Fiction',
  'Biography', 'Self-Help', 'Business', 'Psychology', 'Philosophy',
  'Thriller', 'Adventure', 'Health', 'Technology', 'Art'
];

const PACE_OPTIONS = [
  { id: 'slow', label: 'Slow & Thoughtful', description: 'I like to savor every word' },
  { id: 'moderate', label: 'Moderate', description: 'Balanced reading experience' },
  { id: 'fast', label: 'Quick & Engaging', description: 'I prefer page-turners' }
];

const READING_REASONS = [
  'Entertainment & Escape',
  'Learning & Growth', 
  'Professional Development',
  'Relaxation & Stress Relief',
  'Inspiration & Motivation',
  'Understanding Different Perspectives'
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPace, setSelectedPace] = useState<string>('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [currentMood, setCurrentMood] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : prev.length < 5 ? [...prev, genre] : prev
    );
  };

  const handleReasonToggle = (reason: string) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : prev.length < 3 ? [...prev, reason] : prev
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const preferences: ReadingPreferences = {
        favoriteGenres: selectedGenres,
        preferredPace: selectedPace,
        currentMood,
        readingGoals: {
          primaryReasons: selectedReasons,
          booksPerMonth: 2, // Default
          preferredLength: 'medium' // Default
        }
      };

      await onComplete(preferences);
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedGenres.length > 0 || selectedPace || selectedReasons.length > 0;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-xl ${
        theme === 'light'
          ? 'bg-white'
          : theme === 'dark'
          ? 'bg-gray-800'
          : 'bg-gradient-to-br from-pink-50 to-purple-50'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SparklesIcon className={`w-6 h-6 ${
                theme === 'light'
                  ? 'text-primary-600'
                  : theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-purple-600'
              }`} />
              <div>
                <h2 className={`text-xl font-bold ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  Welcome to ChapterOne!
                </h2>
                <p className={`text-sm ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-600'
                }`}>
                  Let's personalize your reading experience
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'hover:bg-gray-100 text-gray-500'
                  : theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-purple-100 text-purple-600'
              }`}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Favorite Genres */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpenIcon className={`w-5 h-5 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-600'
              }`} />
              <h3 className={`text-lg font-semibold ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                What genres do you love?
              </h3>
            </div>
            <p className={`text-sm mb-4 ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-600'
            }`}>
              Select up to 5 genres (optional)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  className={`p-3 text-sm rounded-lg transition-all hover:scale-105 ${
                    selectedGenres.includes(genre)
                      ? theme === 'light'
                        ? 'bg-primary-100 border-2 border-primary-300 text-primary-700'
                        : theme === 'dark'
                        ? 'bg-blue-900 border-2 border-blue-600 text-blue-300'
                        : 'bg-purple-200 border-2 border-purple-400 text-purple-800'
                      : theme === 'light'
                      ? 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                      : theme === 'dark'
                      ? 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                      : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Reading Pace */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              What's your reading pace?
            </h3>
            <div className="space-y-2">
              {PACE_OPTIONS.map((pace) => (
                <button
                  key={pace.id}
                  onClick={() => setSelectedPace(pace.id)}
                  className={`w-full p-4 text-left rounded-lg transition-all hover:scale-105 ${
                    selectedPace === pace.id
                      ? theme === 'light'
                        ? 'bg-primary-100 border-2 border-primary-300 text-primary-700'
                        : theme === 'dark'
                        ? 'bg-blue-900 border-2 border-blue-600 text-blue-300'
                        : 'bg-purple-200 border-2 border-purple-400 text-purple-800'
                      : theme === 'light'
                      ? 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                      : theme === 'dark'
                      ? 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                      : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <div className="font-medium">{pace.label}</div>
                  <div className="text-sm opacity-75">{pace.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reading Reasons */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <HeartIcon className={`w-5 h-5 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-600'
              }`} />
              <h3 className={`text-lg font-semibold ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                Why do you read?
              </h3>
            </div>
            <p className={`text-sm mb-4 ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-600'
            }`}>
              Select up to 3 main reasons (optional)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {READING_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReasonToggle(reason)}
                  className={`p-3 text-sm rounded-lg transition-all hover:scale-105 ${
                    selectedReasons.includes(reason)
                      ? theme === 'light'
                        ? 'bg-primary-100 border-2 border-primary-300 text-primary-700'
                        : theme === 'dark'
                        ? 'bg-blue-900 border-2 border-blue-600 text-blue-300'
                        : 'bg-purple-200 border-2 border-purple-400 text-purple-800'
                      : theme === 'light'
                      ? 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                      : theme === 'dark'
                      ? 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                      : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Current Mood */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              What's your reading mood today?
            </h3>
            <input
              type="text"
              value={currentMood}
              onChange={(e) => setCurrentMood(e.target.value)}
              placeholder="e.g., Need motivation, Want to escape, Ready to learn..."
              className={`w-full p-3 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  : theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                  : 'bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500'
              }`}
              maxLength={100}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
              }`}
            >
              Skip for Now
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                canSubmit && !isSubmitting
                  ? theme === 'light'
                    ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg'
                    : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};