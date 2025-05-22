import React, { useEffect, useState } from 'react';
import { SearchBar } from './SearchBar';
import { ThreadCard } from './ThreadCard';
import { BookCard } from './BookCard';
import { Book, Thread, Pace } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { normalizeTag } from './ThreadPage'; // Import the normalizeTag function

// Add interface for pace object
interface PaceObject {
  type: string;
  value: Pace;
}

export const HomePage = () => {
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleBooks, setVisibleBooks] = useState(4); // Show 4 books initially
  const [visibleThreads, setVisibleThreads] = useState(4); // Show 4 threads initially

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [books, threadsData] = await Promise.all([
          api.getBooks(true),  // Include external data for trending books
          api.getThreads()
        ]);
        
        // Make sure all books have the required fields
        const processedBooks = books.map(book => ({
          ...book,
          description: book.description || book.reviewSnippet || "No description available",
          pace: (typeof book.pace === 'object' && book.pace !== null
            ? (book.pace as { value: string }).value || "Moderate"
            : (book.pace || "Moderate")) as Pace,
          tone: Array.isArray(book.tone)
            ? book.tone.map(t => typeof t === 'object' && t !== null ? (t as { value: string }).value : t)
            : [],
          themes: Array.isArray(book.themes)
            ? book.themes.map(t => typeof t === 'object' && t !== null ? (t as { value: string }).value : t)
            : [],
        }));
        
        // Process threads to match ThreadCard component props
        const processedThreads = threadsData.map(thread => {
          // Process tags to ensure they're properly formatted
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
            tags: processedTags,
            timestamp: new Date(thread.createdAt).toLocaleDateString()
          };
        });
        
        setTrendingBooks(processedBooks);
        setThreads(processedThreads);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = async (query: string, searchType: string = 'all') => {
    try {
      const results = await api.searchBooks(query, searchType, true);
      // Apply the same processing to search results
      const processedResults = results.map(book => ({
        ...book,
        description: book.description || book.reviewSnippet || "No description available",
        pace: typeof book.pace === 'object' ? (book.pace as PaceObject).value : (book.pace || "Moderate"),
      }));
      
      if (processedResults.length > 0) {
        setTrendingBooks(processedResults);
        setVisibleBooks(4); // Reset visible books when searching
      } else {
        // If no results, show a message or keep existing books
        setError(`No books found for "${query}". Try a different search.`);
        setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
      }
    } catch (err) {
      setError('Error searching for books. Please try again.');
      setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary-900">
          Discover Your Next Great Read
        </h1>
        <p className="text-xl text-primary-600 max-w-2xl mx-auto">
          Get personalized book recommendations based on your mood, interests, and reading style
        </p>
        <div className="max-w-3xl mx-auto">
          <SearchBar 
            onSearch={handleSearch}
            onMoodSelect={(mood) => handleSearch(mood, 'mood')}
          />
        </div>
        
        {/* Search error message */}
        {error && (
          <div className="text-red-500 mt-4">{error}</div>
        )}
      </section>

      {/* Trending Books */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary-900">Trending Now</h2>
          {trendingBooks.length > visibleBooks && (
            <Link 
              to="/books" 
              className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
            >
              View All <ArrowRightIcon className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {trendingBooks.slice(0, visibleBooks).map((book) => (
            <BookCard key={book.id} {...book} />
          ))}
        </div>
        {trendingBooks.length > visibleBooks && (
          <div className="text-center mt-6">
            <button
              onClick={() => setVisibleBooks(prev => Math.min(prev + 4, trendingBooks.length))}
              className="btn btn-secondary"
            >
              Show More Books
            </button>
          </div>
        )}
      </section>

      {/* Popular Threads */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary-900">Popular Threads</h2>
          {threads.length > visibleThreads && (
            <Link 
              to="/threads" 
              className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
            >
              View All <ArrowRightIcon className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {threads.slice(0, visibleThreads).map((thread) => (
            <ThreadCard
              key={thread.id}
              id={thread.id}
              title={thread.title}
              description={thread.description}
              upvotes={thread.upvotes}
              comments={thread.comments}
              timestamp={thread.timestamp || new Date(thread.createdAt).toLocaleDateString()}
              tags={thread.tags}
            />
          ))}
        </div>
        {threads.length > visibleThreads && (
          <div className="text-center mt-6">
            <button
              onClick={() => setVisibleThreads(prev => Math.min(prev + 4, threads.length))}
              className="btn btn-secondary"
            >
              Show More Threads
            </button>
          </div>
        )}
      </section>
    </div>
  );
}; 