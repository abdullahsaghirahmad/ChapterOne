/**
 * Books Cache Service
 * Provides cached access to book data to prevent duplicate API calls
 */

import { Book } from '../types';
import api from './api.supabase';
import { supabase } from '../lib/supabase';

interface CacheEntry {
  books: Book[];
  timestamp: number;
  filters?: any;
}

class BooksCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  /**
   * Get essential book data for homepage (optimized payload)
   */
  async getHomepageBooks(): Promise<Book[]> {
    const key = 'homepage_essential';
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[BOOKS_CACHE] Using cached homepage books');
      return cached.books;
    }

    console.log('[BOOKS_CACHE] Fetching homepage books with minimal payload');
    
    // Fetch books for homepage with reasonable limit
    const { data, error } = await supabase
      .from('book')
      .select('*')
      .order('rating', { ascending: false })
      .limit(50); // Restore: 50 books for better recommendation quality

    if (error) throw error;
    
    const books = (data || []) as Book[];
    this.cache.set(key, {
      books,
      timestamp: Date.now()
    });

    return books;
  }

  /**
   * Get all books with optional filters, using cache
   */
  async getAll(filters?: {
    categories?: string[];
    themes?: string[];
    pace?: string;
    professions?: string[];
    includeExternal?: boolean;
  }): Promise<Book[]> {
    const key = this.createKey(filters);
    const cached = this.cache.get(key);

    // Return cached if valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[BOOKS_CACHE] Using cached books:', key);
      return cached.books;
    }

    // Fetch fresh data
    console.log('[BOOKS_CACHE] Fetching fresh books:', key);
    const books = await api.books.getAll(filters);
    
    // Cache the result
    this.cache.set(key, {
      books,
      timestamp: Date.now(),
      filters
    });

    return books;
  }

  /**
   * Get featured books (limit 4, highest rated from diverse categories)
   */
  async getFeatured(): Promise<Book[]> {
    const key = 'featured:4';
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[BOOKS_CACHE] Using cached featured books');
      return cached.books;
    }

    console.log('[BOOKS_CACHE] Generating fresh featured books');
    const allBooks = await this.getHomepageBooks(); // Use optimized query
    const featured = this.selectFeaturedBooks(allBooks);
    
    this.cache.set(key, {
      books: featured,
      timestamp: Date.now()
    });

    return featured;
  }

  /**
   * Select featured books from all books using smart algorithm
   */
  private selectFeaturedBooks(books: Book[]): Book[] {
    if (!books || books.length === 0) return [];
    
    // Define preferred categories for featured books
    const preferredCategories = [
      'Science Fiction', 'Fantasy', 'Romance', 'Psychology', 
      'History', 'Business', 'Self-Help', 'Fiction', 'Mystery'
    ];
    
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
        const bestBook = booksByCategory[category]
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
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
  }

  /**
   * Create cache key from filters
   */
  private createKey(filters?: any): string {
    if (!filters) return 'all';
    return JSON.stringify(filters, Object.keys(filters).sort());
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const booksCacheService = new BooksCacheService();