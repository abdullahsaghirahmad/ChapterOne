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

// Helper function to normalize tag data - extract it to reuse in other components too
export const normalizeTag = (tag: any): string => {
  if (!tag) return '';
  
  // Handle object with value property
  if (typeof tag === 'object' && tag !== null && 'value' in tag) {
    return tag.value;
  }
  
  // Handle stringified object format like {""value"": ""tag""}
  if (typeof tag === 'string') {
    if (tag.includes('{""') && tag.includes('""value""')) {
      try {
        const match = tag.match(/""value""\s*:\s*""([^""]+)""/);
        if (match && match[1]) {
          return match[1];
        }
      } catch (e) {
        // Just return the original if extraction fails
      }
    }
    
    // Also try regular JSON parsing if it looks like an object
    if (tag.startsWith('{') && tag.endsWith('}')) {
      try {
        const parsed = JSON.parse(tag);
        if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          return parsed.value;
        }
      } catch (e) {
        // Parsing failed, continue with other methods
      }
    }
  }
  
  // If it's just a string or other type, return its string representation
  return String(tag);
};

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
        
        // Process the threads to ensure tags are properly formatted
        const processedThreads = response.data.map(thread => {
          // Process tags to ensure they're an array of strings
          let processedTags = thread.tags;
          
          // If tags is a string that looks like a stringified array, parse it
          if (typeof thread.tags === 'string') {
            try {
              processedTags = JSON.parse(thread.tags as any);
            } catch {
              // If parsing fails, split by comma
              processedTags = (thread.tags as any).split(',').map((t: string) => t.trim());
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
          
          return {
            ...thread,
            tags: processedTags
          };
        });
        
        setThreads(processedThreads);
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
      
      // Make sure to process the new thread's tags too
      const newThread = {
        ...response.data,
        tags: Array.isArray(response.data.tags) 
          ? response.data.tags.map(normalizeTag) 
          : []
      };
      
      setThreads([...threads, newThread]);
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