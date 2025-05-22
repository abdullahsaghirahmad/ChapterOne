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
      const processedData = data.map(book => {
        // Process any string arrays that might be returned as JSON strings or objects
        let processedThemes = book.themes;
        let processedTone = book.tone;
        let processedProfessions = book.professions;
        
        // Handle if themes is a string (potentially a stringified array)
        if (typeof book.themes === 'string') {
          try {
            // Try to parse as JSON
            processedThemes = JSON.parse(book.themes as string);
          } catch (e) {
            // If not valid JSON, split by comma
            processedThemes = (book.themes as string).split(',').map((t: string) => t.trim());
          }
        }
        
        // Process arrays that might have objects or JSON strings
        if (Array.isArray(processedThemes)) {
          processedThemes = processedThemes.map((t: any) => {
            if (typeof t === 'object' && t !== null && 'value' in t) {
              return t.value as string;
            }
            // Convert any string that looks like "{""value"": ""theme""}" to "theme"
            if (typeof t === 'string' && t.includes('{""') && t.includes('""value""')) {
              try {
                // Try to extract value between quotes
                const match = t.match(/""value""\s*:\s*""([^""]+)""/);
                if (match && match[1]) {
                  return match[1];
                }
              } catch (e) {
                // Just return original if extraction fails
              }
            }
            return t;
          });
        }

        // Handle tone the same way
        if (typeof book.tone === 'string') {
          try {
            processedTone = JSON.parse(book.tone as string);
          } catch (e) {
            processedTone = (book.tone as string).split(',').map((t: string) => t.trim());
          }
        }
        
        if (Array.isArray(processedTone)) {
          processedTone = processedTone.map((t: any) => {
            if (typeof t === 'object' && t !== null && 'value' in t) {
              return t.value as string;
            }
            if (typeof t === 'string' && t.includes('{""') && t.includes('""value""')) {
              try {
                const match = t.match(/""value""\s*:\s*""([^""]+)""/);
                if (match && match[1]) {
                  return match[1];
                }
              } catch (e) {
                // Just return original if extraction fails
              }
            }
            return t;
          });
        }
        
        // Handle professions the same way
        if (typeof book.professions === 'string') {
          try {
            processedProfessions = JSON.parse(book.professions as string);
          } catch (e) {
            processedProfessions = (book.professions as string).split(',').map((p: string) => p.trim());
          }
        }
        
        if (Array.isArray(processedProfessions)) {
          processedProfessions = processedProfessions.map((p: any) => {
            if (typeof p === 'object' && p !== null && 'value' in p) {
              return p.value as string;
            }
            if (typeof p === 'string' && p.includes('{""') && p.includes('""value""')) {
              try {
                const match = p.match(/""value""\s*:\s*""([^""]+)""/);
                if (match && match[1]) {
                  return match[1];
                }
              } catch (e) {
                // Just return original if extraction fails
              }
            }
            return p;
          });
        }
        
        // Return processed book data with clean fields
        return {
          ...book,
          pace: (typeof book.pace === 'object' && book.pace !== null && 'value' in (book.pace as any) 
            ? (book.pace as any).value
            : (book.pace || "Moderate")) as Pace,
          tone: processedTone || [],
          themes: processedThemes || [],
          professions: processedProfessions || []
        };
      });
      
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