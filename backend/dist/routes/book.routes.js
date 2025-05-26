"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookRouter = void 0;
const express_1 = require("express");
const book_service_1 = require("../services/book.service");
const router = (0, express_1.Router)();
const bookService = new book_service_1.BookService();
// Get all books
router.get('/', async (req, res) => {
    try {
        const books = await bookService.getAllBooks();
        res.json(books);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching books', error });
    }
});
// Search books - Must come before /:id to prevent route conflicts
router.get('/search', async (req, res) => {
    try {
        const query = req.query.query || req.query.q;
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        // Check if we should include results from external API
        const fetchExternal = req.query.external === 'true';
        // Get search params
        const searchType = req.query.searchType || req.query.type || 'all';
        const limit = parseInt(req.query.limit) || 100;
        const books = await bookService.searchBooks(query, fetchExternal, searchType, limit);
        res.json(books);
    }
    catch (error) {
        console.error('Error searching books:', error);
        res.status(500).json({ message: 'Error searching books', error });
    }
});
// Get book by ID
router.get('/:id', async (req, res) => {
    try {
        // Check query param to determine if we should fetch external data
        const includeExternalData = req.query.external === 'true';
        const book = await bookService.getBookById(req.params.id, includeExternalData);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(book);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching book', error });
    }
});
// Create new book
router.post('/', async (req, res) => {
    try {
        const result = await bookService.addBook(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating book', error });
    }
});
// Update book
router.put('/:id', async (req, res) => {
    try {
        const book = await bookService.getBookById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        // Update only essential fields to keep our DB light
        const updatedBook = {
            ...book,
            title: req.body.title || book.title,
            author: req.body.author || book.author,
            coverImage: req.body.coverImage || book.coverImage,
            isbn: req.body.isbn || book.isbn
        };
        const result = await bookService.addBook(updatedBook);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating book', error });
    }
});
// Delete book
router.delete('/:id', async (req, res) => {
    try {
        const book = await bookService.getBookById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        const success = await bookService.deleteBook(req.params.id);
        if (success) {
            res.status(204).send();
        }
        else {
            res.status(500).json({ message: 'Error deleting book' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting book', error });
    }
});
exports.bookRouter = router;
