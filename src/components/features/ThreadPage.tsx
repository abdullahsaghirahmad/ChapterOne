import React, { useState, useEffect } from 'react';
import { ThreadCard } from './ThreadCard';
import { PlusIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

// Define Thread interface
interface Thread {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  comments: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  books?: any[];
}

export const ThreadPage = () => {
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadDescription, setNewThreadDescription] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch threads from API
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Thread[]>('http://localhost:3001/api/threads');
        console.log('Threads response:', response.data);
        setThreads(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching threads:', err);
        setError('Failed to load threads. Please try again later.');
        setLoading(false);
      }
    };

    fetchThreads();
  }, []);

  const handleSubmitThread = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post<Thread>('http://localhost:3001/api/threads', {
        title: newThreadTitle,
        description: newThreadDescription,
        tags: ['General', 'Books']
      });
      
      setThreads([...threads, response.data]);
      setShowNewThreadForm(false);
      setNewThreadTitle('');
      setNewThreadDescription('');
    } catch (err) {
      console.error('Error creating thread:', err);
      alert('Failed to create thread. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary-900">Book Recommendation Threads</h1>
        <button
          onClick={() => setShowNewThreadForm(true)}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Thread
        </button>
      </div>

      {/* New Thread Form */}
      {showNewThreadForm && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Start a New Thread</h2>
          <form onSubmit={handleSubmitThread} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-primary-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                className="input"
                placeholder="e.g., Books like The Midnight Library"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-primary-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={newThreadDescription}
                onChange={(e) => setNewThreadDescription(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Describe what you're looking for..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewThreadForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Thread
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && <div className="text-center py-8">Loading threads...</div>}
      {error && <div className="text-center py-8 text-red-500">{error}</div>}

      {/* Threads List */}
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          {threads.length > 0 ? (
            threads.map((thread) => (
              <div key={thread.id}>
                <ThreadCard
                  id={thread.id}
                  title={thread.title}
                  description={thread.description}
                  upvotes={thread.upvotes}
                  comments={thread.comments}
                  timestamp={new Date(thread.createdAt).toLocaleDateString()}
                  tags={thread.tags || []}
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8">
              No threads found. Be the first to create one!
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 