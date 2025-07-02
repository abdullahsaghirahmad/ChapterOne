import { supabase, Thread, Book } from '../lib/supabase';

export class ThreadService {
  /**
   * Get all threads with optional filtering
   */
  async getAllThreads(filters?: {
    tags?: string[];
    createdById?: string;
  }): Promise<Thread[]> {
    try {
      let query = supabase.from('thread').select('*');

      // Apply filters if provided
      if (filters) {
        if (filters.tags && filters.tags.length > 0) {
          query = query.overlaps('tags', filters.tags);
        }
        if (filters.createdById) {
          query = query.eq('createdById', filters.createdById);
        }
      }

      const { data, error } = await query.order('createdAt', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch threads: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllThreads:', error);
      throw error;
    }
  }

  /**
   * Get a thread by ID with its associated books
   */
  async getThreadById(id: string): Promise<(Thread & { books: Book[] }) | null> {
    try {
      // Get thread details
      const { data: threadData, error: threadError } = await supabase
        .from('thread')
        .select('*')
        .eq('id', id)
        .single();

      if (threadError) {
        if (threadError.code === 'PGRST116') {
          return null; // Thread not found
        }
        throw new Error(`Failed to fetch thread: ${threadError.message}`);
      }

      // Get associated books
      const { data: bookData, error: bookError } = await supabase
        .from('thread_books_book')
        .select(`
          book (*)
        `)
        .eq('threadId', id);

      if (bookError) {
        throw new Error(`Failed to fetch thread books: ${bookError.message}`);
      }

      const books = bookData?.map((item: any) => item.book as Book).filter(Boolean) || [];

      return {
        ...threadData,
        books
      };
    } catch (error) {
      console.error('Error in getThreadById:', error);
      throw error;
    }
  }

  /**
   * Create a new thread
   */
  async createThread(threadData: {
    title: string;
    description: string;
    tags?: string[];
    createdById?: string;
    bookIds?: string[];
  }): Promise<Thread & { books: Book[] }> {
    try {
      // Create the thread
      const { data: createdThread, error: threadError } = await supabase
        .from('thread')
        .insert([{
          title: threadData.title,
          description: threadData.description,
          tags: threadData.tags || [],
          createdById: threadData.createdById || null,
          upvotes: 0,
          comments: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }])
        .select()
        .single();

      if (threadError) {
        throw new Error(`Failed to create thread: ${threadError.message}`);
      }

      // Associate books if provided
      let books: Book[] = [];
      if (threadData.bookIds && threadData.bookIds.length > 0) {
        books = await this.addBooksToThread(createdThread.id, threadData.bookIds);
      }

      return {
        ...createdThread,
        books
      };
    } catch (error) {
      console.error('Error in createThread:', error);
      throw error;
    }
  }

  /**
   * Update a thread
   */
  async updateThread(id: string, threadData: {
    title?: string;
    description?: string;
    tags?: string[];
    upvotes?: number;
    comments?: number;
  }): Promise<Thread> {
    try {
      const { data, error } = await supabase
        .from('thread')
        .update({
          ...threadData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update thread: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateThread:', error);
      throw error;
    }
  }

  /**
   * Delete a thread
   */
  async deleteThread(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('thread')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete thread: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteThread:', error);
      throw error;
    }
  }

  /**
   * Add books to a thread
   */
  async addBooksToThread(threadId: string, bookIds: string[]): Promise<Book[]> {
    try {
      // Create thread-book relationships
      const relationships = bookIds.map(bookId => ({
        threadId,
        bookId,
        createdAt: new Date().toISOString()
      }));

      const { error: relationError } = await supabase
        .from('thread_books_book')
        .insert(relationships);

      if (relationError) {
        throw new Error(`Failed to add books to thread: ${relationError.message}`);
      }

      // Fetch and return the added books
      const { data: bookData, error: bookError } = await supabase
        .from('book')
        .select('*')
        .in('id', bookIds);

      if (bookError) {
        throw new Error(`Failed to fetch added books: ${bookError.message}`);
      }

      return bookData || [];
    } catch (error) {
      console.error('Error in addBooksToThread:', error);
      throw error;
    }
  }

  /**
   * Remove books from a thread
   */
  async removeBooksFromThread(threadId: string, bookIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('thread_books_book')
        .delete()
        .eq('threadId', threadId)
        .in('bookId', bookIds);

      if (error) {
        throw new Error(`Failed to remove books from thread: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in removeBooksFromThread:', error);
      throw error;
    }
  }

  /**
   * Search threads by title or description
   */
  async searchThreads(query: string): Promise<Thread[]> {
    try {
      const { data, error } = await supabase
        .from('thread')
        .select('*')
        .or(`title.ilike.%${query}%, description.ilike.%${query}%`)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(`Failed to search threads: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchThreads:', error);
      throw error;
    }
  }

  /**
   * Increment upvotes for a thread
   */
  async upvoteThread(threadId: string): Promise<Thread> {
    try {
      // First get current upvotes
      const { data: currentThread, error: fetchError } = await supabase
        .from('thread')
        .select('upvotes')
        .eq('id', threadId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch thread: ${fetchError.message}`);
      }

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

      if (error) {
        throw new Error(`Failed to upvote thread: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in upvoteThread:', error);
      throw error;
    }
  }

  /**
   * Get threads by user ID
   */
  async getThreadsByUserId(userId: string): Promise<Thread[]> {
    try {
      const { data, error } = await supabase
        .from('thread')
        .select('*')
        .eq('createdById', userId)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user threads: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getThreadsByUserId:', error);
      throw error;
    }
  }

  /**
   * Get unique tags for filtering
   */
  async getAllTags(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('thread')
        .select('tags');

      if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }

      const tags = new Set<string>();
      data?.forEach(thread => {
        thread.tags?.forEach((tag: string) => tags.add(tag));
      });

      return Array.from(tags).sort();
    } catch (error) {
      console.error('Error in getAllTags:', error);
      throw error;
    }
  }
} 