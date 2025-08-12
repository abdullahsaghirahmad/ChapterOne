import { supabase } from '../lib/supabase';
import { ThreadFollow } from '../types';

export class ThreadFollowService {
  /**
   * Check if user is following a specific thread
   */
  static async isFollowing(threadId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('thread_follows')
        .select('id')
        .eq('threadId', threadId)
        .eq('userId', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Follow a thread
   */
  static async followThread(threadId: string, userId: string): Promise<ThreadFollow | null> {
    try {
      const { data, error } = await supabase
        .from('thread_follows')
        .insert([
          {
            threadId,
            userId,
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error following thread:', error);
      throw error;
    }
  }

  /**
   * Unfollow a thread
   */
  static async unfollowThread(threadId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('thread_follows')
        .delete()
        .eq('threadId', threadId)
        .eq('userId', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error unfollowing thread:', error);
      throw error;
    }
  }

  /**
   * Get all threads followed by a user
   */
  static async getFollowedThreads(userId: string, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('thread_follows')
        .select(`
          id,
          createdAt,
          threadId
        `)
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get thread details separately to avoid complex nested queries
      const threadIds = data.map(follow => follow.threadId);
      
      const { data: threadsData, error: threadsError } = await supabase
        .from('thread')
        .select(`
          id,
          title,
          description,
          upvotes,
          comments,
          createdAt,
          updatedAt,
          createdById
        `)
        .in('id', threadIds);

      if (threadsError) {
        throw threadsError;
      }

      // Get user details for thread creators
      const creatorIds = threadsData?.map(thread => thread.createdById).filter(Boolean) || [];
      let usersData: any[] = [];
      
      if (creatorIds.length > 0) {
        const { data: userData, error: usersError } = await supabase
          .from('user')
          .select('id, username, displayName, avatarUrl')
          .in('id', creatorIds);
        
        if (!usersError) {
          usersData = userData || [];
        }
      }

      // Get thread books relationships
      const { data: threadBooksData } = await supabase
        .from('thread_books_book')
        .select('threadId, bookId')
        .in('threadId', threadIds);
      
      // Get book details if there are any relationships
      let booksData: any[] = [];
      if (threadBooksData && threadBooksData.length > 0) {
        const bookIds = Array.from(new Set(threadBooksData.map(tb => tb.bookId)));
        const { data: books } = await supabase
          .from('book')
          .select('id, title, author, imageUrl, isbn')
          .in('id', bookIds);
        booksData = books || [];
      }

      // Combine all data
      const result = data.map(follow => {
        const thread = threadsData?.find(t => t.id === follow.threadId);
        const creator = usersData.find(u => u.id === thread?.createdById);
        const threadBookRelations = threadBooksData?.filter(tb => tb.threadId === follow.threadId) || [];
        
        // Map book relations to actual book data
        const threadBooks = threadBookRelations.map(relation => {
          const book = booksData.find(b => b.id === relation.bookId);
          return {
            book: {
              id: book?.id || '',
              title: book?.title || '',
              author: book?.author || '',
              imageUrl: book?.imageUrl,
              isbn: book?.isbn
            }
          };
        });

        return {
          id: follow.id,
          createdAt: follow.createdAt,
          thread: {
            id: thread?.id || '',
            title: thread?.title || '',
            description: thread?.description || '',
            upvotes: thread?.upvotes || 0,
            comments: thread?.comments || 0,
            createdAt: thread?.createdAt || '',
            updatedAt: thread?.updatedAt || '',
            createdById: thread?.createdById || '',
            user: {
              username: creator?.username || '',
              displayName: creator?.displayName,
              avatarUrl: creator?.avatarUrl
            },
            threadBooks: threadBooks
          }
        };
      });

      return result;
    } catch (error) {
      console.error('Error fetching followed threads:', error);
      throw error;
    }
  }

  /**
   * Get follower count for a thread
   */
  static async getFollowerCount(threadId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('thread_follows')
        .select('*', { count: 'exact', head: true })
        .eq('threadId', threadId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting follower count:', error);
      return 0;
    }
  }

  /**
   * Get recent followers for a thread (for display)
   */
  static async getRecentFollowers(threadId: string, limit = 5) {
    try {
      const { data, error } = await supabase
        .from('thread_follows')
        .select(`
          id,
          createdAt,
          user:userId (
            id,
            username,
            displayName,
            avatarUrl
          )
        `)
        .eq('threadId', threadId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent followers:', error);
      return [];
    }
  }

  /**
   * Toggle follow status for a thread
   */
  static async toggleFollow(threadId: string, userId: string): Promise<boolean> {
    try {
      const isCurrentlyFollowing = await this.isFollowing(threadId, userId);
      
      if (isCurrentlyFollowing) {
        await this.unfollowThread(threadId, userId);
        return false;
      } else {
        await this.followThread(threadId, userId);
        return true;
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      throw error;
    }
  }
}