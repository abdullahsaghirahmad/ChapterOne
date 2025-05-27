import { Book, Thread, User } from '../types';

const API_BASE_URL = 'http://localhost:3101/api';

// API functions
export const api = {
  // Books
  getBooks: async (includeExternal: boolean = false): Promise<Book[]> => {
    const url = includeExternal 
      ? `${API_BASE_URL}/books?external=true`
      : `${API_BASE_URL}/books`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch books');
    }
    return response.json();
  },

  getBookById: async (id: string, includeExternal: boolean = false): Promise<Book | undefined> => {
    const url = includeExternal 
      ? `${API_BASE_URL}/books/${id}?external=true`
      : `${API_BASE_URL}/books/${id}`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch book');
    }
    return response.json();
  },

  searchBooks: async (
    query: string, 
    searchType: string = 'all',
    includeExternal: boolean = true,
    limit: number = 100
  ): Promise<Book[]> => {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('external', includeExternal.toString());
    
    if (searchType && searchType !== 'all') {
      params.append('searchType', searchType);
    }
    
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    const url = `${API_BASE_URL}/books/search?${params.toString()}`;
    console.log('Search URL:', url);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to search books: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  // Threads
  getThreads: async (): Promise<Thread[]> => {
    const response = await fetch(`${API_BASE_URL}/threads`);
    if (!response.ok) {
      throw new Error('Failed to fetch threads');
    }
    return response.json();
  },

  getThreadById: async (id: string): Promise<Thread | undefined> => {
    const response = await fetch(`${API_BASE_URL}/threads/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch thread');
    }
    return response.json();
  },

  createThread: async (thread: Omit<Thread, 'id' | 'upvotes' | 'comments' | 'timestamp'>): Promise<Thread> => {
    const response = await fetch(`${API_BASE_URL}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(thread),
    });
    if (!response.ok) {
      throw new Error('Failed to create thread');
    }
    return response.json();
  },

  // User preferences
  getUserPreferences: async (userId: string): Promise<User['readingPreferences']> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/preferences`);
    if (!response.ok) {
      throw new Error('Failed to fetch user preferences');
    }
    return response.json();
  }
}; 