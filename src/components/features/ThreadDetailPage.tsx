import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ChatBubbleLeftIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { BookCard } from './BookCard';

interface Thread {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  comments: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
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

interface UpvoteResponse {
  upvotes: number;
}

export const ThreadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchThreadDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Thread>(`http://localhost:3001/api/threads/${id}`);
        console.log('Thread details:', response.data);
        setThread(response.data);
        setLoading(false);
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
      const response = await axios.post<UpvoteResponse>(`http://localhost:3001/api/threads/${id}/upvote`);
      setThread(prev => prev ? { ...prev, upvotes: response.data.upvotes } : null);
    } catch (err) {
      console.error('Error upvoting thread:', err);
      alert('Failed to upvote. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading thread details...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!thread) {
    return <div className="text-center py-8">Thread not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center text-primary-600 hover:text-primary-800"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to threads
      </button>

      {/* Thread header */}
      <div className="card">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between">
            <h1 className="text-2xl font-bold text-primary-900">{thread.title}</h1>
            <button
              onClick={handleUpvote}
              className="btn btn-icon"
            >
              <ArrowUpIcon className="w-5 h-5" />
              <span>{thread.upvotes}</span>
            </button>
          </div>

          <p className="text-primary-600">{thread.description}</p>

          <div className="flex flex-wrap gap-2 mt-2">
            {thread.tags && thread.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-primary-500 mt-4 border-t pt-4">
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
        <h2 className="text-xl font-semibold mb-4">Related Books</h2>
        
        {thread.books && thread.books.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {thread.books.map((book) => (
              <BookCard
                key={book.id}
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
          <div className="text-center py-8">
            No books associated with this thread
          </div>
        )}
      </div>
    </div>
  );
}; 