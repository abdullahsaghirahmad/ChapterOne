import { Router } from 'express';
import { ThreadService } from '../services/thread.service.supabase';

const router = Router();
const threadService = new ThreadService();

/**
 * GET /api/threads
 * Get all threads with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { tags, createdById, search } = req.query;

    // Handle search functionality
    if (search && typeof search === 'string') {
      const threads = await threadService.searchThreads(search);
      return res.json(threads);
    }

    // Prepare filters
    const filters: any = {};
    
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags];
    }
    
    if (createdById && typeof createdById === 'string') {
      filters.createdById = createdById;
    }

    const threads = await threadService.getAllThreads(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(threads);
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ 
      message: 'Failed to fetch threads', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/threads/:id
 * Get a specific thread by ID with associated books
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const thread = await threadService.getThreadById(id);
    
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    res.json(thread);
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ 
      message: 'Failed to fetch thread', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/threads
 * Create a new thread
 */
router.post('/', async (req, res) => {
  try {
    const threadData = req.body;
    
    // Validate required fields
    if (!threadData.title || !threadData.description) {
      return res.status(400).json({ 
        message: 'Title and description are required' 
      });
    }

    const thread = await threadService.createThread(threadData);
    res.status(201).json(thread);
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ 
      message: 'Failed to create thread', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * PUT /api/threads/:id
 * Update a thread
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const threadData = req.body;
    
    const thread = await threadService.updateThread(id, threadData);
    res.json(thread);
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ 
      message: 'Failed to update thread', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * DELETE /api/threads/:id
 * Delete a thread
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await threadService.deleteThread(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ 
      message: 'Failed to delete thread', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/threads/:id/upvote
 * Upvote a thread
 */
router.post('/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    const thread = await threadService.upvoteThread(id);
    res.json(thread);
  } catch (error) {
    console.error('Error upvoting thread:', error);
    res.status(500).json({ 
      message: 'Failed to upvote thread', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/threads/:id/books
 * Add books to a thread
 */
router.post('/:id/books', async (req, res) => {
  try {
    const { id } = req.params;
    const { bookIds } = req.body;
    
    if (!bookIds || !Array.isArray(bookIds)) {
      return res.status(400).json({ 
        message: 'bookIds array is required' 
      });
    }

    const books = await threadService.addBooksToThread(id, bookIds);
    res.json(books);
  } catch (error) {
    console.error('Error adding books to thread:', error);
    res.status(500).json({ 
      message: 'Failed to add books to thread', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * DELETE /api/threads/:id/books
 * Remove books from a thread
 */
router.delete('/:id/books', async (req, res) => {
  try {
    const { id } = req.params;
    const { bookIds } = req.body;
    
    if (!bookIds || !Array.isArray(bookIds)) {
      return res.status(400).json({ 
        message: 'bookIds array is required' 
      });
    }

    await threadService.removeBooksFromThread(id, bookIds);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing books from thread:', error);
    res.status(500).json({ 
      message: 'Failed to remove books from thread', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/threads/search/:query
 * Search threads by title or description
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const threads = await threadService.searchThreads(query);
    res.json(threads);
  } catch (error) {
    console.error('Error searching threads:', error);
    res.status(500).json({ 
      message: 'Failed to search threads', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/threads/user/:userId
 * Get threads by user ID
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const threads = await threadService.getThreadsByUserId(userId);
    res.json(threads);
  } catch (error) {
    console.error('Error fetching user threads:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user threads', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/threads/tags/all
 * Get all unique tags
 */
router.get('/tags/all', async (req, res) => {
  try {
    const tags = await threadService.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ 
      message: 'Failed to fetch tags', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router; 