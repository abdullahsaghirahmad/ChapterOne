import { Book } from '../types';
import { LLMService } from './llm.service';

export interface BookEnhancementResult {
  success: boolean;
  enhanced: boolean;
  originalBook: Partial<Book>;
  enhancedBook: Partial<Book>;
  enhancements: {
    description?: string;
    quote?: string;
    themes?: string[];
    pace?: string;
    tone?: string[];
  };
  errors?: string[];
}

export interface ExternalBookData {
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverImage?: string;
  publishedYear?: number;
  pageCount?: number;
  categories?: string[];
  language?: string;
}

export class BookContentEnhancementService {
  private static readonly LOG_PREFIX = '[BOOK_ENHANCEMENT]';
  private static llmService = new LLMService();

  /**
   * Enhance a book with AI-generated content and metadata
   */
  static async enhanceBook(bookData: ExternalBookData): Promise<BookEnhancementResult> {
    console.log(`${this.LOG_PREFIX} Starting enhancement for: "${bookData.title}" by ${bookData.author}`);

    const result: BookEnhancementResult = {
      success: false,
      enhanced: false,
      originalBook: { ...bookData },
      enhancedBook: { ...bookData },
      enhancements: {},
      errors: []
    };

    try {
      // Enhance description if missing or poor quality
      if (this.needsDescriptionEnhancement(bookData.description)) {
        console.log(`${this.LOG_PREFIX} Enhancing description...`);
        try {
          const enhancedDescription = await this.llmService.generateDescription(
            bookData.title,
            bookData.author,
            bookData.description
          );
          result.enhancedBook.description = enhancedDescription;
          result.enhancements.description = enhancedDescription;
          result.enhanced = true;
        } catch (error) {
          result.errors?.push(`Description enhancement failed: ${error}`);
        }
      }

      // Generate quote if missing
      if (!bookData.description || !result.enhancements.description) {
        console.log(`${this.LOG_PREFIX} Generating quote...`);
        try {
          const quote = await this.llmService.generateQuote(
            bookData.title,
            bookData.author,
            result.enhancedBook.description || bookData.description
          );
          result.enhancements.quote = quote;
          result.enhanced = true;
        } catch (error) {
          result.errors?.push(`Quote generation failed: ${error}`);
        }
      }

      // Enhance metadata using AI analysis
      const metadataEnhancements = await this.enhanceMetadata(bookData);
      if (metadataEnhancements) {
        Object.assign(result.enhancements, metadataEnhancements);
        Object.assign(result.enhancedBook, metadataEnhancements);
        result.enhanced = true;
      }

      result.success = true;
      console.log(`${this.LOG_PREFIX} Enhancement completed. Enhanced: ${result.enhanced}`);

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Enhancement failed:`, error);
      result.errors?.push(`Overall enhancement failed: ${error}`);
    }

    return result;
  }

  /**
   * Enhance book from external sources during add process
   */
  static async enhanceFromExternalSources(
    title: string, 
    author: string, 
    isbn?: string
  ): Promise<BookEnhancementResult> {
    console.log(`${this.LOG_PREFIX} Fetching and enhancing from external sources...`);

    // First, try to get basic book data from external APIs
    const externalData = await this.fetchFromExternalAPIs(title, author, isbn);
    
    if (!externalData) {
      return {
        success: false,
        enhanced: false,
        originalBook: { title, author, isbn },
        enhancedBook: { title, author, isbn },
        enhancements: {},
        errors: ['Failed to fetch book data from external sources']
      };
    }

    // Then enhance with AI
    return this.enhanceBook(externalData);
  }

  /**
   * Check if description needs enhancement
   */
  private static needsDescriptionEnhancement(description?: string): boolean {
    if (!description || description === 'No description available') return true;
    if (description.length < 50) return true;
    
    // Check for generic/poor quality descriptions
    const lowQualityIndicators = [
      'no description',
      'description not available',
      'coming soon',
      'to be announced',
      'check back later'
    ];
    
    const lowerDesc = description.toLowerCase();
    return lowQualityIndicators.some(indicator => lowerDesc.includes(indicator));
  }

  /**
   * Enhance metadata using AI analysis
   */
  private static async enhanceMetadata(bookData: ExternalBookData): Promise<Partial<Book> | null> {
    try {
      console.log(`${this.LOG_PREFIX} Analyzing book for metadata enhancement...`);

      // Create a prompt for metadata analysis
      const analysisPrompt = `Analyze this book and provide metadata:

Title: "${bookData.title}"
Author: ${bookData.author}
${bookData.description ? `Description: ${bookData.description}` : ''}
${bookData.categories ? `Categories: ${bookData.categories.join(', ')}` : ''}

Provide a JSON response with:
{
  "themes": ["theme1", "theme2", "theme3"],
  "pace": "Fast-paced" | "Moderate" | "Slow-paced",
  "tone": ["tone1", "tone2"],
  "bestFor": ["situation1", "situation2"]
}

Focus on accurate, relevant metadata.`;

      const response = await fetch('/api/llm/analyze-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: analysisPrompt })
      });

      if (response.ok) {
        const data = await response.json();
        // Parse the analysis if successful
        if (data.analysis) {
          return this.parseMetadataResponse(data.analysis);
        }
      }
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} Metadata enhancement failed:`, error);
    }

    return null;
  }

  /**
   * Parse metadata from AI response
   */
  private static parseMetadataResponse(response: any): Partial<Book> {
    const metadata: Partial<Book> = {};

    try {
      // Extract themes, pace, tone, etc. from the response
      if (response.themes && Array.isArray(response.themes)) {
        metadata.themes = response.themes.slice(0, 5); // Limit to 5 themes
      }

      if (response.pace && typeof response.pace === 'string') {
        metadata.pace = response.pace;
      }

      if (response.tone && Array.isArray(response.tone)) {
        metadata.tone = response.tone.slice(0, 3); // Limit to 3 tones
      }

      if (response.bestFor && Array.isArray(response.bestFor)) {
        metadata.bestFor = response.bestFor.slice(0, 3); // Limit to 3 situations
      }
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} Error parsing metadata response:`, error);
    }

    return metadata;
  }

  /**
   * Fetch book data from external APIs
   */
  private static async fetchFromExternalAPIs(
    title: string, 
    author: string, 
    isbn?: string
  ): Promise<ExternalBookData | null> {
    console.log(`${this.LOG_PREFIX} Fetching from external APIs...`);

    // This is a placeholder - you would integrate with your existing
    // Google Books, Open Library, etc. services here
    try {
      // Try multiple sources in order of preference
      const sources = [
        () => this.fetchFromGoogleBooks(title, author, isbn),
        () => this.fetchFromOpenLibrary(title, author, isbn),
      ];

      for (const fetchSource of sources) {
        try {
          const data = await fetchSource();
          if (data) {
            console.log(`${this.LOG_PREFIX} Successfully fetched external data`);
            return data;
          }
        } catch (error) {
          console.warn(`${this.LOG_PREFIX} External source failed:`, error);
        }
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} All external sources failed:`, error);
    }

    // Fallback to basic data
    return {
      title,
      author,
      isbn,
      description: undefined // Will trigger AI generation
    };
  }

  /**
   * Fetch from Google Books API
   */
  private static async fetchFromGoogleBooks(
    title: string, 
    author: string, 
    isbn?: string
  ): Promise<ExternalBookData | null> {
    // Placeholder for Google Books integration
    // You would implement this using your existing GoogleBooksAPI service
    console.log(`${this.LOG_PREFIX} Google Books fetch not implemented yet`);
    return null;
  }

  /**
   * Fetch from Open Library API
   */
  private static async fetchFromOpenLibrary(
    title: string, 
    author: string, 
    isbn?: string
  ): Promise<ExternalBookData | null> {
    // Placeholder for Open Library integration
    // You would implement this using your existing OpenLibraryAPI service
    console.log(`${this.LOG_PREFIX} Open Library fetch not implemented yet`);
    return null;
  }

  /**
   * Quick enhancement for existing books (description + quote only)
   */
  static async quickEnhance(book: Partial<Book>): Promise<{ description?: string; quote?: string }> {
    if (!book.title || !book.author) {
      throw new Error('Title and author are required for enhancement');
    }

    console.log(`${this.LOG_PREFIX} Quick enhancement for: "${book.title}"`);

    const enhancements: { description?: string; quote?: string } = {};

    try {
      // Generate in parallel for speed
      const [description, quote] = await Promise.all([
        this.needsDescriptionEnhancement(book.description) 
          ? this.llmService.generateDescription(book.title, book.author, book.description)
          : Promise.resolve(book.description),
        this.llmService.generateQuote(book.title, book.author, book.description)
      ]);

      if (description && description !== book.description) {
        enhancements.description = description;
      }

      if (quote) {
        enhancements.quote = quote;
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Quick enhancement failed:`, error);
      throw error;
    }

    return enhancements;
  }
}