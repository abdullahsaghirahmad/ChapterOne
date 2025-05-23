import { AppDataSource } from '../config/database';
import { Book } from '../entities/Book';
import { OpenLibraryAPI } from './openLibrary.service';
import { NLPService } from './nlp.service';

export class BookService {
  private bookRepository = AppDataSource.getRepository(Book);
  private openLibraryAPI = new OpenLibraryAPI();
  private nlpService = new NLPService();

  /**
   * Get all books with essential data from the local database
   */
  async getAllBooks(): Promise<Book[]> {
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
  async getBookById(id: string, includeExternalData: boolean = false): Promise<Book | null> {
    const book = await this.bookRepository.findOne({ where: { id } });
    
    if (!book) return null;
    
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
  async searchBooks(
    query: string, 
    fetchExternal: boolean = false,
    searchType: string = 'all',
    limit: number = 100
  ): Promise<Book[]> {
    let localBooks: Book[] = [];
    
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
          .where(`EXISTS (SELECT 1 FROM unnest(book.professions) AS p WHERE p = :exactQuery OR p ILIKE :likeQuery)`, 
            { 
              exactQuery: query,
              likeQuery: `%${query}%`
            })
          .limit(limit)
          .getMany();
        break;
        
      case 'readingStyle':
      case 'pace':
        // Search by pace (reading style)
        localBooks = await this.bookRepository
          .createQueryBuilder('book')
          .where('book.pace = :query', { query })
          .limit(limit)
          .getMany();
        break;
        
      case 'all':
      default:
        // Search across all fields, including array fields
        localBooks = await this.bookRepository
          .createQueryBuilder('book')
          .where('book.title ILIKE :query OR book.author ILIKE :query OR EXISTS (SELECT 1 FROM unnest(book.themes) AS th WHERE th ILIKE :query) OR EXISTS (SELECT 1 FROM unnest(book.tone) AS t WHERE t ILIKE :query) OR EXISTS (SELECT 1 FROM unnest(book.professions) AS p WHERE p ILIKE :query)',
            { query: `%${query}%` })
          .limit(limit)
          .getMany();
        break;
    }

    if (!fetchExternal) return localBooks;

    // If requested, also search external API
    try {
      const externalBooks = await this.openLibraryAPI.searchBooks(query, limit, searchType);
      
      // Format external results to match our Book entity
      const formattedExternalBooks = externalBooks.map(book => {
        const newBook = new Book();
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
      const uniqueExternalBooks = formattedExternalBooks.filter(extBook => 
        !localBooks.some(localBook => 
          localBook.title === extBook.title && localBook.author === extBook.author
        )
      );
      
      return [...localBooks, ...uniqueExternalBooks];
    } catch (error) {
      console.error('Error fetching from external API:', error);
      return localBooks; // Fall back to local results on error
    }
  }

  /**
   * Add a book with minimal data to the local database
   */
  async addBook(bookData: Partial<Book>): Promise<Book> {
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
  async deleteBook(id: string): Promise<boolean> {
    const result = await this.bookRepository.delete(id);
    return result.affected !== 0;
  }

  /**
   * Enrich a book with data from external API
   */
  private async enrichBookWithExternalData(book: Book): Promise<Book> {
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
    } catch (error) {
      console.error(`Error enriching book "${book.title}":`, error);
      return book; // Return original book on error
    }
  }
} 