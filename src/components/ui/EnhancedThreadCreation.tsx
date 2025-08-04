import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, TagIcon, BookOpenIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import api from '../../services/api.supabase';
import { Book } from '../../types';

interface EnhancedThreadCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (threadId: string) => void;
  prefilledBook?: Book | null;
  mode?: 'modal' | 'inline';
}

export const EnhancedThreadCreation: React.FC<EnhancedThreadCreationProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefilledBook,
  mode = 'modal'
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);

  // Auto-generate content when book is provided
  useEffect(() => {
    if (prefilledBook && !title && !description) {
      // Generate title suggestions
      const suggestions = [
        `What did you think of "${prefilledBook.title}"?`,
        `Discussion: ${prefilledBook.title} by ${prefilledBook.author}`,
        `Has anyone read "${prefilledBook.title}"?`,
        `Thoughts on ${prefilledBook.title}`,
        `Book review: ${prefilledBook.title}`
      ];
      setTitleSuggestions(suggestions);

      // Generate description based on book metadata
      let autoDescription = `Let's discuss "${prefilledBook.title}" by ${prefilledBook.author}.`;
      
      if (prefilledBook.description) {
        autoDescription += `\n\n${prefilledBook.description.slice(0, 200)}${prefilledBook.description.length > 200 ? '...' : ''}`;
      }
      
      autoDescription += '\n\nWhat are your thoughts? Did you enjoy it? Any favorite quotes or moments?';
      
      setDescription(autoDescription);

      // Auto-generate tags from book metadata
      const autoTags: string[] = [];
      
      if (prefilledBook.themes) {
        const themes = Array.isArray(prefilledBook.themes) 
          ? prefilledBook.themes.slice(0, 2) 
          : [prefilledBook.themes];
        themes.forEach(theme => {
          const themeStr = typeof theme === 'string' ? theme : (theme?.value || String(theme));
          if (themeStr && typeof themeStr === 'string') autoTags.push(themeStr);
        });
      }
      
      if (prefilledBook.pace) {
        const pace = typeof prefilledBook.pace === 'string' ? prefilledBook.pace : (prefilledBook.pace?.value || String(prefilledBook.pace));
        if (pace && typeof pace === 'string') autoTags.push(pace);
      }
      
      // Add generic book discussion tag
      autoTags.push('book-discussion');
      
      setTags(autoTags);
    }
  }, [prefilledBook, title, description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showAuthModal('signup');
      return;
    }
    
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const threadData = await api.threads.create({
        title: title.trim(),
        description: description.trim(),
        tags: tags.length > 0 ? tags : ['general'],
        bookIds: prefilledBook ? [prefilledBook.id!] : undefined
      });

      onSuccess(threadData.id);
      onClose();
      resetForm();
    } catch (err) {
      console.error('Error creating thread:', err);
      setError('Failed to create thread. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTags([]);
    setCustomTag('');
    setError(null);
    setTitleSuggestions([]);
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim()) && tags.length < 5) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUseSuggestion = (suggestion: string) => {
    setTitle(suggestion);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen && mode === 'modal') return null;

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            theme === 'light'
              ? 'bg-primary-100'
              : theme === 'dark'
              ? 'bg-gray-700'
              : 'bg-purple-100'
          }`}>
            <BookOpenIcon className={`w-6 h-6 ${
              theme === 'light'
                ? 'text-primary-600'
                : theme === 'dark'
                ? 'text-blue-400'
                : 'text-purple-600'
            }`} />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              {prefilledBook ? `Start Discussion: ${prefilledBook.title}` : 'Create New Thread'}
            </h2>
            {prefilledBook && (
              <p className={`text-sm ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-600'
              }`}>
                by {prefilledBook.author}
              </p>
            )}
          </div>
        </div>
        {mode === 'modal' && (
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'light'
                ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                : theme === 'dark'
                ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100'
            }`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Book Context */}
      {prefilledBook && (
        <div className={`flex gap-4 p-4 rounded-lg ${
          theme === 'light'
            ? 'bg-gray-50 border border-gray-200'
            : theme === 'dark'
            ? 'bg-gray-700 border border-gray-600'
            : 'bg-purple-50 border border-purple-200'
        }`}>
          <img
            src={prefilledBook.coverImage || '/api/placeholder/80/120'}
            alt={prefilledBook.title}
            className="w-16 h-24 object-cover rounded-lg shadow-sm"
          />
          <div className="flex-1">
            <h3 className={`font-medium ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              {prefilledBook.title}
            </h3>
            <p className={`text-sm ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-600'
            }`}>
              by {prefilledBook.author}
            </p>
            {prefilledBook.rating && (
              <p className={`text-xs mt-1 ${
                theme === 'light'
                  ? 'text-gray-500'
                  : theme === 'dark'
                  ? 'text-gray-500'
                  : 'text-purple-500'
              }`}>
                ⭐ {prefilledBook.rating} rating
              </p>
            )}
          </div>
        </div>
      )}

      {/* Title Suggestions */}
      {titleSuggestions.length > 0 && !title && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LightBulbIcon className={`w-4 h-4 ${
              theme === 'light'
                ? 'text-yellow-500'
                : theme === 'dark'
                ? 'text-yellow-400'
                : 'text-yellow-600'
            }`} />
            <span className={`text-sm font-medium ${
              theme === 'light'
                ? 'text-gray-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              Suggested titles:
            </span>
          </div>
          <div className="space-y-2">
            {titleSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleUseSuggestion(suggestion)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  theme === 'light'
                    ? 'bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                    : theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                    : 'bg-white border-purple-200 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <span className={`text-sm ${
                  theme === 'light'
                    ? 'text-gray-700'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-700'
                }`}>
                  {suggestion}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'light'
              ? 'text-gray-700'
              : theme === 'dark'
              ? 'text-gray-300'
              : 'text-purple-700'
          }`}>
            Discussion Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this discussion about?"
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              theme === 'light'
                ? 'bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                : theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                : 'bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500'
            }`}
            maxLength={120}
          />
          <div className={`text-xs mt-1 ${
            theme === 'light'
              ? 'text-gray-500'
              : theme === 'dark'
              ? 'text-gray-400'
              : 'text-purple-500'
          }`}>
            {title.length}/120 characters
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'light'
              ? 'text-gray-700'
              : theme === 'dark'
              ? 'text-gray-300'
              : 'text-purple-700'
          }`}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share your thoughts, questions, or insights about this book..."
            rows={6}
            className={`w-full px-4 py-3 rounded-lg border transition-colors resize-none ${
              theme === 'light'
                ? 'bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                : theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                : 'bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500'
            }`}
            maxLength={2000}
          />
          <div className={`text-xs mt-1 ${
            theme === 'light'
              ? 'text-gray-500'
              : theme === 'dark'
              ? 'text-gray-400'
              : 'text-purple-500'
          }`}>
            {description.length}/2000 characters
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TagIcon className={`w-4 h-4 ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-600'
            }`} />
            <label className={`text-sm font-medium ${
              theme === 'light'
                ? 'text-gray-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              Tags {prefilledBook && '(auto-generated from book)'}
            </label>
          </div>
          
          {/* Existing Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full ${
                    theme === 'light'
                      ? 'bg-primary-100 text-primary-700'
                      : theme === 'dark'
                      ? 'bg-blue-900/50 text-blue-300'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add Custom Tag */}
          {tags.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                placeholder="Add a tag..."
                className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                  theme === 'light'
                    ? 'bg-white border-gray-300 focus:border-primary-500'
                    : theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                    : 'bg-white border-purple-300 focus:border-purple-500'
                }`}
                maxLength={20}
              />
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!customTag.trim() || tags.includes(customTag.trim())}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 disabled:opacity-50'
                    : theme === 'dark'
                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500 disabled:opacity-50'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50'
                }`}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className={`p-3 rounded-lg ${
            theme === 'light'
              ? 'bg-red-50 text-red-700'
              : theme === 'dark'
              ? 'bg-red-900/20 text-red-300'
              : 'bg-red-50 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {mode === 'modal' && (
            <button
              type="button"
              onClick={handleClose}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
              }`}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !title.trim() || !description.trim()}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:hover:scale-100 ${
              theme === 'light'
                ? 'bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white'
                : theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-400 text-white'
            }`}
          >
            {isLoading ? 'Creating...' : `${prefilledBook ? 'Start Discussion' : 'Create Thread'}`}
          </button>
        </div>
      </form>
    </div>
  );

  if (mode === 'inline') {
    return content;
  }

  // Modal mode - Use Portal to render at document root level
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
          {content}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};