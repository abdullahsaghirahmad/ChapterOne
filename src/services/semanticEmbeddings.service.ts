/**
 * Server-Side Semantic Embeddings Service
 * 
 * Optimized for pre-computation of book embeddings (admin-triggered)
 * and real-time user context embeddings for instant similarity search.
 * 
 * Architecture:
 * - Admin: Pre-compute book embeddings (rare, heavy)
 * - Users: Generate context embeddings (frequent, light)
 * - Database: Fast vector similarity search
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

export interface EmbeddingBatchResult {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ bookId: string; error: string }>;
  duration: number;
}

export interface SimilaritySearchResult {
  bookId: string;
  similarity: number;
  book?: Book;
}

export interface UserContext {
  mood?: string;
  situation?: string;
  goal?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  customText?: string;
}

export class SemanticEmbeddingsService {
  private static readonly LOG_PREFIX = '[SEMANTIC_EMBEDDINGS]';
  private static readonly MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2';
  private static readonly EMBEDDING_DIM = 384;
  private static readonly API_BASE = 'https://api-inference.huggingface.co';
  private static readonly BATCH_SIZE = 3; // Smaller batches for reliability
  private static readonly RETRY_DELAY = 3000; // 3 seconds between retries
  private static readonly MAX_RETRIES = 2;

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
   * Check if service is properly configured
   */
  static isConfigured(): boolean {
    return this.getApiToken() !== null;
  }

  /**
   * Generate embedding using Hugging Face API with retry logic
   */
  private static async generateEmbedding(text: string, retries = 0): Promise<number[]> {
    const token = this.getApiToken();
    
    if (!token) {
      console.warn(`${this.LOG_PREFIX} No API token - using mock embedding`);
      return this.generateMockEmbedding(text);
    }

    try {
      // Clean and validate text input
      // eslint-disable-next-line no-control-regex
      const cleanText = text.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
      if (!cleanText) {
        throw new Error('Text content is empty after cleaning');
      }

      const requestBody = {
        inputs: cleanText,
        options: {
          wait_for_model: true
        }
      };

      const apiUrl = `${this.API_BASE}/models/${this.MODEL_NAME}`;
      console.log(`${this.LOG_PREFIX} API Request:`, {
        url: apiUrl,
        textLength: cleanText.length,
        attempt: retries + 1
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : '';
        } catch (e) { /* ignore */ }

        // Retry on server errors
        if (response.status >= 500 && retries < this.MAX_RETRIES) {
          console.warn(`${this.LOG_PREFIX} Server error ${response.status}, retrying in ${this.RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.generateEmbedding(text, retries + 1);
        }

        const errorMsg = `Hugging Face API error: ${response.status} ${response.statusText}${errorDetails}`;
        console.error(`${this.LOG_PREFIX} ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return this.parseEmbeddingResponse(data);

    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        console.warn(`${this.LOG_PREFIX} Request failed, retrying in ${this.RETRY_DELAY}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.generateEmbedding(text, retries + 1);
      }
      
      console.error(`${this.LOG_PREFIX} Failed after ${retries + 1} attempts, falling back to mock embedding`);
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Parse embedding response from Hugging Face API
   */
  private static parseEmbeddingResponse(data: any): number[] {
    if (Array.isArray(data) && data.length > 0) {
      const embedding = Array.isArray(data[0]) ? data[0] : data;
      if (Array.isArray(embedding) && embedding.length === this.EMBEDDING_DIM) {
        return embedding;
      }
    }
    throw new Error('Invalid embedding response format');
  }

  /**
   * Generate mock embedding for development/fallback
   */
  private static generateMockEmbedding(text: string): number[] {
    console.log(`${this.LOG_PREFIX} Generating mock embedding`);
    
    // Create a deterministic but varied embedding based on text content
    const seed = text.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const random = () => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: this.EMBEDDING_DIM }, (_, i) => {
      return (random() + i * 0.001) * 2 - 1; // Range [-1, 1]
    });
  }

  /**
   * Prepare book text content for embedding
   */
  private static prepareBookTextContent(book: Book): string {
    const parts = [
      book.title,
      book.author,
      book.description,
      ...(Array.isArray(book.categories) ? book.categories : []),
      ...(Array.isArray(book.themes) ? book.themes : []),
      ...(Array.isArray(book.tone) ? book.tone : [])
    ].filter(Boolean);

    let text = parts.join(' ').trim();
    
    // Truncate if too long (Hugging Face has input limits)
    const MAX_CHARS = 2000;
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS);
      const lastSpaceIndex = text.lastIndexOf(' ');
      if (lastSpaceIndex > MAX_CHARS * 0.8) {
        text = text.substring(0, lastSpaceIndex);
      }
      text = text.trim() + '...';
      console.log(`${this.LOG_PREFIX} Truncated text for ${book.title} to ${text.length} characters`);
    }

    return text;
  }

  /**
   * Prepare user context for embedding
   */
  private static prepareContextText(context: UserContext): string {
    const parts = [
      context.mood && `mood: ${context.mood}`,
      context.situation && `situation: ${context.situation}`,
      context.goal && `goal: ${context.goal}`,
      context.timeOfDay && `time: ${context.timeOfDay}`,
      context.dayOfWeek && `day: ${context.dayOfWeek}`,
      context.customText
    ].filter(Boolean);

    const text = parts.join(', ');
    return text || 'general reading preference';
  }

  /**
   * ADMIN: Pre-compute embedding for a single book
   */
  static async computeBookEmbedding(book: Book): Promise<BookEmbedding | null> {
    try {
      console.log(`${this.LOG_PREFIX} Computing embedding for: ${book.title}`);

      // Check if embedding already exists
      const { data: existing } = await supabase
        .from('book_embeddings')
        .select('*')
        .eq('book_id', book.id)
        .eq('embedding_model', this.MODEL_NAME)
        .single();

      if (existing) {
        console.log(`${this.LOG_PREFIX} Embedding already exists for: ${book.title}`);
        return this.transformDatabaseRow(existing);
      }

      // Prepare text content
      const textContent = this.prepareBookTextContent(book);
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
            apiUsed: this.isConfigured() ? 'huggingface' : 'mock',
            source: 'admin_precompute'
          }
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`${this.LOG_PREFIX} ✅ Generated embedding for: ${book.title}`);
      return this.transformDatabaseRow(data);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${this.LOG_PREFIX} ❌ Failed to compute embedding for "${book.title}":`, errorMessage);
      return null;
    }
  }

  /**
   * ADMIN: Batch process multiple books
   */
  static async batchProcessBooks(books: Book[], onProgress?: (processed: number, total: number) => void): Promise<EmbeddingBatchResult> {
    const startTime = Date.now();
    const result: EmbeddingBatchResult = {
      total: books.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0
    };

    console.log(`${this.LOG_PREFIX} Starting batch processing of ${books.length} books`);

    // Process in small batches to avoid overwhelming the API
    for (let i = 0; i < books.length; i += this.BATCH_SIZE) {
      const batch = books.slice(i, i + this.BATCH_SIZE);
      
      console.log(`${this.LOG_PREFIX} Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(books.length / this.BATCH_SIZE)}`);

      // Process batch sequentially to respect rate limits
      for (const book of batch) {
        try {
          const embedding = await this.computeBookEmbedding(book);
          if (embedding) {
            result.successful++;
          } else {
            result.failed++;
            result.errors.push({ bookId: book.id, error: 'Failed to compute embedding' });
          }
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({ bookId: book.id, error: errorMessage });
        }

        result.processed++;
        onProgress?.(result.processed, result.total);
      }

      // Small delay between batches
      if (i + this.BATCH_SIZE < books.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    result.duration = Date.now() - startTime;
    console.log(`${this.LOG_PREFIX} Batch processing complete:`, result);
    
    return result;
  }

  /**
   * USER: Generate context embedding for real-time similarity search
   */
  static async generateContextEmbedding(context: UserContext): Promise<number[]> {
    const textContent = this.prepareContextText(context);
    console.log(`${this.LOG_PREFIX} Generating context embedding for: "${textContent}"`);
    return this.generateEmbedding(textContent);
  }

  /**
   * USER: Find similar books using pre-computed embeddings
   */
  static async findSimilarBooks(contextEmbedding: number[], limit = 10, minSimilarity = 0.1): Promise<SimilaritySearchResult[]> {
    try {
      console.log(`${this.LOG_PREFIX} Searching for similar books (limit: ${limit})`);

      // Get all book embeddings and compute similarity
      const { data: embeddings, error } = await supabase
        .from('book_embeddings')
        .select('book_id, embedding_vector')
        .eq('embedding_model', this.MODEL_NAME);

      if (error) {
        throw error;
      }

      if (!embeddings || embeddings.length === 0) {
        console.warn(`${this.LOG_PREFIX} No book embeddings found`);
        return [];
      }

      // Compute similarities
      const similarities = embeddings.map(row => ({
        bookId: row.book_id,
        similarity: this.cosineSimilarity(contextEmbedding, row.embedding_vector)
      }));

      // Sort by similarity and filter
      const results = similarities
        .filter(item => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log(`${this.LOG_PREFIX} Found ${results.length} similar books`);
      return results;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error finding similar books:`, error);
      return [];
    }
  }

  /**
   * Get embedding statistics
   */
  static async getEmbeddingStats(): Promise<{ total: number; modelName: string; lastUpdated: string | null }> {
    try {
      const { data, error } = await supabase
        .from('book_embeddings')
        .select('embedding_model, updated_at')
        .eq('embedding_model', this.MODEL_NAME);

      if (error) {
        throw error;
      }

      const lastUpdated = data && data.length > 0 
        ? Math.max(...data.map(row => new Date(row.updated_at).getTime()))
        : null;

      return {
        total: data?.length || 0,
        modelName: this.MODEL_NAME,
        lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null
      };

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error getting stats:`, error);
      return { total: 0, modelName: this.MODEL_NAME, lastUpdated: null };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
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