import { supabase } from '../lib/supabase';
import { Book, Thread } from '../types';

// Authentication functions
export const auth = {
  async signUp(email: string, password: string, username: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          ...metadata
        }
      }
    });
    
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async updateProfile(updates: any) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });
    if (error) throw error;
    return data;
  },

  async signInWithOAuth(provider: 'google' | 'github' | 'facebook' | 'twitter' | 'discord' | 'linkedin_oidc') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  }
};

// Book functions
export const books = {
  async getAll(filters?: {
    categories?: string[];
    themes?: string[];
    pace?: string;
    professions?: string[];
  }): Promise<Book[]> {
    let query = supabase.from('book').select('*');

    if (filters) {
      if (filters.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories);
      }
      if (filters.themes && filters.themes.length > 0) {
        query = query.overlaps('themes', filters.themes);
      }
      if (filters.pace) {
        query = query.eq('pace', filters.pace);
      }
      if (filters.professions && filters.professions.length > 0) {
        query = query.overlaps('professions', filters.professions);
      }
    }

    const { data, error } = await query.order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Book | null> {
    const { data, error } = await supabase
      .from('book')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  async search(query: string): Promise<Book[]> {
    const { data, error } = await supabase
      .from('book')
      .select('*')
      .or(`title.ilike.%${query}%, author.ilike.%${query}%`)
      .order('title');
    
    if (error) throw error;
    return data || [];
  },

  async create(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    const { data, error } = await supabase
      .from('book')
      .insert([{
        ...bookData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Book>): Promise<Book> {
    const { data, error } = await supabase
      .from('book')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('book')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getFilterOptions(): Promise<{
    categories: string[];
    themes: string[];
    paces: string[];
    professions: string[];
  }> {
    const { data, error } = await supabase
      .from('book')
      .select('categories, themes, pace, professions');

    if (error) throw error;

    const categories = new Set<string>();
    const themes = new Set<string>();
    const paces = new Set<string>();
    const professions = new Set<string>();

    data?.forEach(book => {
      book.categories?.forEach((cat: string) => categories.add(cat));
      book.themes?.forEach((theme: string) => themes.add(theme));
      if (book.pace) paces.add(book.pace);
      book.professions?.forEach((prof: string) => professions.add(prof));
    });

    return {
      categories: Array.from(categories).sort(),
      themes: Array.from(themes).sort(),
      paces: Array.from(paces).sort(),
      professions: Array.from(professions).sort()
    };
  }
};

// Thread functions
export const threads = {
  async getAll(filters?: {
    tags?: string[];
    createdById?: string;
  }): Promise<Thread[]> {
    let query = supabase.from('thread').select('*');

    if (filters) {
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.createdById) {
        query = query.eq('createdById', filters.createdById);
      }
    }

    const { data, error } = await query.order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<(Thread & { books: Book[] }) | null> {
    // Get thread details
    const { data: threadData, error: threadError } = await supabase
      .from('thread')
      .select('*')
      .eq('id', id)
      .single();

    if (threadError) {
      if (threadError.code === 'PGRST116') return null; // Not found
      throw threadError;
    }

    // Get associated books
    const { data: bookData, error: bookError } = await supabase
      .from('thread_books_book')
      .select(`
        book (*)
      `)
      .eq('threadId', id);

    if (bookError) throw bookError;

    const books = bookData?.map((item: any) => item.book).filter(Boolean) || [];

    return {
      ...threadData,
      books
    };
  },

  async create(threadData: {
    title: string;
    description: string;
    tags?: string[];
    bookIds?: string[];
  }): Promise<Thread & { books: Book[] }> {
    const user = await auth.getCurrentUser();
    
    // Create the thread
    const { data: createdThread, error: threadError } = await supabase
      .from('thread')
      .insert([{
        title: threadData.title,
        description: threadData.description,
        tags: threadData.tags || [],
        createdById: user?.id || null,
        upvotes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (threadError) throw threadError;

    // Associate books if provided
    let books: Book[] = [];
    if (threadData.bookIds && threadData.bookIds.length > 0) {
      const relationships = threadData.bookIds.map(bookId => ({
        threadId: createdThread.id,
        bookId,
        createdAt: new Date().toISOString()
      }));

      const { error: relationError } = await supabase
        .from('thread_books_book')
        .insert(relationships);

      if (relationError) throw relationError;

      // Fetch the books
      const { data: bookData, error: bookError } = await supabase
        .from('book')
        .select('*')
        .in('id', threadData.bookIds);

      if (bookError) throw bookError;
      books = bookData || [];
    }

    return {
      ...createdThread,
      books
    };
  },

  async update(id: string, updates: Partial<Thread>): Promise<Thread> {
    const { data, error } = await supabase
      .from('thread')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('thread')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async search(query: string): Promise<Thread[]> {
    const { data, error } = await supabase
      .from('thread')
      .select('*')
      .or(`title.ilike.%${query}%, description.ilike.%${query}%`)
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async upvote(threadId: string): Promise<Thread> {
    // Get current upvotes
    const { data: currentThread, error: fetchError } = await supabase
      .from('thread')
      .select('upvotes')
      .eq('id', threadId)
      .single();

    if (fetchError) throw fetchError;

    // Increment upvotes
    const { data, error } = await supabase
      .from('thread')
      .update({
        upvotes: (currentThread.upvotes || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', threadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addBooks(threadId: string, bookIds: string[]): Promise<Book[]> {
    const relationships = bookIds.map(bookId => ({
      threadId,
      bookId,
      createdAt: new Date().toISOString()
    }));

    const { error: relationError } = await supabase
      .from('thread_books_book')
      .insert(relationships);

    if (relationError) throw relationError;

    // Fetch and return the added books
    const { data: bookData, error: bookError } = await supabase
      .from('book')
      .select('*')
      .in('id', bookIds);

    if (bookError) throw bookError;
    return bookData || [];
  },

  async removeBooks(threadId: string, bookIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('thread_books_book')
      .delete()
      .eq('threadId', threadId)
      .in('bookId', bookIds);
    
    if (error) throw error;
  },

  async getAllTags(): Promise<string[]> {
    const { data, error } = await supabase
      .from('thread')
      .select('tags');

    if (error) throw error;

    const tags = new Set<string>();
    data?.forEach(thread => {
      thread.tags?.forEach((tag: string) => tags.add(tag));
    });

    return Array.from(tags).sort();
  }
};

// Export everything as default API object
const api = {
  auth,
  books,
  threads
};

export default api; 