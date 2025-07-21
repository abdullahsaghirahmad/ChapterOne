import { supabase, Book } from '../lib/supabase';
import { LLMService } from './llm.service';
import { OpenLibraryAPI } from './openLibrary.service';
import { QueryAnalysis } from '../types/llm.types';
import { batchProcessor, RequestPriority } from './batchProcessor.service';

export class BookService {
  private llmService: LLMService;
  private openLibraryAPI: OpenLibraryAPI;
  private readonly LOG_PREFIX = '[BOOK_SERVICE]';

  constructor() {
    this.llmService = new LLMService();
    this.openLibraryAPI = new OpenLibraryAPI();
    console.log(`${this.LOG_PREFIX} Initialized with LLM integration and external APIs`);
  }
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
          // Map UI reading styles to database pace values
          let mappedPace = filters.pace;
          switch (filters.pace.toLowerCase()) {
            case 'quick read':
              mappedPace = 'Fast';
              break;
            case 'deep dive':
            case 'academic':
              mappedPace = 'Slow';
              break;
            case 'light reading':
            case 'standalone':
            case 'series':
            case 'visual':
            case 'interactive':
              mappedPace = 'Moderate';
              break;
          }
          query = query.eq('pace', mappedPace);
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
   * Search books by title or author (original method - kept for fallback)
   */
  async searchBooks(query: string): Promise<Book[]> {
    try {
      console.log(`${this.LOG_PREFIX} Performing basic search for: "${query}"`);
      
      const { data, error } = await supabase
        .from('book')
        .select('*')
        .or(`title.ilike.%${query}%, author.ilike.%${query}%`)
        .order('title');

      if (error) {
        throw new Error(`Failed to search books: ${error.message}`);
      }

      console.log(`${this.LOG_PREFIX} Basic search returned ${data?.length || 0} results`);
      return data || [];
    } catch (error) {
      console.error('Error in searchBooks:', error);
      throw error;
    }
  }

  /**
   * Enhanced search with LLM-powered query understanding
   */
  async searchBooksEnhanced(query: string): Promise<Book[]> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} Starting enhanced search for: "${query}"`);

    try {
      // Try LLM analysis first
      const llmResult = await this.llmService.analyzeQuery(query);
      
      if (llmResult.success && llmResult.analysis) {
        console.log(`${this.LOG_PREFIX} LLM analysis successful, building enhanced search`);
        return await this.searchWithAnalysis(llmResult.analysis);
      } else {
        console.log(`${this.LOG_PREFIX} LLM analysis failed, using fallback: ${llmResult.error}`);
        return await this.searchBooks(query);
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`${this.LOG_PREFIX} Enhanced search failed after ${processingTime}ms, using fallback:`, error);
      return await this.searchBooks(query);
    }
  }

  /**
   * Search books using LLM analysis results
   */
  private async searchWithAnalysis(analysis: QueryAnalysis): Promise<Book[]> {
    console.log(`${this.LOG_PREFIX} Building query from analysis:`, {
      themes: analysis.themes,
      moods: analysis.moods,
      professions: analysis.professions,
      categories: analysis.categories,
      searchType: analysis.searchType
    });

    try {
      // Get all books first
      const { data: allBooks, error } = await supabase
        .from('book')
        .select('*')
        .order('title');

      if (error) {
        throw new Error(`Failed to fetch books: ${error.message}`);
      }

      if (!allBooks) {
        return [];
      }

      // If no specific filters, try text search with enhanced keywords
      if ((!analysis.themes && !analysis.moods && !analysis.professions && !analysis.categories && !analysis.pace) 
          && analysis.enhancedKeywords && analysis.enhancedKeywords.length > 0) {
        console.log(`${this.LOG_PREFIX} Using enhanced keywords for text search: ${analysis.enhancedKeywords.join(', ')}`);
        const searchTerms = analysis.enhancedKeywords.join(' ').toLowerCase();
        
        const textMatches = allBooks.filter(book => {
          const searchableText = `${book.title} ${book.author} ${book.description}`.toLowerCase();
          return searchTerms.split(' ').some(term => searchableText.includes(term));
        });

        console.log(`${this.LOG_PREFIX} Text search returned ${textMatches.length} results`);
        return textMatches;
      }

      // Score-based filtering for more flexible matching
      const scoredBooks = allBooks.map(book => {
        let score = 0;
        let matches: string[] = [];

        // Theme matching (highest priority for abstract concepts)
        if (analysis.themes && analysis.themes.length > 0) {
          const themeMatches = analysis.themes.filter(theme => 
            book.themes && book.themes.includes(theme)
          );
          if (themeMatches.length > 0) {
            score += themeMatches.length * 3; // High weight for themes
            matches.push(`themes: ${themeMatches.join(', ')}`);
          }
        }

        // Category matching (genres - second priority)
        if (analysis.categories && analysis.categories.length > 0) {
          const categoryMatches = analysis.categories.filter(category => 
            book.categories && book.categories.includes(category)
          );
          if (categoryMatches.length > 0) {
            score += categoryMatches.length * 5; // Higher weight for categories (genres)
            matches.push(`categories: ${categoryMatches.join(', ')}`);
          }
        }

        // Profession matching (flexible matching)
        if (analysis.professions && analysis.professions.length > 0) {
          const flexibleProfessions = analysis.professions.flatMap(prof => [
            prof,                      // exact match
            prof + 's',               // try plural  
            prof.replace(/s$/, ''),   // try removing 's'
            prof.replace('Engineer', 'Engineers')  // specific case
          ]);
          
          const professionMatches = flexibleProfessions.filter(profession => 
             book.professions && book.professions.some((bookProf: string) => 
               bookProf.toLowerCase().includes(profession.toLowerCase()) ||
               profession.toLowerCase().includes(bookProf.toLowerCase())
             )
           );
          
          if (professionMatches.length > 0) {
            score += professionMatches.length * 2; // Medium weight for professions
            matches.push(`professions: ${professionMatches.join(', ')}`);
          }
        }

        // Mood matching (using tone field)
        if (analysis.moods && analysis.moods.length > 0) {
          const moodMatches = analysis.moods.filter(mood => 
            book.tone && book.tone.includes(mood)
          );
          if (moodMatches.length > 0) {
            score += moodMatches.length * 2; // Medium weight for moods
            matches.push(`moods: ${moodMatches.join(', ')}`);
          }
        }

        // Pace matching with reading style mapping
        if (analysis.pace) {
          let mappedPace = analysis.pace;
          switch (analysis.pace.toLowerCase()) {
            case 'quick read':
              mappedPace = 'Fast';
              break;
            case 'deep dive':
            case 'academic':
              mappedPace = 'Slow';
              break;
            case 'light reading':
            case 'standalone':
            case 'series':
            case 'visual':
            case 'interactive':
              mappedPace = 'Moderate';
              break;
          }
          
          if (book.pace === mappedPace) {
            score += 1; // Lower weight for pace
            matches.push(`pace: ${analysis.pace} -> ${mappedPace}`);
          }
        }

        // Boost score for text matches in title/author
        if (analysis.enhancedKeywords && analysis.enhancedKeywords.length > 0) {
          const bookText = `${book.title} ${book.author}`.toLowerCase();
          const textMatches = analysis.enhancedKeywords.filter(keyword => 
            bookText.includes(keyword.toLowerCase())
          );
          if (textMatches.length > 0) {
            score += textMatches.length * 1; // Small boost for text matches
            matches.push(`text: ${textMatches.join(', ')}`);
          }
        }

        return { book, score, matches };
      });

      // Filter books with any score > 0 and sort by score
      const matchedBooks = scoredBooks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.book);

      console.log(`${this.LOG_PREFIX} Enhanced search returned ${matchedBooks.length} results`);
      return matchedBooks;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in searchWithAnalysis:`, error);
      
      // Fallback to basic search using original query
      console.log(`${this.LOG_PREFIX} Falling back to basic search with original query`);
      return await this.searchBooks(analysis.originalQuery);
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

  /**
   * Test LLM connection and functionality
   */
  async testLLMConnection(): Promise<{connected: boolean, message: string}> {
    console.log(`${this.LOG_PREFIX} Testing LLM connection...`);
    
    try {
      const connected = await this.llmService.testConnection();
      return {
        connected,
        message: connected ? 'LLM is working correctly' : 'LLM connection failed'
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} LLM connection test failed:`, error);
      return {
        connected: false,
        message: 'LLM connection test failed'
      };
    }
  }

  /**
   * Update LLM configuration
   */
  async updateLLMConfig(config: { model?: string; enabled?: boolean }): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Updating LLM config:`, config);
      this.llmService.updateConfig(config);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error updating LLM config:`, error);
      throw error;
    }
  }

  /**
   * Get current LLM configuration
   */
  getLLMConfig() {
    return this.llmService.getConfig();
  }

  /**
   * Test LLM analysis for debugging
   */
  async testLLMAnalysis(query: string) {
    console.log(`${this.LOG_PREFIX} Testing LLM analysis for: "${query}"`);
    
    try {
      const analysis = await this.llmService.analyzeQuery(query);
      return analysis;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} LLM analysis test failed:`, error);
      throw error;
    }
  }

  /**
   * Search books including external sources
   */
  async searchBooksWithExternal(
    query: string, 
    fetchExternal: boolean = false,
    searchType: string = 'all',
    limit: number = 100
  ): Promise<Book[]> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} Searching for "${query}" (external: ${fetchExternal}, type: ${searchType})`);

    try {
      // First get local results
      let localBooks: Book[] = [];
      
      if (searchType === 'all' || !query) {
        // Use enhanced search for local books
        localBooks = await this.searchBooksEnhanced(query);
      } else {
        // Use basic search for specific types
        localBooks = await this.searchBooks(query);
      }

      console.log(`${this.LOG_PREFIX} Found ${localBooks.length} local books`);

      if (!fetchExternal) {
        return localBooks;
      }

      // Fetch from external API using batch processor
      console.log(`${this.LOG_PREFIX} Fetching from external sources via batch processor...`);
      try {
        // Use batch processor for intelligent request handling
        const externalBooks = await batchProcessor.processSearchRequest(
          query,
          searchType,
          RequestPriority.HIGH, // User-facing requests get high priority
          undefined // userId could be passed here if available
        );
        
        console.log(`${this.LOG_PREFIX} Batch processor returned ${externalBooks.length} external books`);
        
        // Format external results to match our Book interface
        const formattedExternalBooks = externalBooks.map((book, index) => ({
          id: `external-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          title: book.title,
          author: book.author,
          publishedYear: book.publishedYear,
          coverImage: book.coverImage,
          description: (typeof book.description === 'string' ? book.description : 'No description available'),
          pace: book.pace || 'Moderate',
          tone: book.tone || [],
          themes: book.themes || [],
          bestFor: book.bestFor || [],
          professions: book.professions || [],
          categories: book.themes || [],
          pageCount: book.pageCount,
          rating: 0,
          isExternal: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        // Filter out books we already have locally (by title and author)
        const uniqueExternalBooks = formattedExternalBooks.filter(extBook => 
          !localBooks.some(localBook => 
            localBook.title.toLowerCase() === extBook.title.toLowerCase() && 
            localBook.author.toLowerCase() === extBook.author.toLowerCase()
          )
        );
        
        console.log(`${this.LOG_PREFIX} After deduplication: ${uniqueExternalBooks.length} unique external books`);
        const processingTime = Date.now() - startTime;
        console.log(`${this.LOG_PREFIX} Search completed in ${processingTime}ms`);
        
        return [...localBooks, ...uniqueExternalBooks];
      } catch (externalError) {
        console.error(`${this.LOG_PREFIX} External API search failed:`, externalError);
        console.log(`${this.LOG_PREFIX} Falling back to local results only`);
        return localBooks;
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Search failed:`, error);
      throw error;
    }
  }
} 