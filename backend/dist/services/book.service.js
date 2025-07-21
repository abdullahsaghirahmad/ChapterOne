"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookService = void 0;
const database_1 = require("../config/database");
const Book_1 = require("../entities/Book");
const openLibrary_service_1 = require("./openLibrary.service");
const nlp_service_1 = require("./nlp.service");
class BookService {
    constructor() {
        this.bookRepository = database_1.AppDataSource.getRepository(Book_1.Book);
        this.openLibraryAPI = new openLibrary_service_1.OpenLibraryAPI();
        this.nlpService = new nlp_service_1.NLPService();
    }
    /**
     * Get all books with essential data from the local database
     */
    async getAllBooks() {
        // Don't limit the number of books returned
        return this.bookRepository.find({
            order: {
                title: 'ASC' // Order by title alphabetically
            }
        });
    }
    /**
     * Get a book by ID, first from local DB then enhance with external data if needed
     */
    async getBookById(id, includeExternalData = false) {
        const book = await this.bookRepository.findOne({ where: { id } });
        if (!book)
            return null;
        if (includeExternalData) {
            return this.enrichBookWithExternalData(book);
        }
        return book;
    }
    /**
     * Search for books
     * @param query Search query
     * @param fetchExternal Whether to include results from external API
     * @param searchType Type of search: 'all', 'title', 'author', 'mood', 'theme', 'profession'
     * @param limit Maximum number of results to return
     */
    async searchBooks(query, fetchExternal = false, searchType = 'all', limit = 100) {
        let localBooks = [];
        // First search local database based on search type
        switch (searchType) {
            case 'title':
                localBooks = await this.bookRepository
                    .createQueryBuilder('book')
                    .where('book.title ILIKE :query', { query: `%${query}%` })
                    .limit(limit)
                    .getMany();
                break;
            case 'author':
                localBooks = await this.bookRepository
                    .createQueryBuilder('book')
                    .where('book.author ILIKE :query', { query: `%${query}%` })
                    .limit(limit)
                    .getMany();
                break;
            case 'mood':
            case 'tone':
                // Search by tone/mood using array unnest and ILIKE
                localBooks = await this.bookRepository
                    .createQueryBuilder('book')
                    .where(`EXISTS (SELECT 1 FROM unnest(book.tone) AS t WHERE t ILIKE :query)`, { query: `%${query}%` })
                    .limit(limit)
                    .getMany();
                break;
            case 'theme':
                // Search by theme using array unnest and ILIKE
                localBooks = await this.bookRepository
                    .createQueryBuilder('book')
                    .where(`EXISTS (SELECT 1 FROM unnest(book.themes) AS th WHERE th ILIKE :query)`, { query: `%${query}%` })
                    .limit(limit)
                    .getMany();
                break;
            case 'profession':
                // Search by profession using array unnest and ILIKE or exact match
                localBooks = await this.bookRepository
                    .createQueryBuilder('book')
                    .where(`EXISTS (SELECT 1 FROM unnest(book.professions) AS p WHERE p = :exactQuery OR p ILIKE :likeQuery)`, {
                    exactQuery: query,
                    likeQuery: `%${query}%`
                })
                    .limit(limit)
                    .getMany();
                break;
            case 'readingStyle':
            case 'pace':
                // Map UI reading styles to database pace values
                let paceValue = query;
                switch (query.toLowerCase()) {
                    case 'quick read':
                        paceValue = 'Fast';
                        break;
                    case 'deep dive':
                    case 'academic':
                        paceValue = 'Slow';
                        break;
                    case 'light reading':
                    case 'standalone':
                    case 'series':
                    case 'visual':
                    case 'interactive':
                        paceValue = 'Moderate';
                        break;
                    default:
                        // Keep original value for 'Fast', 'Slow', 'Moderate'
                        break;
                }
                // Search by pace (reading style)
                localBooks = await this.bookRepository
                    .createQueryBuilder('book')
                    .where('book.pace = :query', { query: paceValue })
                    .limit(limit)
                    .getMany();
                break;
            case 'all':
            default:
                // Search across all fields, including array fields
                localBooks = await this.bookRepository
                    .createQueryBuilder('book')
                    .where('book.title ILIKE :query OR book.author ILIKE :query OR EXISTS (SELECT 1 FROM unnest(book.themes) AS th WHERE th ILIKE :query) OR EXISTS (SELECT 1 FROM unnest(book.tone) AS t WHERE t ILIKE :query) OR EXISTS (SELECT 1 FROM unnest(book.professions) AS p WHERE p ILIKE :query)', { query: `%${query}%` })
                    .limit(limit)
                    .getMany();
                break;
        }
        if (!fetchExternal)
            return localBooks;
        // If requested, also search external API
        try {
            const externalBooks = await this.openLibraryAPI.searchBooks(query, limit, searchType);
            // Format external results to match our Book entity
            const formattedExternalBooks = externalBooks.map(book => {
                const newBook = new Book_1.Book();
                newBook.title = book.title;
                newBook.author = book.author;
                newBook.publishedYear = book.publishedYear;
                newBook.coverImage = book.coverImage;
                newBook.description = book.description || 'No description available';
                newBook.pace = book.pace;
                newBook.tone = book.tone;
                newBook.themes = book.themes;
                newBook.bestFor = book.bestFor;
                newBook.isExternal = true; // Flag to indicate this is not in our DB
                return newBook;
            });
            // Filter out books we already have locally (by title and author)
            const uniqueExternalBooks = formattedExternalBooks.filter(extBook => !localBooks.some(localBook => localBook.title === extBook.title && localBook.author === extBook.author));
            return [...localBooks, ...uniqueExternalBooks];
        }
        catch (error) {
            console.error('Error fetching from external API:', error);
            return localBooks; // Fall back to local results on error
        }
    }
    /**
     * Add a book with minimal data to the local database
     */
    async addBook(bookData) {
        // Only store essential fields in our database
        const essentialData = {
            title: bookData.title,
            author: bookData.author,
            coverImage: bookData.coverImage,
            isbn: bookData.isbn
        };
        const book = this.bookRepository.create(essentialData);
        return this.bookRepository.save(book);
    }
    /**
     * Delete a book from the local database
     */
    async deleteBook(id) {
        const result = await this.bookRepository.delete(id);
        return result.affected !== 0;
    }
    /**
     * Enrich a book with data from external API
     */
    async enrichBookWithExternalData(book) {
        try {
            const externalData = await this.openLibraryAPI.searchBooks(`${book.title} ${book.author}`, 1);
            if (externalData.length > 0) {
                const enriched = externalData[0];
                // Merge external data with our local data
                return {
                    ...book,
                    publishedYear: enriched.publishedYear || book.publishedYear,
                    description: enriched.description || book.description,
                    pageCount: enriched.pageCount || book.pageCount,
                    themes: enriched.themes || book.themes,
                    tone: enriched.tone || book.tone,
                    pace: enriched.pace || book.pace,
                    bestFor: enriched.bestFor || book.bestFor
                };
            }
            return book;
        }
        catch (error) {
            console.error(`Error enriching book "${book.title}":`, error);
            return book; // Return original book on error
        }
    }
}
exports.BookService = BookService;
