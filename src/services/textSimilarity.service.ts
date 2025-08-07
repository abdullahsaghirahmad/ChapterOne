/**
 * Pure JavaScript Text Similarity Service
 * 
 * Uses TF-IDF vectorization and cosine similarity for semantic text comparison.
 * Fast, free, and works offline - no APIs or external dependencies.
 * 
 * Perfect for small to medium datasets (50-500 documents).
 */

export interface SimilarityResult {
  score: number;
  text: string;
  metadata?: any;
}

export interface TextDocument {
  text: string;
  metadata?: any;
}

export interface TFIDFVector {
  [term: string]: number;
}

export class TextSimilarityService {
  private static readonly LOG_PREFIX = '[TEXT_SIMILARITY]';
  
  // Cache for document vectors to avoid recomputation
  private static documentVectors = new Map<string, TFIDFVector>();
  private static documentFrequency = new Map<string, number>();
  private static totalDocuments = 0;
  
  /**
   * Clear the internal cache (useful for testing or when dataset changes)
   */
  static clearCache(): void {
    this.documentVectors.clear();
    this.documentFrequency.clear();
    this.totalDocuments = 0;
    console.log(`${this.LOG_PREFIX} Cache cleared`);
  }

  /**
   * Preprocess text: normalize, remove punctuation, tokenize
   */
  private static preprocessText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .split(' ')
      .filter(word => word.length > 2); // Remove very short words
  }

  /**
   * Calculate term frequency for a document
   */
  private static calculateTF(terms: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalTerms = terms.length;
    
    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    
    // Normalize by document length
    Array.from(tf.entries()).forEach(([term, count]) => {
      tf.set(term, count / totalTerms);
    });
    
    return tf;
  }

  /**
   * Calculate TF-IDF vector for a document
   */
  private static calculateTFIDF(terms: string[], vocabulary: Set<string>): TFIDFVector {
    const tf = this.calculateTF(terms);
    const tfidf: TFIDFVector = {};
    
    Array.from(vocabulary).forEach(term => {
      const termFreq = tf.get(term) || 0;
      const docFreq = this.documentFrequency.get(term) || 0;
      
      if (termFreq > 0 && docFreq > 0) {
        const idf = Math.log(this.totalDocuments / docFreq);
        tfidf[term] = termFreq * idf;
      } else {
        tfidf[term] = 0;
      }
    });
    
    return tfidf;
  }

  /**
   * Calculate cosine similarity between two TF-IDF vectors
   */
  private static cosineSimilarity(vectorA: TFIDFVector, vectorB: TFIDFVector): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    const allTerms = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);
    
    Array.from(allTerms).forEach(term => {
      const a = vectorA[term] || 0;
      const b = vectorB[term] || 0;
      
      dotProduct += a * b;
      magnitudeA += a * a;
      magnitudeB += b * b;
    });
    
    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Build vocabulary and document frequency from a corpus
   */
  private static buildVocabulary(documents: TextDocument[]): Set<string> {
    this.documentFrequency.clear();
    const vocabulary = new Set<string>();
    
    for (const doc of documents) {
      const terms = this.preprocessText(doc.text);
      const uniqueTerms = new Set(terms);
      
      Array.from(uniqueTerms).forEach(term => {
        vocabulary.add(term);
        this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
      });
    }
    
    this.totalDocuments = documents.length;
    return vocabulary;
  }

  /**
   * Index a corpus of documents for similarity search
   */
  static indexDocuments(documents: TextDocument[]): void {
    console.time(`${this.LOG_PREFIX} Indexing ${documents.length} documents`);
    
    const vocabulary = this.buildVocabulary(documents);
    this.documentVectors.clear();
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const terms = this.preprocessText(doc.text);
      const vector = this.calculateTFIDF(terms, vocabulary);
      
      // Use a combination of text hash and index for caching key
      const key = `${i}_${this.hashString(doc.text.substring(0, 100))}`;
      this.documentVectors.set(key, vector);
    }
    
    console.timeEnd(`${this.LOG_PREFIX} Indexing ${documents.length} documents`);
    console.log(`${this.LOG_PREFIX} Indexed ${documents.length} documents with ${vocabulary.size} unique terms`);
  }

  /**
   * Find similar documents to a query text
   */
  static findSimilar(
    queryText: string, 
    documents: TextDocument[], 
    options: { limit?: number; threshold?: number } = {}
  ): SimilarityResult[] {
    const { limit = 10, threshold = 0.1 } = options;
    
    console.time(`${this.LOG_PREFIX} Similarity search`);
    
    // Ensure documents are indexed
    if (this.documentVectors.size === 0 || this.totalDocuments !== documents.length) {
      this.indexDocuments(documents);
    }
    
    // Build vocabulary from existing corpus
    const vocabulary = new Set(this.documentFrequency.keys());
    
    // Calculate TF-IDF for query
    const queryTerms = this.preprocessText(queryText);
    const queryVector = this.calculateTFIDF(queryTerms, vocabulary);
    
    // Calculate similarities
    const results: SimilarityResult[] = [];
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const key = `${i}_${this.hashString(doc.text.substring(0, 100))}`;
      const docVector = this.documentVectors.get(key);
      
      if (docVector) {
        const similarity = this.cosineSimilarity(queryVector, docVector);
        
        if (similarity >= threshold) {
          results.push({
            score: similarity,
            text: doc.text,
            metadata: doc.metadata
          });
        }
      }
    }
    
    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit);
    
    console.timeEnd(`${this.LOG_PREFIX} Similarity search`);
    console.log(`${this.LOG_PREFIX} Found ${limitedResults.length} similar documents (threshold: ${threshold})`);
    
    return limitedResults;
  }

  /**
   * Compare two texts directly
   */
  static compareTexts(textA: string, textB: string): number {
    const documents = [
      { text: textA },
      { text: textB }
    ];
    
    const vocabulary = this.buildVocabulary(documents);
    
    const termsA = this.preprocessText(textA);
    const termsB = this.preprocessText(textB);
    
    const vectorA = this.calculateTFIDF(termsA, vocabulary);
    const vectorB = this.calculateTFIDF(termsB, vocabulary);
    
    return this.cosineSimilarity(vectorA, vectorB);
  }

  /**
   * Simple string hash function for caching keys
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get performance statistics
   */
  static getStats() {
    return {
      totalDocuments: this.totalDocuments,
      vocabularySize: this.documentFrequency.size,
      cachedVectors: this.documentVectors.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Rough estimate of memory usage in KB
   */
  private static estimateMemoryUsage(): string {
    const vectorSize = this.documentVectors.size * this.documentFrequency.size * 8; // 8 bytes per float
    const vocabSize = this.documentFrequency.size * 50; // ~50 bytes per term
    const totalBytes = vectorSize + vocabSize;
    return `~${Math.round(totalBytes / 1024)}KB`;
  }
}