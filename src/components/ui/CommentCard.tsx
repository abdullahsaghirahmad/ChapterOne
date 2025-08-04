import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpIcon, 
  ChatBubbleLeftIcon, 
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { Comment, User } from '../../types';

interface CommentCardProps {
  comment: Comment;
  onReply?: (commentId: string) => void;
  onUpvote?: (commentId: string) => void;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
  showReplyButton?: boolean;
  isReplying?: boolean;
  className?: string;
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onReply,
  onUpvote,
  onEdit,
  onDelete,
  showReplyButton = true,
  isReplying = false,
  className = ''
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [hasUpvoted, setHasUpvoted] = useState(false); // TODO: Get from API
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwnComment = user?.id === comment.userId;
  const isReply = comment.depth === 1;

  // Auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpvote) {
      onUpvote(comment.id);
      setHasUpvoted(!hasUpvoted);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowActions(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== comment.content && onEdit) {
      onEdit(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this comment?')) {
      onDelete(comment.id);
    }
    setShowActions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Create user object for avatar
  const commentUser: Pick<User, 'displayName' | 'username' | 'avatarUrl'> = {
    displayName: comment.displayName || comment.username || 'Anonymous',
    username: comment.username || 'anonymous',
    avatarUrl: comment.avatarUrl || ''
  };

  return (
    <div 
      className={`group relative ${isReply ? 'ml-8' : ''} ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Reply connector line */}
      {isReply && (
        <div className={`absolute -left-6 top-6 w-4 h-4 border-l-2 border-b-2 rounded-bl-lg ${
          theme === 'light'
            ? 'border-gray-200'
            : theme === 'dark'
            ? 'border-gray-600'
            : 'border-purple-200'
        }`} />
      )}

      <div className={`p-4 rounded-lg transition-all duration-200 ${
        theme === 'light'
          ? 'bg-white border border-gray-100 hover:border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border border-gray-700 hover:border-gray-600'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-100 hover:border-purple-200'
      }`}>
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <UserAvatar 
              user={commentUser} 
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`font-medium text-sm ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  {commentUser.displayName}
                </span>
                <span className={`text-xs ${
                  theme === 'light'
                    ? 'text-gray-500'
                    : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-purple-500'
                }`}>
                  @{commentUser.username}
                </span>
                {comment.isEdited && (
                  <span className={`text-xs ${
                    theme === 'light'
                      ? 'text-gray-400'
                      : theme === 'dark'
                      ? 'text-gray-500'
                      : 'text-purple-400'
                  }`}>
                    (edited)
                  </span>
                )}
              </div>
              <span className={`text-xs ${
                theme === 'light'
                  ? 'text-gray-500'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`}>
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          {(showActions || showActions) && (
            <div className="flex items-center space-x-1">
              {isOwnComment && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className={`p-1 rounded-lg transition-colors ${
                      theme === 'light'
                        ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        : theme === 'dark'
                        ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                        : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    <EllipsisHorizontalIcon className="w-4 h-4" />
                  </button>
                  
                  {showActions && (
                    <div className={`absolute right-0 top-6 w-32 rounded-lg shadow-lg z-10 overflow-hidden ${
                      theme === 'light'
                        ? 'bg-white border border-gray-200'
                        : theme === 'dark'
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-purple-50 border border-purple-200'
                    }`}>
                      <button
                        onClick={handleEdit}
                        className={`w-full flex items-center px-3 py-2 text-xs transition-colors ${
                          theme === 'light'
                            ? 'text-gray-700 hover:bg-gray-100'
                            : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        <PencilIcon className="w-3 h-3 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className={`w-full flex items-center px-3 py-2 text-xs transition-colors ${
                          theme === 'light'
                            ? 'text-red-700 hover:bg-red-50'
                            : theme === 'dark'
                            ? 'text-red-400 hover:bg-red-900/30'
                            : 'text-red-700 hover:bg-red-100'
                        }`}
                      >
                        <TrashIcon className="w-3 h-3 mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="mb-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`w-full px-3 py-2 border rounded-lg resize-none transition-colors ${
                  theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-200'
                    : theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-200'
                    : 'bg-purple-50 border-purple-300 text-purple-900 focus:border-purple-500 focus:ring-purple-200'
                } focus:outline-none focus:ring-2`}
                placeholder="Write your comment..."
                maxLength={2000}
                rows={3}
              />
              <div className="flex justify-between items-center">
                <span className={`text-xs ${
                  theme === 'light'
                    ? 'text-gray-500'
                    : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-purple-500'
                }`}>
                  {editContent.length}/2000
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      theme === 'light'
                        ? 'text-gray-600 hover:bg-gray-100'
                        : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-700'
                        : 'text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || editContent.trim() === comment.content}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      editContent.trim() && editContent.trim() !== comment.content
                        ? theme === 'light'
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : theme === 'dark'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
              theme === 'light'
                ? 'text-gray-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              {comment.content}
            </p>
          )}
        </div>

        {/* Comment Actions */}
        {!isEditing && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Upvote */}
              <button
                onClick={handleUpvote}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-all duration-200 hover:scale-105 ${
                  hasUpvoted
                    ? theme === 'light'
                      ? 'text-primary-600 bg-primary-50'
                      : theme === 'dark'
                      ? 'text-blue-400 bg-blue-900/30'
                      : 'text-purple-600 bg-purple-100'
                    : theme === 'light'
                    ? 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                    : theme === 'dark'
                    ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30'
                    : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100'
                }`}
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span className="text-xs font-medium">{comment.upvotes}</span>
              </button>

              {/* Reply */}
              {showReplyButton && !isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-all duration-200 hover:scale-105 ${
                    isReplying
                      ? theme === 'light'
                        ? 'text-primary-600 bg-primary-50'
                        : theme === 'dark'
                        ? 'text-blue-400 bg-blue-900/30'
                        : 'text-purple-600 bg-purple-100'
                      : theme === 'light'
                      ? 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30'
                      : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Reply</span>
                </button>
              )}
            </div>

            {/* Reply count for parent comments */}
            {!isReply && comment.replyCount && comment.replyCount > 0 && (
              <span className={`text-xs ${
                theme === 'light'
                  ? 'text-gray-500'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`}>
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 