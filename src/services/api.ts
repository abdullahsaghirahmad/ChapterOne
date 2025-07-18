import { Book, Thread, User } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// API functions
export const api = {
  // Books
  getBooks: async (includeExternal: boolean = false): Promise<Book[]> => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('book')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching books:', error);
      throw error;
    }
  },

  getBookById: async (id: string, includeExternal: boolean = false): Promise<Book | undefined> => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('book')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching book:', error);
      throw error;
    }
  },

  searchBooks: async (
    query: string, 
    searchType: string = 'all',
    includeExternal: boolean = true,
    limit: number = 100
  ): Promise<Book[]> => {
    try {
      console.log('API: Searching for:', query);
      
      // Use the new QueryRouterService for intelligent search routing
      const { QueryRouterService } = await import('./queryRouter.service');
      const queryRouter = new QueryRouterService();
      
      const result = await queryRouter.search(query);
      
      console.log(`API: ${result.searchMethod} search returned ${result.books.length} books (${result.queryType} query, ${result.processingTime}ms)`);
      return result.books;
    } catch (error) {
      console.error('QueryRouter search failed:', error);
      
      // Fallback to direct supabase search
      const { supabase } = await import('../lib/supabase');
      const { data, error: supabaseError } = await supabase
        .from('book')
        .select('*')
        .or(`title.ilike.%${query}%, author.ilike.%${query}%`)
        .order('title')
        .limit(limit);
      
      if (supabaseError) throw supabaseError;
      console.log('API: Fallback search returned', data?.length || 0, 'books');
      return data || [];
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