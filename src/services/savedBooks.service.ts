import { supabase } from '../lib/supabase';
import { SavedBook, SaveBookRequest, LibraryStats, ReadingStatus } from '../types';
import { requestDeduplicationService } from './requestDeduplication.service';

export class SavedBooksService {
  // Save a book to user's library
  static async saveBook(request: SaveBookRequest): Promise<SavedBook> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Must be logged in to save books');
    }

    const savedBookData = {
      user_id: user.id,
      book_id: request.bookId,
      book_data: request.bookData,
      status: 'want_to_read' as ReadingStatus,
      saved_reason: request.reason,
      saved_context: request.context,
    };

    const { data, error } = await supabase
      .from('saved_books')
      .insert(savedBookData)
      .select()
      .single();

    if (error) {
      // Handle duplicate saves gracefully
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Book already saved to your library');
      }
      throw new Error(`Failed to save book: ${error.message}`);
    }

    // Clear request deduplication cache to ensure fresh data on next check
    requestDeduplicationService.clear();

    return this.transformSavedBook(data);
  }

  // Remove a book from user's library
  static async unsaveBook(bookId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Must be logged in to unsave books');
    }

    const { error } = await supabase
      .from('saved_books')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId);

    if (error) {
      throw new Error(`Failed to unsave book: ${error.message}`);
    }

    // Clear request deduplication cache to ensure fresh data on next check
    requestDeduplicationService.clear();
  }

  // Check if a book is saved by the current user
  static async isBookSaved(bookId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const key = requestDeduplicationService.createKey('saved_books:check', { userId: user.id, bookId });
    
    return requestDeduplicationService.dedupe(key, async () => {
      const { data, error } = await supabase
        .from('saved_books')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle();

      if (error) {
        console.error('Error checking if book is saved:', error);
        return false;
      }

      return !!data;
    });
  }

  // Batch check if multiple books are saved by the current user
  static async areBooksSaved(bookIds: string[]): Promise<Record<string, boolean>> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return bookIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    const key = requestDeduplicationService.createKey('saved_books:batch_check', { 
      userId: user.id, 
      bookIds: bookIds.sort() 
    });
    
    return requestDeduplicationService.dedupe(key, async () => {
      const { data, error } = await supabase
        .from('saved_books')
        .select('book_id')
        .eq('user_id', user.id)
        .in('book_id', bookIds);

      if (error) {
        console.error('Error batch checking saved books:', error);
        return bookIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
      }

      const savedBookIds = new Set((data || []).map(item => item.book_id));
      return bookIds.reduce((acc, id) => ({ 
        ...acc, 
        [id]: savedBookIds.has(id) 
      }), {});
    });
  }

  // Get user's saved books by status
  static async getSavedBooks(status?: ReadingStatus): Promise<SavedBook[]> {
    // Try to get user with a retry mechanism for auth issues
    let user = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!user && attempts < maxAttempts) {
      attempts++;
      try {
        const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.log(`Auth error attempt ${attempts}:`, userError.message);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempts)); // Exponential backoff
            continue;
          }
          throw userError;
        }
        user = fetchedUser;
      } catch (error) {
        if (attempts >= maxAttempts) {
          throw new Error('Must be logged in to view saved books');
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempts));
      }
    }
    
    if (!user) {
      throw new Error('Must be logged in to view saved books');
    }

    let query = supabase
      .from('saved_books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get saved books: ${error.message}`);
    }

    return (data || []).map(this.transformSavedBook);
  }

  // Update reading status of a saved book
  static async updateReadingStatus(bookId: string, status: ReadingStatus): Promise<SavedBook> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Must be logged in to update reading status');
    }

    const { data, error } = await supabase
      .from('saved_books')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reading status: ${error.message}`);
    }

    return this.transformSavedBook(data);
  }

  // Add rating and notes after finishing a book
  static async addBookReview(bookId: string, rating?: number, notes?: string): Promise<SavedBook> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Must be logged in to add book reviews');
    }

    const updates: any = { updated_at: new Date().toISOString() };
    
    if (rating !== undefined) {
      updates.rating = rating;
    }
    
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from('saved_books')
      .update(updates)
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add book review: ${error.message}`);
    }

    return this.transformSavedBook(data);
  }

  // Get user's library statistics
  static async getLibraryStats(): Promise<LibraryStats> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Must be logged in to view library stats');
    }

    const { data, error } = await supabase
      .rpc('get_user_library_stats', { user_uuid: user.id });

    if (error) {
      throw new Error(`Failed to get library stats: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        totalBooks: 0,
        wantToRead: 0,
        currentlyReading: 0,
        finished: 0,
      };
    }

    const stats = data[0];
    return {
      totalBooks: parseInt(stats.total_books) || 0,
      wantToRead: parseInt(stats.want_to_read) || 0,
      currentlyReading: parseInt(stats.currently_reading) || 0,
      finished: parseInt(stats.finished) || 0,
    };
  }

  // Transform database row to SavedBook interface
  private static transformSavedBook(row: any): SavedBook {
    return {
      id: row.id,
      userId: row.user_id,
      bookId: row.book_id,
      bookData: row.book_data,
      status: row.status,
      savedReason: row.saved_reason,
      savedContext: row.saved_context,
      rating: row.rating,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Get recently saved books for recommendations
  static async getRecentlySaved(limit: number = 10): Promise<SavedBook[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('saved_books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting recently saved books:', error);
      return [];
    }

    return (data || []).map(this.transformSavedBook);
  }
}