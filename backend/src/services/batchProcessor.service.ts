import { Book } from '../entities/Book';
import { OpenLibraryAPI } from './openLibrary.service';
import { GoogleBooksAPI } from './googleBooks.service';

// Batch processing configuration
interface BatchConfig {
  maxBatchSize: number;
  batchTimeoutMs: number;
  maxConcurrentBatches: number;
  retryAttempts: number;
  retryDelayMs: number;
}

// Request types and priorities
export enum RequestPriority {
  HIGH = 1,    // User-facing search requests
  MEDIUM = 2,  // Background enrichment
  LOW = 3      // Periodic updates/cleanup
}

export interface BatchRequest {
  id: string;
  query: string;
  searchType: string;
  priority: RequestPriority;
  timestamp: number;
  userId?: string;
  resolve: (results: any[]) => void;
  reject: (error: Error) => void;
}

export interface BatchStats {
  totalRequests: number;
  batchedRequests: number;
  duplicatesAvoided: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  errorRate: number;
  apiCallsSaved: number;
}

export class BatchProcessor {
  private config: BatchConfig;
  private requestQueue: Map<RequestPriority, BatchRequest[]>;
  private pendingBatches: Map<string, BatchRequest[]>;
  private activeRequests: Map<string, Promise<any>>;
  private stats: BatchStats;
  private openLibraryAPI: OpenLibraryAPI;
  private googleBooksAPI: GoogleBooksAPI | null;
  private processingTimer: NodeJS.Timeout | null;
  private readonly LOG_PREFIX = '[BATCH_PROCESSOR]';

  constructor() {
    this.config = {
      maxBatchSize: 10,           // Process up to 10 requests together
      batchTimeoutMs: 200,        // Wait max 200ms to form a batch
      maxConcurrentBatches: 3,    // Max 3 batches processing simultaneously
      retryAttempts: 2,           // Retry failed requests twice
      retryDelayMs: 1000         // Wait 1s between retries
    };

    this.requestQueue = new Map([
      [RequestPriority.HIGH, []],
      [RequestPriority.MEDIUM, []],
      [RequestPriority.LOW, []]
    ]);

    this.pendingBatches = new Map();
    this.activeRequests = new Map();
    this.processingTimer = null;

    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      duplicatesAvoided: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      apiCallsSaved: 0
    };

    this.openLibraryAPI = new OpenLibraryAPI();
    
    // Initialize Google Books API if available
    const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY;
    this.googleBooksAPI = googleApiKey ? new GoogleBooksAPI(googleApiKey) : null;

    this.startProcessing();
  }

  /**
   * Add a search request to the processing queue
   */
  async processSearchRequest(
    query: string,
    searchType: string = 'all',
    priority: RequestPriority = RequestPriority.MEDIUM,
    userId?: string
  ): Promise<any[]> {
    const requestId = this.generateRequestId(query, searchType);
    
    // Check for duplicate active requests
    const duplicateRequest = this.activeRequests.get(requestId);
    if (duplicateRequest) {
      console.log(`${this.LOG_PREFIX} Duplicate request detected: ${requestId}`);
      this.stats.duplicatesAvoided++;
      return duplicateRequest;
    }

    return new Promise((resolve, reject) => {
      const request: BatchRequest = {
        id: requestId,
        query,
        searchType,
        priority,
        timestamp: Date.now(),
        userId,
        resolve,
        reject
      };

      // Add to appropriate priority queue
      const queue = this.requestQueue.get(priority);
      if (queue) {
        queue.push(request);
        this.stats.totalRequests++;
        console.log(`${this.LOG_PREFIX} Queued request: ${requestId} (priority: ${priority}, queue size: ${queue.length})`);
      }

      // Trigger immediate processing for high-priority requests
      if (priority === RequestPriority.HIGH) {
        this.processBatches();
      }
    });
  }

  /**
   * Generate a unique request ID for deduplication
   */
  private generateRequestId(query: string, searchType: string): string {
    const normalized = `${query.toLowerCase().trim()}_${searchType}`;
    return Buffer.from(normalized).toString('base64').substring(0, 16);
  }

  /**
   * Start the batch processing system
   */
  private startProcessing(): void {
    // Process batches every 100ms
    this.processingTimer = setInterval(() => {
      this.processBatches();
    }, 100);

    console.log(`${this.LOG_PREFIX} Batch processor started`);
  }

  /**
   * Stop the batch processing system
   */
  stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    console.log(`${this.LOG_PREFIX} Batch processor stopped`);
  }

  /**
   * Process queued requests into batches
   */
  private async processBatches(): Promise<void> {
    // Check if we can start new batches
    if (this.pendingBatches.size >= this.config.maxConcurrentBatches) {
      return;
    }

    // Process high priority first, then medium, then low
    for (const priority of [RequestPriority.HIGH, RequestPriority.MEDIUM, RequestPriority.LOW]) {
      const queue = this.requestQueue.get(priority);
      if (!queue || queue.length === 0) continue;

      // Create batch from queue
      const batchSize = Math.min(queue.length, this.config.maxBatchSize);
      const batch = queue.splice(0, batchSize);

      if (batch.length > 0) {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.pendingBatches.set(batchId, batch);
        
        console.log(`${this.LOG_PREFIX} Created batch: ${batchId} (${batch.length} requests, priority: ${priority})`);
        
        // Process batch asynchronously
        this.executeBatch(batchId, batch);
        
        // Only process one priority level at a time to maintain order
        break;
      }
    }
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchId: string, batch: BatchRequest[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`${this.LOG_PREFIX} Processing batch: ${batchId} (${batch.length} requests)`);
      
      // Group requests by search type for optimal API usage
      const groupedRequests = this.groupRequestsByType(batch);
      
      // Process each group
      const results: Map<string, any[]> = new Map();
      
      for (const [searchType, requests] of groupedRequests.entries()) {
        console.log(`${this.LOG_PREFIX} Processing ${requests.length} ${searchType} requests`);
        
        // Combine similar queries for batch processing
        const combinedQueries = this.combineQueries(requests);
        
        for (const combinedQuery of combinedQueries) {
          const apiResults = await this.callExternalAPI(combinedQuery.query, searchType);
          
          // Distribute results back to individual requests
          for (const requestId of combinedQuery.requestIds) {
            const filteredResults = this.filterResultsForRequest(
              apiResults, 
              requests.find(r => r.id === requestId)?.query || ''
            );
            results.set(requestId, filteredResults);
          }
        }
      }

      // Resolve all requests in the batch
      for (const request of batch) {
        const requestResults = results.get(request.id) || [];
        
        // Mark request as active to prevent duplicates
        this.activeRequests.set(request.id, Promise.resolve(requestResults));
        
        // Clean up active request after a delay
        setTimeout(() => {
          this.activeRequests.delete(request.id);
        }, 30000); // 30 second cleanup
        
        request.resolve(requestResults);
      }

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStats(batch.length, processingTime, true);
      
      console.log(`${this.LOG_PREFIX} Completed batch: ${batchId} in ${processingTime}ms`);
      
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Batch failed: ${batchId}`, error);
      
      // Handle batch failure
      await this.handleBatchFailure(batch, error as Error);
      this.updateStats(batch.length, Date.now() - startTime, false);
    } finally {
      // Clean up batch
      this.pendingBatches.delete(batchId);
    }
  }

  /**
   * Group requests by search type for optimal processing
   */
  private groupRequestsByType(requests: BatchRequest[]): Map<string, BatchRequest[]> {
    const groups = new Map<string, BatchRequest[]>();
    
    for (const request of requests) {
      const group = groups.get(request.searchType) || [];
      group.push(request);
      groups.set(request.searchType, group);
    }
    
    return groups;
  }

  /**
   * Combine similar queries to reduce API calls
   */
  private combineQueries(requests: BatchRequest[]): Array<{query: string, requestIds: string[]}> {
    const queryMap = new Map<string, string[]>();
    
    // Group by normalized query
    for (const request of requests) {
      const normalizedQuery = request.query.toLowerCase().trim();
      const ids = queryMap.get(normalizedQuery) || [];
      ids.push(request.id);
      queryMap.set(normalizedQuery, ids);
    }
    
    // Convert to combined queries
    const combinedQueries: Array<{query: string, requestIds: string[]}> = [];
    
    for (const [query, requestIds] of queryMap.entries()) {
      if (requestIds.length > 1) {
        console.log(`${this.LOG_PREFIX} Combining ${requestIds.length} identical queries: "${query}"`);
        this.stats.apiCallsSaved += requestIds.length - 1;
      }
      
      combinedQueries.push({ query, requestIds });
    }
    
    return combinedQueries;
  }

  /**
   * Call external API with intelligent source selection
   */
  private async callExternalAPI(query: string, searchType: string): Promise<any[]> {
    const errors: Error[] = [];
    
    // Try Open Library first (free and reliable)
    try {
      const results = await this.openLibraryAPI.searchBooks(query, 20, searchType);
      if (results.length > 0) {
        console.log(`${this.LOG_PREFIX} Open Library returned ${results.length} results for: ${query}`);
        return results;
      }
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} Open Library failed for: ${query}`, error);
      errors.push(error as Error);
    }

    // Fallback to Google Books if available
    if (this.googleBooksAPI) {
      try {
        const results = await this.googleBooksAPI.searchBooks(query, 20);
        console.log(`${this.LOG_PREFIX} Google Books returned ${results.length} results for: ${query}`);
        return results;
      } catch (error) {
        console.warn(`${this.LOG_PREFIX} Google Books failed for: ${query}`, error);
        errors.push(error as Error);
      }
    }

    // If all APIs fail, throw the most recent error
    if (errors.length > 0) {
      throw errors[errors.length - 1];
    }

    return [];
  }

  /**
   * Filter API results for specific request query
   */
  private filterResultsForRequest(results: any[], originalQuery: string): any[] {
    if (!results.length) return results;
    
    // If queries are identical, return all results
    const normalizedOriginal = originalQuery.toLowerCase().trim();
    
    // Simple relevance filtering - return all for now
    // Could be enhanced with fuzzy matching or relevance scoring
    return results;
  }

  /**
   * Handle batch processing failures
   */
  private async handleBatchFailure(batch: BatchRequest[], error: Error): Promise<void> {
    console.error(`${this.LOG_PREFIX} Handling batch failure for ${batch.length} requests`);
    
    // Try to process requests individually as fallback
    for (const request of batch) {
      try {
        // Attempt individual processing with retry
        const results = await this.retryRequest(request);
        request.resolve(results);
      } catch (retryError) {
        console.error(`${this.LOG_PREFIX} Request failed after retries: ${request.id}`, retryError);
        const errorMessage = retryError instanceof Error ? retryError.message : 'Unknown error';
        request.reject(new Error(`External API unavailable: ${errorMessage}`));
      }
    }
  }

  /**
   * Retry a failed request with exponential backoff
   */
  private async retryRequest(request: BatchRequest, attempt: number = 1): Promise<any[]> {
    if (attempt > this.config.retryAttempts) {
      throw new Error(`Max retry attempts exceeded for request: ${request.id}`);
    }

    try {
      // Add delay before retry
      if (attempt > 1) {
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 2);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await this.callExternalAPI(request.query, request.searchType);
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} Retry ${attempt} failed for: ${request.id}`);
      return this.retryRequest(request, attempt + 1);
    }
  }

  /**
   * Update processing statistics
   */
  private updateStats(batchSize: number, processingTime: number, success: boolean): void {
    this.stats.batchedRequests += batchSize;
    
    // Update average batch size
    const totalBatches = Math.ceil(this.stats.batchedRequests / this.stats.averageBatchSize) || 1;
    this.stats.averageBatchSize = this.stats.batchedRequests / totalBatches;
    
    // Update average processing time
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime + processingTime) / 2;
    
    // Update error rate
    if (!success) {
      const totalAttempts = this.stats.totalRequests;
      const currentErrors = this.stats.errorRate * totalAttempts;
      this.stats.errorRate = (currentErrors + batchSize) / totalAttempts;
    }
  }

  /**
   * Get current processing statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {priority: RequestPriority, count: number}[] {
    return Array.from(this.requestQueue.entries()).map(([priority, queue]) => ({
      priority,
      count: queue.length
    }));
  }

  /**
   * Clear all queues (for testing/reset)
   */
  clearQueues(): void {
    for (const queue of this.requestQueue.values()) {
      queue.length = 0;
    }
    this.pendingBatches.clear();
    this.activeRequests.clear();
    console.log(`${this.LOG_PREFIX} All queues cleared`);
  }
}

// Create singleton instance
export const batchProcessor = new BatchProcessor(); 