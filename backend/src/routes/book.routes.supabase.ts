import { Router } from 'express';
import { BookService } from '../services/book.service.supabase';

const router = Router();
const bookService = new BookService();

/**
 * GET /api/books
 * Get all books with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { categories, themes, pace, professions, search } = req.query;

    // Handle search functionality
    if (search && typeof search === 'string') {
      const books = await bookService.searchBooks(search);
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
 * GET /api/books/search/:query
 * Search books by title or author
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const books = await bookService.searchBooks(query);
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

export default router; 