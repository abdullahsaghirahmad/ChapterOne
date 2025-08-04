import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ChatBubbleLeftIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import api from '../../services/api.supabase';
import { BookCard } from './BookCard';
import { CommentThread } from '../ui/CommentThread';
import { ThreadFollowButton } from '../ui/ThreadFollowButton';
import { normalizeTag } from './ThreadPage';
import { useTheme } from '../../contexts/ThemeContext';
import { Comment, CommentInput } from '../../types';

interface Thread {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  comments: number;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: {
    username: string;
  };
  books: {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
    description?: string;
    publishedYear?: string;
    pace?: string;
    tone?: string[];
    themes?: string[];
    rating?: number;
  }[];
}

export const ThreadDetailPage: React.FC = () => {
  const { theme } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    const fetchThreadDetails = async () => {
      try {
        setLoading(true);
        const threadData = await api.threads.getById(id!);
        console.log('Thread details:', threadData);
        
        if (!threadData) {
          setError('Thread not found');
          setLoading(false);
          return;
        }
        
        // Process the thread to ensure tags are properly formatted
        let processedTags = threadData.tags;
        
        // If tags is a string that looks like a stringified array, parse it
        if (typeof threadData.tags === 'string') {
          try {
            processedTags = JSON.parse(threadData.tags as any);
          } catch {
            // If parsing fails, split by comma
            processedTags = (threadData.tags as any).split(',').map((t: string) => t.trim());
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
        
        setThread({
          ...threadData,
          tags: processedTags,
          createdBy: threadData.createdBy ? { username: String(threadData.createdBy) } : undefined
        } as Thread);
        
        setLoading(false);
        
        // Load comments after thread is loaded
        setCommentsLoading(true);
        
        // Mock comments data - TODO: Replace with real API calls
        const mockComments: Comment[] = [
          {
            id: '1',
            threadId: id || '',
            userId: 'user1',
            content: "This is such a great recommendation! I've been looking for books exactly like this. Thanks for sharing!",
            upvotes: 12,
            isEdited: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            username: 'bookworm_jane',
            displayName: 'Jane Smith',
            avatarUrl: '',
            depth: 0,
            replyCount: 2
          },
          {
            id: '2',
            threadId: id || '',
            userId: 'user2',
            parentId: '1',
            content: "I completely agree! Have you read the sequel yet?",
            upvotes: 3,
            isEdited: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            username: 'reader_mike',
            displayName: 'Mike Johnson',
            avatarUrl: '',
            depth: 1,
            replyCount: 0
          },
          {
            id: '3',
            threadId: id || '',
            userId: 'user1',
            parentId: '1',
            content: "Not yet, but it's definitely on my reading list now!",
            upvotes: 1,
            isEdited: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            username: 'bookworm_jane',
            displayName: 'Jane Smith',
            avatarUrl: '',
            depth: 1,
            replyCount: 0
          },
          {
            id: '4',
            threadId: id || '',
            userId: 'user3',
            content: "Also check out the author's other works - they have a similar writing style that you might enjoy.",
            upvotes: 8,
            isEdited: true,
            editedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // edited 15 minutes ago
            username: 'lit_expert',
            displayName: 'Sarah Chen',
            avatarUrl: '',
            depth: 0,
            replyCount: 0
          }
        ];
        
        // Simulate API delay
        setTimeout(() => {
          setComments(mockComments);
          setCommentsLoading(false);
        }, 500);
        
      } catch (err) {
        console.error('Error fetching thread details:', err);
        setError('Failed to load thread details. Please try again later.');
        setLoading(false);
      }
    };

    if (id) {
      fetchThreadDetails();
    }
  }, [id]);

  const handleBack = () => {
    navigate('/threads');
  };

  const handleUpvote = async () => {
    if (!thread) return;
    
    try {
      const updatedThread = await api.threads.upvote(id!);
      setThread(prev => prev ? { ...prev, upvotes: updatedThread.upvotes } : null);
    } catch (err) {
      console.error('Error upvoting thread:', err);
      alert('Failed to upvote. Please try again.');
    }
  };

  // Comment handlers - TODO: Replace with real API calls
  const handleAddComment = async (input: CommentInput) => {
    console.log('Adding comment:', input);
    // Simulate API call
    const newComment: Comment = {
      id: Date.now().toString(),
      threadId: input.threadId,
      userId: 'current-user',
      parentId: input.parentId,
      content: input.content,
      upvotes: 0,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      username: 'you',
      displayName: 'You',
      avatarUrl: '',
      depth: input.parentId ? 1 : 0,
      replyCount: 0
    };
    
    setComments(prev => [...prev, newComment]);
    
    // Update thread comment count
    setThread(prev => prev ? { ...prev, comments: prev.comments + 1 } : null);
  };

  const handleEditComment = async (commentId: string, content: string) => {
    console.log('Editing comment:', commentId, content);
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, content, isEdited: true, editedAt: new Date().toISOString() }
        : comment
    ));
  };

  const handleDeleteComment = async (commentId: string) => {
    console.log('Deleting comment:', commentId);
    setComments(prev => prev.filter(comment => comment.id !== commentId));
    
    // Update thread comment count
    setThread(prev => prev ? { ...prev, comments: Math.max(0, prev.comments - 1) } : null);
  };

  const handleUpvoteComment = async (commentId: string) => {
    console.log('Upvoting comment:', commentId);
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, upvotes: comment.upvotes + 1 }
        : comment
    ));
  };

  if (loading) {
    return (
      <div className={`text-center py-8 transition-colors duration-300 ${
        theme === 'light'
          ? 'text-gray-600'
          : theme === 'dark'
          ? 'text-gray-300'
          : 'text-purple-600'
      }`}>
        Loading thread details...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 transition-colors duration-300 ${
        theme === 'light'
          ? 'text-red-500'
          : theme === 'dark'
          ? 'text-red-400'
          : 'text-pink-600'
      }`}>
        {error}
      </div>
    );
  }

  if (!thread) {
    return (
      <div className={`text-center py-8 transition-colors duration-300 ${
        theme === 'light'
          ? 'text-gray-600'
          : theme === 'dark'
          ? 'text-gray-300'
          : 'text-purple-600'
      }`}>
        Thread not found
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={handleBack}
        className={`flex items-center transition-all duration-300 hover:scale-105 ${
          theme === 'light'
            ? 'text-primary-600 hover:text-primary-800'
            : theme === 'dark'
            ? 'text-blue-400 hover:text-blue-300'
            : 'text-purple-600 hover:text-purple-800'
        }`}
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to threads
      </button>

      {/* Thread header */}
      <div className={`rounded-lg p-6 transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-white border border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
      }`}>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h1 className={`text-2xl font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-primary-900'
                : theme === 'dark'
                ? 'text-white'
                : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
            }`}>
              {thread.title}
            </h1>
            <div className="flex items-center gap-3">
              {/* Follow Button */}
              <ThreadFollowButton 
                threadId={thread.id}
                onFollowChange={(isFollowing, followerCount) => {
                  console.log(`Thread ${isFollowing ? 'followed' : 'unfollowed'}, ${followerCount} followers`);
                }}
                size="md"
                variant="default"
                showFollowerCount={true}
              />
              
              {/* Upvote Button */}
              <button
                onClick={handleUpvote}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                  theme === 'light'
                    ? 'text-primary-600 hover:bg-primary-50 hover:text-primary-700'
                    : theme === 'dark'
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    : 'text-purple-600 hover:bg-purple-100 hover:text-purple-700'
                }`}
              >
                <ArrowUpIcon className="w-5 h-5" />
                <span>{thread.upvotes}</span>
              </button>
            </div>
          </div>

          <p className={`transition-colors duration-300 ${
            theme === 'light'
              ? 'text-primary-600'
              : theme === 'dark'
              ? 'text-gray-300'
              : 'text-purple-600'
          }`}>
            {thread.description}
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            {thread.tags && thread.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-1 text-xs rounded-full transition-colors duration-300 ${
                  theme === 'light'
                    ? 'bg-primary-100 text-primary-700'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gradient-to-r from-pink-200 to-purple-200 text-purple-800'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className={`flex items-center justify-between text-sm mt-4 border-t pt-4 transition-colors duration-300 ${
            theme === 'light'
              ? 'text-primary-500 border-gray-200'
              : theme === 'dark'
              ? 'text-gray-400 border-gray-600'
              : 'text-purple-500 border-purple-200'
          }`}>
            <div className="flex items-center gap-2">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span>{thread.comments} comments</span>
            </div>
            <div>
              {thread.createdBy?.username && (
                <span>Posted by {thread.createdBy.username}</span>
              )}
              <span className="ml-4">
                {new Date(thread.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Books */}
      <div className="mt-8">
        <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
          theme === 'light'
            ? 'text-gray-900'
            : theme === 'dark'
            ? 'text-white'
            : 'text-purple-900'
        }`}>
          Related Books
        </h2>
        
        {thread.books && thread.books.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {thread.books.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                coverImage={book.coverImage || 'https://via.placeholder.com/150x225?text=No+Cover'}
                description={book.description || 'No description available'}
                pace={book.pace as 'Fast' | 'Moderate' | 'Slow' || 'Moderate'}
                tone={book.tone || []}
                themes={book.themes || []}
                isExternal={false}
              />
            ))}
          </div>
        ) : (
          <div className={`text-center py-8 transition-colors duration-300 ${
            theme === 'light'
              ? 'text-gray-600'
              : theme === 'dark'
              ? 'text-gray-300'
              : 'text-purple-600'
          }`}>
            No books associated with this thread
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className={`rounded-lg border transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-white border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200'
      }`}>
        <div className="p-6">
          <CommentThread
            threadId={thread.id}
            comments={comments}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onUpvoteComment={handleUpvoteComment}
            loading={commentsLoading}
          />
        </div>
      </div>
    </div>
  );
}; 