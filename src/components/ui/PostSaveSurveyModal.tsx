import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, HeartIcon, BookOpenIcon, AcademicCapIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

interface PostSaveSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookId: string;
  onComplete: () => void;
}

const MOOD_OPTIONS = [
  { id: 'motivated', label: 'Motivated', icon: '💪' },
  { id: 'curious', label: 'Curious', icon: '🤔' },
  { id: 'relaxed', label: 'Want to Unwind', icon: '😌' },
  { id: 'inspired', label: 'Need Inspiration', icon: '✨' },
  { id: 'focused', label: 'Ready to Learn', icon: '🎯' },
  { id: 'adventurous', label: 'Seeking Adventure', icon: '🗺️' },
];

const SITUATION_OPTIONS = [
  { id: 'commute', label: 'Commute/Travel', icon: <BookOpenIcon className="w-4 h-4" /> },
  { id: 'bedtime', label: 'Bedtime Reading', icon: '🌙' },
  { id: 'weekend', label: 'Weekend Leisure', icon: '📚' },
  { id: 'work_break', label: 'Work Break', icon: <BriefcaseIcon className="w-4 h-4" /> },
  { id: 'learning', label: 'Personal Growth', icon: <AcademicCapIcon className="w-4 h-4" /> },
  { id: 'social', label: 'Book Club/Discussion', icon: '👥' },
];

const GOAL_OPTIONS = [
  'Entertainment & Escape',
  'Learn Something New', 
  'Professional Development',
  'Personal Improvement',
  'Understand Different Perspectives',
  'Relax & De-stress',
];

export const PostSaveSurveyModal: React.FC<PostSaveSurveyModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  bookId,
  onComplete,
}) => {
  const { theme } = useTheme();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedSituation, setSituation] = useState<string>('');
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Update the saved book with context information
      const context = {
        mood: selectedMood,
        situation: selectedSituation,
        goal: selectedGoal,
      };

      // We'll call a method to update the saved book's context
      // For now, we'll just log it and close the modal
      console.log('Save context:', {
        bookId,
        reason,
        context,
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error saving context:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedMood || selectedSituation || selectedGoal || reason.trim();

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className={`max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-xl ${
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
              <HeartIcon className={`w-6 h-6 ${
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
                  Saved to Library!
                </h2>
                <p className={`text-sm ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-600'
                }`}>
                  Help us recommend better books
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

          {/* Book Title */}
          <div className={`p-3 rounded-lg mb-6 ${
            theme === 'light'
              ? 'bg-gray-50'
              : theme === 'dark'
              ? 'bg-gray-700'
              : 'bg-purple-100'
          }`}>
            <p className={`font-medium text-center ${
              theme === 'light'
                ? 'text-gray-800'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-800'
            }`}>
              "{bookTitle}"
            </p>
          </div>

          {/* Current Mood */}
          <div className="mb-6">
            <h3 className={`text-sm font-medium mb-3 ${
              theme === 'light'
                ? 'text-gray-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              What's your current mood? (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`p-3 rounded-lg text-left transition-all hover:scale-105 ${
                    selectedMood === mood.id
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
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mood.icon}</span>
                    <span className="text-sm font-medium">{mood.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reading Situation */}
          <div className="mb-6">
            <h3 className={`text-sm font-medium mb-3 ${
              theme === 'light'
                ? 'text-gray-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              When/where will you read this? (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {SITUATION_OPTIONS.map((situation) => (
                <button
                  key={situation.id}
                  onClick={() => setSituation(situation.id)}
                  className={`p-3 rounded-lg text-left transition-all hover:scale-105 ${
                    selectedSituation === situation.id
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
                  <div className="flex items-center gap-2">
                    {typeof situation.icon === 'string' ? (
                      <span className="text-lg">{situation.icon}</span>
                    ) : (
                      situation.icon
                    )}
                    <span className="text-sm font-medium">{situation.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reading Goal */}
          <div className="mb-6">
            <h3 className={`text-sm font-medium mb-3 ${
              theme === 'light'
                ? 'text-gray-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              What's your main goal? (Optional)
            </h3>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className={`w-full p-3 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  : theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                  : 'bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500'
              }`}
            >
              <option value="">Select your reading goal...</option>
              {GOAL_OPTIONS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </div>

          {/* Free Text Reason */}
          <div className="mb-6">
            <h3 className={`text-sm font-medium mb-3 ${
              theme === 'light'
                ? 'text-gray-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              Why did you save this book? (Optional)
            </h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., 'Need motivation for my new project', 'Recommended by a friend', 'Looks perfect for vacation reading'..."
              rows={3}
              className={`w-full p-3 rounded-lg border transition-colors resize-none ${
                theme === 'light'
                  ? 'bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  : theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                  : 'bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500'
              }`}
              maxLength={200}
            />
            <div className={`text-xs mt-1 ${
              theme === 'light'
                ? 'text-gray-500'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}>
              {reason.length}/200 characters
            </div>
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
              Skip
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
              {isSubmitting ? 'Saving...' : 'Save Context'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};