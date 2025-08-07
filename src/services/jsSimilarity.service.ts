/**
 * JavaScript-Based Semantic Similarity Service
 * 
 * A complete replacement for the HF API approach using pure JavaScript.
 * Fast, reliable, and works offline with zero dependencies.
 */

import { TextSimilarityService, TextDocument } from './textSimilarity.service';
import { supabase } from '../lib/supabase';
import { Book, UserContext } from '../types';

export interface BookSimilarityResult {
  book: Book;
  similarity: number;
  factors: string[];
}

export interface ContextualRecommendation {
  book: Book;
  contextMatch: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export class JSSemanticSimilarityService {
  private static readonly LOG_PREFIX = '[JS_SIMILARITY]';
  private static bookCorpus: TextDocument[] = [];
  private static isInitialized = false;

  /**
   * Initialize the service with book data
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`${this.LOG_PREFIX} Initializing with book corpus...`);
    
    try {
      const { data: books, error } = await supabase
        .from('book')
        .select('*')
        .limit(100); // Handle up to 100 books efficiently

      if (error) throw error;

      // Convert books to text documents for similarity analysis
      this.bookCorpus = books.map(book => ({
        text: this.createBookText(book),
        metadata: { 
          bookId: book.id,
          title: book.title,
          author: book.author,
          book: book
        }
      }));

      // Index the documents for fast similarity search
      TextSimilarityService.indexDocuments(this.bookCorpus);
      
      this.isInitialized = true;
      console.log(`${this.LOG_PREFIX} ✅ Initialized with ${books.length} books`);
      
    } catch (error) {
      console.error(`${this.LOG_PREFIX} ❌ Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Create searchable text from book data
   */
  private static createBookText(book: Book): string {
    // Helper function to extract string values from mixed arrays
    const extractStringValue = (item: string | { type: string; value: string }): string => {
      return typeof item === 'string' ? item : item.value;
    };

    const parts = [
      book.title,
      book.author,
      book.description || '',
      Array.isArray(book.categories) ? book.categories.join(' ') : '',
      Array.isArray(book.themes) ? book.themes.map(extractStringValue).join(' ') : '',
      Array.isArray(book.tone) ? book.tone.map(extractStringValue).join(' ') : '',
      typeof book.pace === 'string' ? book.pace : (book.pace?.value || ''),
      Array.isArray(book.bestFor) ? book.bestFor.join(' ') : ''
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Create context text from user context
   */
  private static createContextText(context: UserContext): string {
    const parts = [
      context.mood || '',
      context.situation || '',
      context.goal || '',
      context.timeOfDay || '',
      context.dayOfWeek || ''
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Find books similar to a given context
   */
  static async findSimilarBooks(
    context: UserContext, 
    options: { limit?: number; threshold?: number } = {}
  ): Promise<BookSimilarityResult[]> {
    await this.initialize();

    const { limit = 10, threshold = 0.1 } = options;
    const contextText = this.createContextText(context);

    console.log(`${this.LOG_PREFIX} Searching for books matching context: "${contextText}"`);

    const results = TextSimilarityService.findSimilar(
      contextText, 
      this.bookCorpus, 
      { limit, threshold }
    );

    return results.map(result => ({
      book: result.metadata.book,
      similarity: result.score,
      factors: this.extractFactors(context, result.metadata.book, result.score)
    }));
  }

  /**
   * Get contextual recommendations with explanations
   */
  static async getContextualRecommendations(
    context: UserContext,
    limit: number = 5
  ): Promise<ContextualRecommendation[]> {
    const similarBooks = await this.findSimilarBooks(context, { limit: limit * 2 });

    return similarBooks.slice(0, limit).map(result => ({
      book: result.book,
      contextMatch: result.similarity,
      reason: this.generateReason(context, result.book, result.factors),
      confidence: this.getConfidence(result.similarity)
    }));
  }

  /**
   * Compare two books directly
   */
  static async compareBooks(bookA: Book, bookB: Book): Promise<number> {
    const textA = this.createBookText(bookA);
    const textB = this.createBookText(bookB);
    
    return TextSimilarityService.compareTexts(textA, textB);
  }

  /**
   * Find books similar to a given book
   */
  static async findSimilarBooksToBook(
    targetBook: Book, 
    options: { limit?: number; threshold?: number } = {}
  ): Promise<BookSimilarityResult[]> {
    await this.initialize();

    const { limit = 5, threshold = 0.2 } = options;
    const bookText = this.createBookText(targetBook);

    const results = TextSimilarityService.findSimilar(
      bookText, 
      this.bookCorpus, 
      { limit: limit + 1, threshold } // +1 to account for self-match
    );

    // Filter out the target book itself
    return results
      .filter(result => result.metadata.bookId !== targetBook.id)
      .slice(0, limit)
      .map(result => ({
        book: result.metadata.book,
        similarity: result.score,
        factors: this.extractBookFactors(targetBook, result.metadata.book)
      }));
  }

  /**
   * Extract matching factors between context and book
   */
  private static extractFactors(context: UserContext, book: Book, similarity: number): string[] {
    const factors: string[] = [];

    // Helper function to extract string values from mixed arrays
    const extractStringValue = (item: string | { type: string; value: string }): string => {
      return typeof item === 'string' ? item : item.value;
    };

    if (context.mood && Array.isArray(book.tone) && book.tone.length > 0) {
      const bookToneText = book.tone.map(extractStringValue).join(' ');
      const moodSimilarity = TextSimilarityService.compareTexts(context.mood, bookToneText);
      if (moodSimilarity > 0.3) {
        const toneDisplay = book.tone.map(extractStringValue).join(', ');
        factors.push(`Mood match: ${context.mood} ↔ ${toneDisplay}`);
      }
    }

    if (context.goal && book.description) {
      const goalSimilarity = TextSimilarityService.compareTexts(context.goal, book.description);
      if (goalSimilarity > 0.2) factors.push(`Goal alignment: ${context.goal}`);
    }

    if (context.situation && Array.isArray(book.bestFor)) {
      const situationText = context.situation;
      const bestForText = book.bestFor.join(' ');
      const situationSimilarity = TextSimilarityService.compareTexts(situationText, bestForText);
      if (situationSimilarity > 0.2) factors.push(`Situation match: ${context.situation}`);
    }

    if (factors.length === 0) {
      factors.push(`Overall similarity: ${(similarity * 100).toFixed(1)}%`);
    }

    return factors;
  }

  /**
   * Extract matching factors between two books
   */
  private static extractBookFactors(bookA: Book, bookB: Book): string[] {
    const factors: string[] = [];

    // Helper function to extract string values from mixed arrays
    const extractStringValue = (item: string | { type: string; value: string }): string => {
      return typeof item === 'string' ? item : item.value;
    };

    // Check category overlap
    if (Array.isArray(bookA.categories) && Array.isArray(bookB.categories)) {
      const commonCategories = bookA.categories.filter(cat => bookB.categories && bookB.categories.includes(cat));
      if (commonCategories.length > 0) {
        factors.push(`Shared categories: ${commonCategories.join(', ')}`);
      }
    }

    // Check theme similarity
    if (Array.isArray(bookA.themes) && Array.isArray(bookB.themes)) {
      const themesA = bookA.themes.map(extractStringValue);
      const themesB = bookB.themes.map(extractStringValue);
      const commonThemes = themesA.filter(theme => themesB.includes(theme));
      if (commonThemes.length > 0) {
        factors.push(`Similar themes: ${commonThemes.join(', ')}`);
      }
    }

    // Check tone similarity
    if (Array.isArray(bookA.tone) && Array.isArray(bookB.tone) && bookA.tone.length > 0 && bookB.tone.length > 0) {
      const toneAText = bookA.tone.map(extractStringValue).join(' ');
      const toneBText = bookB.tone.map(extractStringValue).join(' ');
      const toneSimilarity = TextSimilarityService.compareTexts(toneAText, toneBText);
      if (toneSimilarity > 0.4) {
        const toneADisplay = bookA.tone.map(extractStringValue).join(', ');
        const toneBDisplay = bookB.tone.map(extractStringValue).join(', ');
        factors.push(`Similar tone: ${toneADisplay} ↔ ${toneBDisplay}`);
      }
    }

    return factors;
  }

  /**
   * Generate human-readable reason for recommendation
   */
  private static generateReason(context: UserContext, book: Book, factors: string[]): string {
    if (factors.length > 0) {
      return `Recommended because: ${factors[0]}`;
    }

    // Fallback reasoning
    const contextParts = [context.mood, context.situation, context.goal].filter(Boolean);
    if (contextParts.length > 0) {
      return `Matches your ${contextParts.join(', ')} preferences`;
    }

    return `Good match for your current reading preferences`;
  }

  /**
   * Determine confidence level based on similarity score
   */
  private static getConfidence(similarity: number): 'high' | 'medium' | 'low' {
    if (similarity >= 0.6) return 'high';
    if (similarity >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Refresh the corpus (call when books are added/updated)
   */
  static async refresh(): Promise<void> {
    console.log(`${this.LOG_PREFIX} Refreshing book corpus...`);
    this.isInitialized = false;
    TextSimilarityService.clearCache();
    await this.initialize();
  }

  /**
   * Get performance statistics
   */
  static getStats() {
    const textStats = TextSimilarityService.getStats();
    return {
      ...textStats,
      isInitialized: this.isInitialized,
      booksIndexed: this.bookCorpus.length,
      service: 'JavaScript TF-IDF + Cosine Similarity'
    };
  }

  /**
   * Test the similarity service with sample data
   */
  static async runDiagnostics(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      await this.initialize();
      
      const testContext: UserContext = {
        mood: 'curious',
        situation: 'commuting',
        goal: 'learn something new'
      };

      const results = await this.findSimilarBooks(testContext, { limit: 3 });
      const stats = this.getStats();

      return {
        success: true,
        message: `✅ Similarity service working. Found ${results.length} matches.`,
        stats
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Similarity service failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats: {}
      };
    }
  }
}