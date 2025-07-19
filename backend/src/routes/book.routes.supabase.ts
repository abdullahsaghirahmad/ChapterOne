import { Router } from 'express';
import { BookService } from '../services/book.service.supabase';

const router = Router();
const bookService = new BookService();
const LOG_PREFIX = '[BOOK_ROUTES]';

/**
 * GET /api/books
 * Get all books with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { categories, themes, pace, professions, search } = req.query;

    // Handle search functionality with LLM enhancement
    if (search && typeof search === 'string') {
      console.log('[BOOK_ROUTES] Processing search request:', search);
      const books = await bookService.searchBooksEnhanced(search);
      return res.json(books);
    }

    // Prepare filters
    const filters: any = {};
    
    if (categories) {
      filters.categories = Array.isArray(categories) ? categories : [categories];
    }
    
    if (themes) {
      filters.themes = Array.isArray(themes) ? themes : [themes];
    }
    
    if (pace && typeof pace === 'string') {
      filters.pace = pace;
    }
    
    if (professions) {
      filters.professions = Array.isArray(professions) ? professions : [professions];
    }

    const books = await bookService.getAllBooks(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ 
      message: 'Failed to fetch books', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/books/filters/options
 * Get available filter options
 */
router.get('/filters/options', async (req, res) => {
  try {
    const options = await bookService.getFilterOptions();
    res.json(options);
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ 
      message: 'Failed to fetch filter options', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/books/search?query=...&external=true/false
 * Search books with query parameters (supports external API integration)
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.query as string || req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Check if we should include results from external API
    const fetchExternal = req.query.external === 'true';
    
    // Get search params
    const searchType = req.query.searchType as string || req.query.type as string || 'all';
    const limit = parseInt(req.query.limit as string) || 100;
    
    console.log(`[BOOK_ROUTES] Processing search query: "${query}", external: ${fetchExternal}, type: ${searchType}`);
    
    // Use the unified Supabase search method that handles both local and external
    const books = await bookService.searchBooksWithExternal(query, fetchExternal, searchType, limit);
    res.json(books);
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ 
      message: 'Failed to search books', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/books/search/:query
 * Search books by title or author (path parameter version)
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    console.log('[BOOK_ROUTES] Processing enhanced search for:', query);
    const books = await bookService.searchBooksEnhanced(query);
    res.json(books);
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ 
      message: 'Failed to search books', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/books/:id
 * Get a specific book by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await bookService.getBookById(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ 
      message: 'Failed to fetch book', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/books
 * Create a new book
 */
router.post('/', async (req, res) => {
  try {
    const bookData = req.body;
    
    // Validate required fields
    if (!bookData.title || !bookData.author) {
      return res.status(400).json({ 
        message: 'Title and author are required' 
      });
    }

    const book = await bookService.createBook(bookData);
    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ 
      message: 'Failed to create book', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * PUT /api/books/:id
 * Update a book
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookData = req.body;
    
    const book = await bookService.updateBook(id, bookData);
    res.json(book);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ 
      message: 'Failed to update book', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * DELETE /api/books/:id
 * Delete a book
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await bookService.deleteBook(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ 
      message: 'Failed to delete book', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/books/llm/test
 * Test LLM connection
 */
router.get('/llm/test', async (req, res) => {
  try {
    console.log('[BOOK_ROUTES] Testing LLM connection...');
    const isConnected = await bookService.testLLMConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'LLM is working correctly' : 'LLM connection failed'
    });
  } catch (error) {
    console.error('Error testing LLM connection:', error);
    res.status(500).json({ 
      message: 'Failed to test LLM connection', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/books/llm/config
 * Update LLM configuration
 */
router.post('/llm/config', async (req, res) => {
  try {
    const { model, enabled } = req.body;
    console.log('[BOOK_ROUTES] Updating LLM config:', { model, enabled });
    
    await bookService.updateLLMConfig({ model, enabled });
    res.json({ 
      message: 'LLM configuration updated successfully',
      config: { model, enabled }
    });
  } catch (error) {
    console.error('Error updating LLM config:', error);
    res.status(500).json({ 
      message: 'Failed to update LLM configuration', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/books/llm/analyze/:query
 * Test LLM query analysis without database search
 */
router.get('/llm/analyze/:query', async (req, res) => {
  try {
    const { query } = req.params;
    console.log('[BOOK_ROUTES] Testing LLM analysis for:', query);
    
    const analysis = await bookService.testLLMAnalysis(query);
    res.json({
      query,
      analysis,
      message: 'LLM analysis completed successfully'
    });
  } catch (error) {
    console.error('Error testing LLM analysis:', error);
    res.status(500).json({ 
      message: 'Failed to test LLM analysis', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test LLM analysis
router.get('/llm/analyze', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    console.log(`${LOG_PREFIX} Testing LLM analysis for: ${query}`);
    const analysis = await bookService.testLLMAnalysis(query);
    res.json(analysis);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error testing LLM analysis:`, error);
    res.status(500).json({ error: 'Failed to analyze query' });
  }
});

export default router; 