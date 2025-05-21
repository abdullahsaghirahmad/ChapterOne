import React, { useEffect, useState } from 'react';
import { BookCard } from './BookCard';
import { SearchBar } from './SearchBar';
import { api } from '../../services/api';
import { Book, Pace } from '../../types';
import { Switch } from '../ui/Switch';

interface PaceObject {
  type: string;
  value: Pace;
}

export const BooksPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeExternal, setIncludeExternal] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  const fetchBooks = async (
    query: string = '', 
    type: string = 'all', 
    useExternal: boolean = includeExternal
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      let data: Book[];
      
      if (query) {
        data = await api.searchBooks(query, type, useExternal);
      } else {
        data = await api.getBooks(useExternal);
      }

      // Helper function to extract value from object or return the value itself
      const getValue = (item: any): string => {
        if (typeof item === 'object' && item !== null && 'value' in item) {
          return item.value;
        }
        return item;
      };
      
      // Process the books to handle all fields that might be objects
      const processedData = data.map(book => ({
        ...book,
        pace: (getValue(book.pace) || "Moderate") as Pace,
        tone: Array.isArray(book.tone)
          ? book.tone.map(t => getValue(t))
          : [],
        themes: Array.isArray(book.themes)
          ? book.themes.map(t => getValue(t))
          : [],
      }));
      
      console.log('Processed books:', processedData);
      setBooks(processedData);
    } catch (err) {
      console.error('Error processing books:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks(searchQuery, searchType, includeExternal);
  }, [includeExternal]); // Re-fetch when external toggle changes

  const handleSearch = (query: string, type?: string) => {
    setSearchQuery(query);
    if (type) {
      setSearchType(type);
    }
    fetchBooks(query, type || searchType);
  };

  if (loading) {
    return <div className="text-center py-10">Loading books...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-primary-900">Book Recommendations</h1>
        <p className="text-lg text-primary-600">
          Discover books that match your interests and reading style
        </p>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto">
        <SearchBar 
          onSearch={handleSearch}
          onMoodSelect={(mood) => handleSearch(mood, 'mood')}
        />
        
        {/* External API Toggle */}
        <div className="flex items-center justify-end mt-4 space-x-2">
          <span className="text-sm text-gray-600">Include more books from external sources</span>
          <Switch
            checked={includeExternal}
            onChange={() => setIncludeExternal(prev => !prev)}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="text-center py-10">No books found. Try a different search or enable external sources.</div>
      ) : (
        <div>
          {/* Search result info */}
          <div className="mb-4 text-sm text-gray-600">
            Found {books.length} books {searchQuery ? `for "${searchQuery}"` : ''}
            {searchType !== 'all' && ` by ${searchType}`}
          </div>
          
          {/* Books grid */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {books.map((book) => (
              <BookCard
                key={book.id}
                {...book}
                isExternal={book.isExternal || false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 