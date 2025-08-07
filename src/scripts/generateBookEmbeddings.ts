/**
 * Book Embeddings Generation Script
 * 
 * Batch processes all books in the database to generate semantic embeddings
 * using Hugging Face's all-MiniLM-L6-v2 model.
 * 
 * Usage:
 * - npm run generate-embeddings (all books)
 * - npm run generate-embeddings --limit=10 (first 10 books)
 * - npm run generate-embeddings --force (regenerate existing)
 */

import { EmbeddingsService } from '../services/embeddings.service';
import api from '../services/api.supabase';
import { Book } from '../types';

interface ScriptOptions {
  limit?: number;
  force?: boolean; // Regenerate existing embeddings
  verbose?: boolean;
}

class EmbeddingGenerationScript {
  private static readonly LOG_PREFIX = '[EMBEDDING_SCRIPT]';

  static async run(options: ScriptOptions = {}): Promise<void> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} 🚀 Starting embedding generation...`);
    
    try {
      // Test API connection first
      const connectionTest = await EmbeddingsService.testConnection();
      if (!connectionTest.success) {
        console.error(`${this.LOG_PREFIX} ❌ API connection failed:`, connectionTest.error);
        console.log(`${this.LOG_PREFIX} 💡 To fix this:`);
        console.log('1. Get a free Hugging Face API token from https://huggingface.co/settings/tokens');
        console.log('2. Create a .env file in your project root');
        console.log('3. Add: REACT_APP_HUGGING_FACE_TOKEN=your_token_here');
        console.log('4. Restart the script');
        return;
      }

      console.log(`${this.LOG_PREFIX} ✅ API connection successful`);

      // Get current statistics
      const currentStats = await EmbeddingsService.getEmbeddingStats();
      console.log(`${this.LOG_PREFIX} 📊 Current embeddings: ${currentStats.totalEmbeddings}`);
      
      if (options.verbose) {
        console.log(`${this.LOG_PREFIX} Model breakdown:`, currentStats.modelBreakdown);
      }

      // Fetch books from database
      console.log(`${this.LOG_PREFIX} 📚 Fetching books...`);
      const books = await this.fetchBooks(options.limit);
      
      if (books.length === 0) {
        console.log(`${this.LOG_PREFIX} ⚠️ No books found to process`);
        return;
      }

      console.log(`${this.LOG_PREFIX} Found ${books.length} books to process`);

      // Filter out books that already have embeddings (unless force = true)
      let booksToProcess = books;
      if (!options.force) {
        booksToProcess = await this.filterBooksWithoutEmbeddings(books);
        const alreadyProcessed = books.length - booksToProcess.length;
        
        if (alreadyProcessed > 0) {
          console.log(`${this.LOG_PREFIX} ⏭️ Skipping ${alreadyProcessed} books (already have embeddings)`);
        }
      }

      if (booksToProcess.length === 0) {
        console.log(`${this.LOG_PREFIX} ✅ All books already have embeddings!`);
        return;
      }

      console.log(`${this.LOG_PREFIX} 🔄 Processing ${booksToProcess.length} books...`);

      // Generate embeddings in batches
      const result = await EmbeddingsService.batchGenerateEmbeddings(booksToProcess);

      // Report results
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`${this.LOG_PREFIX} 🎉 Batch processing complete!`);
      console.log(`${this.LOG_PREFIX} ⏱️ Duration: ${duration}s`);
      console.log(`${this.LOG_PREFIX} ✅ Successful: ${result.successful}/${result.totalProcessed}`);
      console.log(`${this.LOG_PREFIX} ❌ Failed: ${result.failed}/${result.totalProcessed}`);

      if (result.errors.length > 0 && options.verbose) {
        console.log(`${this.LOG_PREFIX} 📝 Errors:`);
        result.errors.forEach(error => console.log(`   - ${error}`));
      }

      // Final statistics
      const finalStats = await EmbeddingsService.getEmbeddingStats();
      console.log(`${this.LOG_PREFIX} 📊 Total embeddings now: ${finalStats.totalEmbeddings}`);

    } catch (error) {
      console.error(`${this.LOG_PREFIX} ❌ Script failed:`, error);
      throw error;
    }
  }

  /**
   * Fetch books from the database
   */
  private static async fetchBooks(limit?: number): Promise<Book[]> {
    try {
      const books = await api.books.getAll();
      
      // Apply limit if specified
      if (limit) {
        return books.slice(0, limit);
      }
      
      return books;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error fetching books:`, error);
      throw error;
    }
  }

  /**
   * Filter out books that already have embeddings
   */
  private static async filterBooksWithoutEmbeddings(books: Book[]): Promise<Book[]> {
    const booksWithoutEmbeddings: Book[] = [];

    for (const book of books) {
      const existing = await EmbeddingsService.getBookEmbedding(book.id);
      if (!existing) {
        booksWithoutEmbeddings.push(book);
      }
    }

    return booksWithoutEmbeddings;
  }
}

// CLI interface for running the script
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    verbose: true // Always verbose when run directly
  };

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  console.log('📚 ChapterOne - Book Embeddings Generator');
  console.log('==========================================\n');

  EmbeddingGenerationScript.run(options)
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default EmbeddingGenerationScript;