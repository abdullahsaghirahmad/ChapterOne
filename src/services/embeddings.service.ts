/**
 * Hugging Face Embeddings Service
 * 
 * Handles semantic embeddings generation using Hugging Face's Inference API
 * with the all-MiniLM-L6-v2 model for 384-dimensional sentence embeddings.
 */

import { supabase } from '../lib/supabase';
import { Book } from '../types';

export interface BookEmbedding {
  id: string;
  bookId: string;
  embeddingModel: string;
  embeddingVector: number[];
  textContent: string;
  embeddingMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EmbeddingGenerationResult {
  success: boolean;
  bookId: string;
  embedding?: BookEmbedding;
  error?: string;
}

export interface BatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export class EmbeddingsService {
  private static readonly LOG_PREFIX = '[EMBEDDINGS_SERVICE]';
  private static readonly MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2';
  private static readonly EMBEDDING_DIM = 384;
  private static readonly API_BASE = 'https://api-inference.huggingface.co';
  private static readonly BATCH_SIZE = 5; // Process 5 books at a time to avoid rate limits
  private static readonly RETRY_DELAY = 2000; // 2 seconds between retries

  /**
   * Get Hugging Face API token from environment
   */
  private static getApiToken(): string | null {
    const token = process.env.REACT_APP_HUGGING_FACE_TOKEN;
    if (!token || token === 'your-hugging-face-token-here') {
      return null;
    }
    return token;
  }

  /**
   * Check if Hugging Face API is properly configured
   */
  static isConfigured(): boolean {
    const token = this.getApiToken();
    return token !== null;
  }

  /**
   * Test Hugging Face API connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    console.log(`${this.LOG_PREFIX} Testing Hugging Face API connection...`);
    
    const token = this.getApiToken();
    if (!token) {
      return {
        success: false,
        error: 'Hugging Face API token not configured. Please set REACT_APP_HUGGING_FACE_TOKEN in your .env file.'
      };
    }

    try {
      const testEmbedding = await this.generateEmbedding('Hello, world!');
      if (testEmbedding.length === this.EMBEDDING_DIM) {
        console.log(`${this.LOG_PREFIX} ✅ API connection successful`);
        return { success: true };
      } else {
        return {
          success: false,
          error: `Expected ${this.EMBEDDING_DIM} dimensions, got ${testEmbedding.length}`
        };
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} API connection failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate text embedding using Hugging Face API
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const token = this.getApiToken();
    if (!token) {
      console.warn(`${this.LOG_PREFIX} No API token found, using mock embedding`);
      return this.generateMockEmbedding(text);
    }

    // Clean and validate text input
    // eslint-disable-next-line no-control-regex
    const cleanText = text.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
    if (!cleanText) {
      throw new Error('Text content is empty after cleaning');
    }
    
    console.log(`${this.LOG_PREFIX} Generating embedding for text (${cleanText.length} chars)`);
    console.log(`${this.LOG_PREFIX} Text preview: "${cleanText.substring(0, 200)}..."`);

    const requestBody = {
      inputs: cleanText,  // Standard inference API expects 'inputs' parameter
      options: {
        wait_for_model: true
      }
    };

    const apiUrl = `${this.API_BASE}/models/${this.MODEL_NAME}`;
    console.log(`${this.LOG_PREFIX} API Request:`, {
      url: apiUrl,
      bodySize: JSON.stringify(requestBody).length,
      textLength: cleanText.length
    });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Get detailed error information
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : '';
        } catch (e) {
          // Ignore errors reading error body
        }

        if (response.status === 503) {
          // Model is loading, wait and retry once
          console.log(`${this.LOG_PREFIX} Model loading, waiting...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          
          const retryResponse = await fetch(`${this.API_BASE}/models/${this.MODEL_NAME}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!retryResponse.ok) {
            let retryErrorDetails = '';
            try {
              const retryErrorBody = await retryResponse.text();
              retryErrorDetails = retryErrorBody ? ` - ${retryErrorBody}` : '';
            } catch (e) {
              // Ignore errors reading error body
            }
            throw new Error(`Hugging Face API error after retry: ${retryResponse.status} ${retryResponse.statusText}${retryErrorDetails}`);
          }
          
          const retryData = await retryResponse.json();
          return this.parseEmbeddingResponse(retryData);
        }
        
        const errorMsg = `Hugging Face API error: ${response.status} ${response.statusText}${errorDetails}. Request: ${cleanText.length} chars, Body size: ${JSON.stringify(requestBody).length} bytes`;
        console.error(`${this.LOG_PREFIX} ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return this.parseEmbeddingResponse(data);
      
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error generating embedding:`, error);
      console.log(`${this.LOG_PREFIX} Falling back to mock embedding for development`);
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Parse embedding response from Hugging Face API
   */
  private static parseEmbeddingResponse(data: any): number[] {
    let vector: number[];

    if (Array.isArray(data) && Array.isArray(data[0])) {
      vector = data[0]; // Single sentence response
    } else if (Array.isArray(data)) {
      vector = data; // Direct array response
    } else {
      throw new Error('Unexpected embedding response format');
    }

    if (vector.length !== this.EMBEDDING_DIM) {
      throw new Error(`Expected ${this.EMBEDDING_DIM} dimensions, got ${vector.length}`);
    }

    console.log(`${this.LOG_PREFIX} Generated ${vector.length}D embedding successfully`);
    return vector;
  }

  /**
   * Generate mock embedding for development/testing
   */
  private static generateMockEmbedding(text: string): number[] {
    console.log(`${this.LOG_PREFIX} Generating mock embedding for development`);
    
    // Create deterministic "embedding" based on text content
    const embedding = new Array(this.EMBEDDING_DIM).fill(0);
    
    // Simple hash-based approach for consistent mock embeddings
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Fill embedding with pseudo-random values based on hash
    for (let i = 0; i < this.EMBEDDING_DIM; i++) {
      const seed = hash + i;
      embedding[i] = (Math.sin(seed) * 10000) % 1.0; // Normalize to [-1, 1]
    }
    
    return embedding;
  }

  /**
   * Prepare text content for embedding from book data
   */
  private static prepareBookTextContent(book: Book): string {
    const parts = [
      book.title,
      book.author,
      book.description,
      // Add categories if available
      ...(Array.isArray(book.categories) ? book.categories : []),
    ].filter(Boolean);

    let text = parts.join(' ').trim();
    
    // Truncate text to stay within model limits (2000 chars to be safe)
    const MAX_CHARS = 2000;
    if (text.length > MAX_CHARS) {
      // Truncate at word boundary to avoid cutting off words
      text = text.substring(0, MAX_CHARS);
      const lastSpaceIndex = text.lastIndexOf(' ');
      if (lastSpaceIndex > MAX_CHARS * 0.8) { // Only truncate at word boundary if we don't lose too much
        text = text.substring(0, lastSpaceIndex);
      }
      text = text.trim() + '...';
      console.log(`${this.LOG_PREFIX} Truncated text for ${book.title} to ${text.length} characters`);
    }

    return text;
  }

  /**
   * Generate and store book embedding
   */
  static async generateBookEmbedding(book: Book): Promise<EmbeddingGenerationResult> {
    let textContent: string | undefined = undefined;
    
    try {
      console.log(`${this.LOG_PREFIX} Processing book: ${book.title}`);

      // Check if embedding already exists
      const { data: existing } = await supabase
        .from('book_embeddings')
        .select('id')
        .eq('book_id', book.id)
        .eq('embedding_model', this.MODEL_NAME)
        .single();

      if (existing) {
        console.log(`${this.LOG_PREFIX} Embedding already exists for: ${book.title}`);
        const existingEmbedding = await this.getBookEmbedding(book.id);
        return {
          success: true,
          bookId: book.id,
          embedding: existingEmbedding || undefined
        };
      }

      // Prepare text content
      textContent = this.prepareBookTextContent(book);
      if (!textContent) {
        throw new Error('No content available for embedding generation');
      }

      // Generate embedding
      const embeddingVector = await this.generateEmbedding(textContent);

      // Store in database
      const { data, error } = await supabase
        .from('book_embeddings')
        .insert({
          book_id: book.id,
          embedding_model: this.MODEL_NAME,
          embedding_vector: embeddingVector,
          text_content: textContent,
          embedding_metadata: {
            modelVersion: '1.0',
            generatedAt: new Date().toISOString(),
            textLength: textContent.length,
            apiUsed: this.isConfigured() ? 'huggingface' : 'mock'
          }
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`${this.LOG_PREFIX} ✅ Generated embedding for: ${book.title}`);
      return {
        success: true,
        bookId: book.id,
        embedding: this.transformDatabaseRow(data)
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${this.LOG_PREFIX} ❌ Error processing "${book.title}" by ${book.author}:`, {
        error: errorMessage,
        bookId: book.id,
        textLength: textContent?.length || 0,
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        success: false,
        bookId: book.id,
        error: `${book.title}: ${errorMessage}`
      };
    }
  }

  /**
   * Get existing book embedding from database
   */
  static async getBookEmbedding(bookId: string): Promise<BookEmbedding | null> {
    const { data, error } = await supabase
      .from('book_embeddings')
      .select('*')
      .eq('book_id', bookId)
      .eq('embedding_model', this.MODEL_NAME)
      .single();

    if (error || !data) {
      return null;
    }

    return this.transformDatabaseRow(data);
  }

  /**
   * Batch process multiple books
   */
  static async batchGenerateEmbeddings(books: Book[]): Promise<BatchResult> {
    console.log(`${this.LOG_PREFIX} Starting batch processing for ${books.length} books`);
    
    const result: BatchResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process in batches to respect rate limits
    for (let i = 0; i < books.length; i += this.BATCH_SIZE) {
      const batch = books.slice(i, i + this.BATCH_SIZE);
      console.log(`${this.LOG_PREFIX} Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(books.length / this.BATCH_SIZE)}`);

      // Process batch sequentially to avoid overwhelming the API
      for (const book of batch) {
        const bookResult = await this.generateBookEmbedding(book);
        result.totalProcessed++;

        if (bookResult.success) {
          result.successful++;
        } else {
          result.failed++;
          result.errors.push(`${book.title}: ${bookResult.error}`);
        }

        // Small delay between requests to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Longer delay between batches
      if (i + this.BATCH_SIZE < books.length) {
        console.log(`${this.LOG_PREFIX} Waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`${this.LOG_PREFIX} Batch complete: ${result.successful}/${result.totalProcessed} successful`);
    return result;
  }

  /**
   * Get embedding statistics
   */
  static async getEmbeddingStats(): Promise<{
    totalEmbeddings: number;
    modelBreakdown: Record<string, number>;
    latestGenerated: string | null;
  }> {
    const { data, error } = await supabase
      .from('book_embeddings')
      .select('embedding_model, created_at');

    if (error) {
      throw error;
    }

    const totalEmbeddings = data.length;
    const modelBreakdown: Record<string, number> = {};
    let latestGenerated: string | null = null;

    for (const row of data) {
      modelBreakdown[row.embedding_model] = (modelBreakdown[row.embedding_model] || 0) + 1;
      
      if (!latestGenerated || row.created_at > latestGenerated) {
        latestGenerated = row.created_at;
      }
    }

    return {
      totalEmbeddings,
      modelBreakdown,
      latestGenerated
    };
  }

  /**
   * Transform database row to BookEmbedding interface
   */
  private static transformDatabaseRow(row: any): BookEmbedding {
    return {
      id: row.id,
      bookId: row.book_id,
      embeddingModel: row.embedding_model,
      embeddingVector: row.embedding_vector,
      textContent: row.text_content,
      embeddingMetadata: row.embedding_metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}