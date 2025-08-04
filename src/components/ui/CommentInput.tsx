import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { User, CommentInput as CommentInputType } from '../../types';

interface CommentInputProps {
  threadId: string;
  parentId?: string;
  placeholder?: string;
  onSubmit: (input: CommentInputType) => Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  threadId,
  parentId,
  placeholder = "Write a comment...",
  onSubmit,
  onCancel,
  showCancel = false,
  autoFocus = false,
  className = ''
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReply = Boolean(parentId);
  const maxLength = 2000;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        threadId,
        content: content.trim(),
        parentId
      });
      setContent('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  const handleCancel = () => {
    setContent('');
    if (onCancel) {
      onCancel();
    }
  };

  // Create user object for avatar
  const currentUser: Pick<User, 'displayName' | 'username' | 'avatarUrl'> | null = user ? {
    displayName: user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || '',
    username: user.user_metadata?.username || user.email?.split('@')[0] || '',
    avatarUrl: user.user_metadata?.avatar_url || ''
  } : null;

  if (!user || !currentUser) {
    return (
      <div className={`p-4 rounded-lg text-center ${
        theme === 'light'
          ? 'bg-gray-50 text-gray-600'
          : theme === 'dark'
          ? 'bg-gray-800 text-gray-400'
          : 'bg-purple-50 text-purple-600'
      }`}>
        Please sign in to comment
      </div>
    );
  }

  return (
    <div className={`${isReply ? 'ml-8' : ''} ${className}`}>
      <div className={`p-4 rounded-lg border transition-all duration-200 ${
        theme === 'light'
          ? 'bg-white border-gray-200 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-900/30'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100'
      }`}>
        <div className="flex space-x-3">
          {/* User Avatar */}
          <UserAvatar 
            user={currentUser} 
            size="sm"
            className="flex-shrink-0 mt-1"
          />

          {/* Input Area */}
          <div className="flex-1 space-y-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={isReply ? 2 : 3}
              className={`w-full px-0 py-0 border-none resize-none transition-colors placeholder-opacity-60 ${
                theme === 'light'
                  ? 'bg-transparent text-gray-900 placeholder-gray-500'
                  : theme === 'dark'
                  ? 'bg-transparent text-white placeholder-gray-400'
                  : 'bg-transparent text-purple-900 placeholder-purple-500'
              } focus:outline-none focus:ring-0`}
              style={{ 
                minHeight: isReply ? '2.5rem' : '3.5rem',
                maxHeight: '12rem' 
              }}
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Character count */}
                <span className={`text-xs ${
                  content.length > maxLength * 0.9
                    ? 'text-red-500'
                    : theme === 'light'
                    ? 'text-gray-500'
                    : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-purple-500'
                }`}>
                  {content.length}/{maxLength}
                </span>

                {/* Keyboard hint */}
                {content.trim() && (
                  <span className={`text-xs ${
                    theme === 'light'
                      ? 'text-gray-400'
                      : theme === 'dark'
                      ? 'text-gray-500'
                      : 'text-purple-400'
                  }`}>
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to post
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Cancel button */}
                {showCancel && (
                  <button
                    onClick={handleCancel}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
                      theme === 'light'
                        ? 'text-gray-600 hover:bg-gray-100'
                        : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-700'
                        : 'text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    Cancel
                  </button>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || isSubmitting || content.length > maxLength}
                  className={`flex items-center space-x-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
                    content.trim() && !isSubmitting && content.length <= maxLength
                      ? theme === 'light'
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : theme === 'dark'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-4 h-4" />
                      <span>{isReply ? 'Reply' : 'Comment'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reply indicator */}
      {isReply && (
        <div className={`absolute -left-6 top-6 w-4 h-4 border-l-2 border-b-2 rounded-bl-lg ${
          theme === 'light'
            ? 'border-gray-200'
            : theme === 'dark'
            ? 'border-gray-600'
            : 'border-purple-200'
        }`} />
      )}
    </div>
  );
}; 