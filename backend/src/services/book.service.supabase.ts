import { supabase, Book } from '../lib/supabase';

export class BookService {
  /**
   * Get all books with optional filtering
   */
  async getAllBooks(filters?: {
    categories?: string[];
    themes?: string[];
    pace?: string;
    professions?: string[];
  }): Promise<Book[]> {
    try {
      let query = supabase.from('book').select('*');

      // Apply filters if provided
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

      if (error) {
        throw new Error(`Failed to fetch books: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllBooks:', error);
      throw error;
    }
  }

  /**
   * Get a book by ID
   */
  async getBookById(id: string): Promise<Book | null> {
    try {
      const { data, error } = await supabase
        .from('book')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Book not found
        }
        throw new Error(`Failed to fetch book: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getBookById:', error);
      throw error;
    }
  }

  /**
   * Search books by title or author
   */
  async searchBooks(query: string): Promise<Book[]> {
    try {
      const { data, error } = await supabase
        .from('book')
        .select('*')
        .or(`title.ilike.%${query}%, author.ilike.%${query}%`)
        .order('title');

      if (error) {
        throw new Error(`Failed to search books: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchBooks:', error);
      throw error;
    }
  }

  /**
   * Create a new book
   */
  async createBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    try {
      const { data, error } = await supabase
        .from('book')
        .insert([{
          ...bookData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create book: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createBook:', error);
      throw error;
    }
  }

  /**
   * Update a book
   */
  async updateBook(id: string, bookData: Partial<Omit<Book, 'id' | 'createdAt'>>): Promise<Book> {
    try {
      const { data, error } = await supabase
        .from('book')
        .update({
          ...bookData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update book: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateBook:', error);
      throw error;
    }
  }

  /**
   * Delete a book
   */
  async deleteBook(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('book')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete book: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteBook:', error);
      throw error;
    }
  }

  /**
   * Get unique values for filtering
   */
  async getFilterOptions(): Promise<{
    categories: string[];
    themes: string[];
    paces: string[];
    professions: string[];
  }> {
    try {
      const { data, error } = await supabase
        .from('book')
        .select('categories, themes, pace, professions');

      if (error) {
        throw new Error(`Failed to fetch filter options: ${error.message}`);
      }

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
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      throw error;
    }
  }

  /**
   * Get books by thread ID
   */
  async getBooksByThreadId(threadId: string): Promise<Book[]> {
    try {
      const { data, error } = await supabase
        .from('thread_books_book')
        .select(`
          book (*)
        `)
        .eq('threadId', threadId);

      if (error) {
        throw new Error(`Failed to fetch books for thread: ${error.message}`);
      }

      return data?.map((item: any) => item.book as Book).filter(Boolean) || [];
    } catch (error) {
      console.error('Error in getBooksByThreadId:', error);
      throw error;
    }
  }
} 