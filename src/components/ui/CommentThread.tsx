import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { Comment, CommentInput } from '../../types';
import { CommentCard } from './CommentCard';
import { CommentInput as CommentInputComponent } from './CommentInput';

interface ThreadedComment extends Comment {
  replies: Comment[];
}

interface CommentThreadProps {
  threadId: string;
  comments: Comment[];
  onAddComment: (input: CommentInput) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onUpvoteComment: (commentId: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  threadId,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onUpvoteComment,
  loading = false,
  className = ''
}) => {
  const { theme } = useTheme();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [threadedComments, setThreadedComments] = useState<ThreadedComment[]>([]);

  // Organize comments into threaded structure
  useEffect(() => {
    const organizeComments = () => {
      const parentComments = comments.filter(comment => !comment.parentId);
      const replies = comments.filter(comment => comment.parentId);
      
      const threaded: ThreadedComment[] = parentComments.map(parent => ({
        ...parent,
        replies: replies
          .filter(reply => reply.parentId === parent.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }));
      
      // Sort parent comments by creation date (newest first)
      threaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setThreadedComments(threaded);
    };

    organizeComments();
  }, [comments]);

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleSubmitReply = async (input: CommentInput) => {
    try {
      await onAddComment(input);
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const totalComments = comments.length;

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className={`h-6 w-32 rounded animate-pulse ${
            theme === 'light'
              ? 'bg-gray-200'
              : theme === 'dark'
              ? 'bg-gray-700'
              : 'bg-purple-200'
          }`} />
        </div>

        {/* Comment Input Skeleton */}
        <div className={`p-4 rounded-lg border ${
          theme === 'light'
            ? 'bg-gray-50 border-gray-200'
            : theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex space-x-3">
            <div className={`w-8 h-8 rounded-full animate-pulse ${
              theme === 'light'
                ? 'bg-gray-300'
                : theme === 'dark'
                ? 'bg-gray-600'
                : 'bg-purple-300'
            }`} />
            <div className="flex-1 space-y-2">
              <div className={`h-20 rounded animate-pulse ${
                theme === 'light'
                  ? 'bg-gray-200'
                  : theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-purple-200'
              }`} />
              <div className="flex justify-between">
                <div className={`h-4 w-20 rounded animate-pulse ${
                  theme === 'light'
                    ? 'bg-gray-200'
                    : theme === 'dark'
                    ? 'bg-gray-700'
                    : 'bg-purple-200'
                }`} />
                <div className={`h-8 w-20 rounded animate-pulse ${
                  theme === 'light'
                    ? 'bg-gray-300'
                    : theme === 'dark'
                    ? 'bg-gray-600'
                    : 'bg-purple-300'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Comment Skeletons */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              theme === 'light'
                ? 'bg-gray-50'
                : theme === 'dark'
                ? 'bg-gray-800'
                : 'bg-purple-50'
            }`}
          >
            <div className="flex space-x-3">
              <div className={`w-8 h-8 rounded-full animate-pulse ${
                theme === 'light'
                  ? 'bg-gray-300'
                  : theme === 'dark'
                  ? 'bg-gray-600'
                  : 'bg-purple-300'
              }`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-32 rounded animate-pulse ${
                  theme === 'light'
                    ? 'bg-gray-200'
                    : theme === 'dark'
                    ? 'bg-gray-700'
                    : 'bg-purple-200'
                }`} />
                <div className={`h-16 rounded animate-pulse ${
                  theme === 'light'
                    ? 'bg-gray-200'
                    : theme === 'dark'
                    ? 'bg-gray-700'
                    : 'bg-purple-200'
                }`} />
                <div className="flex space-x-4">
                  <div className={`h-6 w-12 rounded animate-pulse ${
                    theme === 'light'
                      ? 'bg-gray-200'
                      : theme === 'dark'
                      ? 'bg-gray-700'
                      : 'bg-purple-200'
                  }`} />
                  <div className={`h-6 w-16 rounded animate-pulse ${
                    theme === 'light'
                      ? 'bg-gray-200'
                      : theme === 'dark'
                      ? 'bg-gray-700'
                      : 'bg-purple-200'
                  }`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center space-x-2 ${
          theme === 'light'
            ? 'text-gray-700'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-700'
        }`}>
          <ChatBubbleLeftIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            {totalComments === 0 ? 'Comments' : `${totalComments} ${totalComments === 1 ? 'Comment' : 'Comments'}`}
          </h3>
        </div>
      </div>

      {/* Main Comment Input */}
      <CommentInputComponent
        threadId={threadId}
        onSubmit={onAddComment}
        placeholder="Share your thoughts about this thread..."
      />

      {/* Comments List */}
      <div className="space-y-4">
        {threadedComments.length === 0 ? (
          /* Empty State */
          <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
            theme === 'light'
              ? 'border-gray-300 bg-gray-50'
              : theme === 'dark'
              ? 'border-gray-700 bg-gray-800'
              : 'border-purple-300 bg-gradient-to-br from-pink-50 to-purple-50'
          }`}>
            <ChatBubbleLeftIcon className={`w-12 h-12 mx-auto mb-4 ${
              theme === 'light'
                ? 'text-gray-400'
                : theme === 'dark'
                ? 'text-gray-500'
                : 'text-purple-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Start the conversation
            </h3>
            <p className={`text-sm ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-600'
            }`}>
              Be the first to share your thoughts about this thread
            </p>
          </div>
        ) : (
          threadedComments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Parent Comment */}
              <CommentCard
                comment={comment}
                onReply={handleReply}
                onUpvote={onUpvoteComment}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                isReplying={replyingTo === comment.id}
                showReplyButton={true}
              />

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-8 mt-3">
                  <CommentInputComponent
                    threadId={threadId}
                    parentId={comment.id}
                    onSubmit={handleSubmitReply}
                    onCancel={handleCancelReply}
                    showCancel={true}
                    autoFocus={true}
                    placeholder={`Reply to ${comment.displayName || comment.username}...`}
                  />
                </div>
              )}

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="space-y-3 mt-4">
                  {comment.replies.map((reply) => (
                    <CommentCard
                      key={reply.id}
                      comment={reply}
                      onUpvote={onUpvoteComment}
                      onEdit={onEditComment}
                      onDelete={onDeleteComment}
                      showReplyButton={false}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Comments Footer */}
      {threadedComments.length > 0 && (
        <div className={`text-center pt-6 border-t ${
          theme === 'light'
            ? 'border-gray-200 text-gray-500'
            : theme === 'dark'
            ? 'border-gray-700 text-gray-400'
            : 'border-purple-200 text-purple-500'
        }`}>
          <p className="text-sm">
            {totalComments} {totalComments === 1 ? 'comment' : 'comments'} in this discussion
          </p>
        </div>
      )}
    </div>
  );
};