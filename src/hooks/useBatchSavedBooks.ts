/**
 * Hook for batch checking saved book status
 * Prevents N+1 queries by batching requests
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SavedBooksService } from '../services/savedBooks.service';

interface UseBatchSavedBooksReturn {
  savedStatuses: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  checkBooks: (bookIds: string[]) => Promise<void>;
  isBookSaved: (bookId: string) => boolean;
}

export const useBatchSavedBooks = (): UseBatchSavedBooksReturn => {
  const { user } = useAuth();
  const [savedStatuses, setSavedStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Batch check saved status for multiple books
   */
  const checkBooks = useCallback(async (bookIds: string[]): Promise<void> => {
    if (!user?.id || bookIds.length === 0) {
      return;
    }

    // Filter out books we already know about
    const unknownBookIds = bookIds.filter(id => !(id in savedStatuses));
    
    if (unknownBookIds.length === 0) {
      return; // All books already checked
    }

    try {
      setLoading(true);
      setError(null);
      
      const statuses = await SavedBooksService.areBooksSaved(unknownBookIds);
      
      setSavedStatuses(prev => ({
        ...prev,
        ...statuses
      }));
      
      console.log('[BATCH_SAVED_BOOKS] Checked', unknownBookIds.length, 'books');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check saved books');
      console.error('[BATCH_SAVED_BOOKS] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, savedStatuses]);

  /**
   * Check if a specific book is saved
   */
  const isBookSaved = useCallback((bookId: string): boolean => {
    return savedStatuses[bookId] ?? false;
  }, [savedStatuses]);

  /**
   * Clear saved statuses when user changes
   */
  useEffect(() => {
    if (!user?.id) {
      setSavedStatuses({});
      setError(null);
    }
  }, [user?.id]);

  return {
    savedStatuses,
    loading,
    error,
    checkBooks,
    isBookSaved
  };
};