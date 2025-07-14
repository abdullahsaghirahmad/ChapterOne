import React, { useEffect, useState } from 'react';
import { SearchBar } from './SearchBar';
import { ThreadCard } from './ThreadCard';
import { BookCard } from './BookCard';
import { Book, Thread, Pace } from '../../types';
import api from '../../services/api.supabase';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { normalizeTag } from './ThreadPage'; // Import the normalizeTag function
import { useTheme } from '../../contexts/ThemeContext';

// Add interface for pace object
interface PaceObject {
  type: string;
  value: Pace;
}

export const HomePage = () => {
  const { theme } = useTheme();
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
        // Fetch threads from Supabase
        const threadsData = await api.threads.getAll();
        
        // Fetch books from Supabase
        const booksData = await api.books.getAll();
        
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
        
        // Select featured books from database - prioritize diverse categories and high ratings
        const featuredBooks = selectFeaturedBooks(booksData);
        
        setTrendingBooks(featuredBooks);
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

  // Function to select featured books from database
  const selectFeaturedBooks = (books: Book[]): Book[] => {
    if (!books || books.length === 0) return [];
    
    // Define preferred categories for featured books
    const preferredCategories = ['Science Fiction', 'Fantasy', 'Romance', 'Psychology', 'History', 'Business', 'Self-Help'];
    
    // Group books by category
    const booksByCategory = books.reduce((acc: { [key: string]: Book[] }, book) => {
      if (book.categories && book.categories.length > 0) {
        book.categories.forEach(category => {
          if (!acc[category]) acc[category] = [];
          acc[category].push(book);
        });
      }
      return acc;
    }, {});
    
    // Select best book from each preferred category
    const selectedBooks: Book[] = [];
    
    for (const category of preferredCategories) {
      if (booksByCategory[category] && booksByCategory[category].length > 0) {
        // Sort by rating (descending) and pick the top book
        const bestBook = booksByCategory[category].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
        if (bestBook && !selectedBooks.some(b => b.id === bestBook.id)) {
          selectedBooks.push(bestBook);
        }
      }
      
      // Stop when we have 4 books
      if (selectedBooks.length >= 4) break;
    }
    
    // If we don't have 4 books yet, fill with highest rated books
    if (selectedBooks.length < 4) {
      const remainingBooks = books
        .filter(book => !selectedBooks.some(selected => selected.id === book.id))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 4 - selectedBooks.length);
      
      selectedBooks.push(...remainingBooks);
    }
    
    return selectedBooks.slice(0, 4);
  };

  const handleSearch = async (query: string, searchType: string = 'all') => {
    // When searching, redirect to the Books page instead of filtering the featured books
    window.location.href = `/books?query=${encodeURIComponent(query)}&type=${searchType}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className={`text-4xl font-bold transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-900'
            : theme === 'dark'
            ? 'text-white'
            : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
        }`}>
          Discover Your Next Great Read
        </h1>
        <p className={`text-xl max-w-2xl mx-auto transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
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
          <div className={`mt-4 transition-colors duration-300 ${
            theme === 'light'
              ? 'text-red-500'
              : theme === 'dark'
              ? 'text-red-400'
              : 'text-pink-600'
          }`}>
            {error}
          </div>
        )}
      </section>

      {/* Featured Books */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${
            theme === 'light'
              ? 'text-primary-900'
              : theme === 'dark'
              ? 'text-white'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
          }`}>
            Featured Books
          </h2>
          <Link 
            to="/books" 
            className={`flex items-center space-x-1 transition-all duration-300 hover:scale-105 ${
              theme === 'light'
                ? 'text-primary-600 hover:text-primary-800'
                : theme === 'dark'
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-purple-600 hover:text-purple-800'
            }`}
          >
            <span>View All Books</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {trendingBooks.map((book) => (
            <BookCard key={book.id} {...book} />
          ))}
        </div>
      </section>

      {/* Popular Threads */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${
            theme === 'light'
              ? 'text-primary-900'
              : theme === 'dark'
              ? 'text-white'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
          }`}>
            Popular Threads
          </h2>
          {threads.length > visibleThreads && (
            <Link 
              to="/threads" 
              className={`flex items-center space-x-1 transition-all duration-300 hover:scale-105 ${
                theme === 'light'
                  ? 'text-primary-600 hover:text-primary-800'
                  : theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-purple-600 hover:text-purple-800'
              }`}
            >
              <span>View All</span>
              <ArrowRightIcon className="w-4 h-4" />
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