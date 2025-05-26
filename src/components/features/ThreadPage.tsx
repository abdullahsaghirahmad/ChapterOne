import React, { useState, useEffect } from 'react';
import { ThreadCard } from './ThreadCard';
import { PlusIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';

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
    // Remove curly braces and quotes to extract clean tag names
    let cleanTag = tag;
    
    // Handle malformed JSON like "{\"finance\"" or "\"economics\"" or "\"investing\"}"
    if (cleanTag.includes('{') || cleanTag.includes('}') || cleanTag.includes('"')) {
      // Remove all JSON formatting characters
      cleanTag = cleanTag
        .replace(/[{}]/g, '') // Remove curly braces
        .replace(/\\"/g, '') // Remove escaped quotes
        .replace(/"/g, '') // Remove regular quotes
        .trim();
    }
    
    // If it's still empty or just whitespace, return empty string
    if (!cleanTag || cleanTag.trim() === '') {
      return '';
    }
    
    return cleanTag;
  }
  
  // If it's just a string or other type, return its string representation
  return String(tag);
};

export const ThreadPage = () => {
  const { theme } = useTheme();
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
        <h1 className={`text-2xl font-bold transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-900'
            : theme === 'dark'
            ? 'text-white'
            : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
        }`}>
          Book Recommendation Threads
        </h1>
        <button
          onClick={() => setShowNewThreadForm(true)}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
            theme === 'light'
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
          }`}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Thread
        </button>
      </div>

      {/* New Thread Form */}
      {showNewThreadForm && (
        <div className={`rounded-lg p-6 transition-colors duration-300 ${
          theme === 'light'
            ? 'bg-white border border-gray-200'
            : theme === 'dark'
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
            theme === 'light'
              ? 'text-gray-900'
              : theme === 'dark'
              ? 'text-white'
              : 'text-purple-900'
          }`}>
            Start a New Thread
          </h2>
          <form onSubmit={handleSubmitThread} className="space-y-4">
            <div>
              <label htmlFor="title" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                Title
              </label>
              <input
                type="text"
                id="title"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 ${
                  theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-200'
                    : theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-200'
                    : 'bg-purple-50 border-purple-300 text-purple-900 focus:border-purple-500 focus:ring-purple-200'
                }`}
                placeholder="e.g., Books like The Midnight Library"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                Description
              </label>
              <textarea
                id="description"
                value={newThreadDescription}
                onChange={(e) => setNewThreadDescription(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg min-h-[100px] transition-colors duration-300 focus:outline-none focus:ring-2 ${
                  theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-200'
                    : theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-200'
                    : 'bg-purple-50 border-purple-300 text-purple-900 focus:border-purple-500 focus:ring-purple-200'
                }`}
                placeholder="Describe what you're looking for..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewThreadForm(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                  theme === 'light'
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : theme === 'dark'
                    ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    : 'bg-purple-200 hover:bg-purple-300 text-purple-700'
                }`}
              >
                Cancel
              </button>
              <button type="submit" className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                theme === 'light'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
              }`}>
                Create Thread
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div className={`text-center py-8 transition-colors duration-300 ${
          theme === 'light'
            ? 'text-gray-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          Loading threads...
        </div>
      )}
      {error && (
        <div className={`text-center py-8 transition-colors duration-300 ${
          theme === 'light'
            ? 'text-red-500'
            : theme === 'dark'
            ? 'text-red-400'
            : 'text-pink-600'
        }`}>
          {error}
        </div>
      )}

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
            <div className={`col-span-2 text-center py-8 transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-600'
            }`}>
              No threads found. Be the first to create one!
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 