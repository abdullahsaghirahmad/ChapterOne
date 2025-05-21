import React, { useEffect, useState } from 'react';
import { SearchBar } from './SearchBar';
import { ThreadCard } from './ThreadCard';
import { BookCard } from './BookCard';
import { Book, Thread, Pace } from '../../types';
import { api } from '../../services/api';

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
        const processedThreads = threadsData.map(thread => ({
          ...thread,
          // Convert createdAt to timestamp format
          timestamp: new Date(thread.createdAt).toLocaleDateString()
        }));
        
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
      } else {
        // If no results, show a message or keep existing books
        setError(`No books found for "${query}". Try a different search.`);
        setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
      }
    } catch (err) {
      console.error('Error searching books:', err);
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
        <h2 className="text-2xl font-bold text-primary-900 mb-6">Trending Now</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {trendingBooks.map((book) => (
            <BookCard key={book.id} {...book} />
          ))}
        </div>
      </section>

      {/* Popular Threads */}
      <section>
        <h2 className="text-2xl font-bold text-primary-900 mb-6">Popular Threads</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {threads.map((thread) => (
            <div key={thread.id}>
              <ThreadCard
                id={thread.id}
                title={thread.title}
                description={thread.description}
                upvotes={thread.upvotes}
                comments={thread.comments}
                timestamp={thread.timestamp || new Date(thread.createdAt).toLocaleDateString()}
                tags={thread.tags || []}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}; 