import { LLMService, QueryAnalysis } from './llm.service';
import { supabase } from '../lib/supabase';
import { Book } from '../types';

export interface SearchResult {
  books: Book[];
  queryType: 'simple' | 'complex';
  processingTime: number;
  searchMethod: 'direct' | 'llm' | 'hybrid';
  confidence?: number;
}

export interface SimpleQuery {
  type: 'mood' | 'theme' | 'profession' | 'category' | 'pace' | 'author' | 'title' | 'general';
  value: string;
  originalQuery: string;
}

export class QueryRouterService {
  private llmService: LLMService;
  private readonly LOG_PREFIX = '[QUERY_ROUTER]';

  // UI filter categories for exact matching
  private readonly UI_FILTERS = {
    MOODS: [
      'Feeling overwhelmed', 'Need inspiration', 'Want to escape', 'Looking for adventure',
      'Feeling nostalgic', 'Want to learn', 'Need motivation', 'Seeking comfort',
      'Curious about life', 'Ready for change', 'Need guidance', 'Feeling creative'
    ],
    THEMES: [
      'Love', 'Friendship', 'Family', 'Adventure', 'Mystery', 'Science Fiction',
      'Fantasy', 'Historical', 'Biography', 'Self-Help', 'Business', 'Health',
      'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'War', 'Politics',
      'Philosophy', 'Psychology', 'Technology', 'Nature', 'Travel', 'Food',
      'Art', 'Music', 'Sports', 'Religion', 'Education', 'Parenting'
    ],
    READING_STYLES: [
      'Quick Read', 'Deep Dive', 'Light Reading', 'Academic', 'Visual',
      'Interactive', 'Series', 'Standalone'
    ],
    PROFESSIONS: [
      'Technology', 'Healthcare', 'Education', 'Business', 'Creative Arts',
      'Science', 'Finance', 'Legal', 'Engineering', 'Marketing', 'Design',
      'Management', 'Consulting', 'Entrepreneurship', 'Research', 'Writing'
    ]
  };

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * Main search function that routes queries appropriately
   */
  async search(query: string): Promise<SearchResult> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} Processing search query: "${query}"`);

    try {
      // Step 1: Classify the query
      const simpleQuery = this.classifyQuery(query);
      console.log(`${this.LOG_PREFIX} Classification result:`, simpleQuery);
      
      if (simpleQuery) {
        console.log(`${this.LOG_PREFIX} Classified as simple query:`, simpleQuery);
        const books = await this.performDirectSearch(simpleQuery);
        
        console.log(`${this.LOG_PREFIX} Direct search returned ${books.length} books`);
        
        return {
          books,
          queryType: 'simple',
          processingTime: Date.now() - startTime,
          searchMethod: 'direct',
          confidence: 0.9
        };
      } else {
        console.log(`${this.LOG_PREFIX} Classified as complex query, using LLM`);
        const books = await this.performLLMSearch(query);
        
        console.log(`${this.LOG_PREFIX} LLM search returned ${books.length} books`);
        
        return {
          books,
          queryType: 'complex',
          processingTime: Date.now() - startTime,
          searchMethod: 'llm',
          confidence: 0.7
        };
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Search failed:`, error);
      
      // Fallback to basic text search
      const books = await this.performBasicTextSearch(query);
      
      console.log(`${this.LOG_PREFIX} Fallback search returned ${books.length} books`);
      
      return {
        books,
        queryType: 'simple',
        processingTime: Date.now() - startTime,
        searchMethod: 'direct',
        confidence: 0.3
      };
    }
  }

  /**
   * Classify query as simple or complex
   */
  private classifyQuery(query: string): SimpleQuery | null {
    const lowerQuery = query.toLowerCase().trim();
    
    // Skip very short queries - they're likely too vague for simple classification
    if (lowerQuery.length < 3) return null;

    // Complex query indicators - if any of these are found, use LLM
    const complexIndicators = [
      'like', 'similar to', 'reminds me of', 'makes me feel',
      'recommend', 'suggest', 'what should i read',
      'books for someone who', 'i want something that',
      'looking for books that', 'need books about',
      'help me find', 'can you suggest'
    ];

    if (complexIndicators.some(indicator => lowerQuery.includes(indicator))) {
      return null; // Complex query
    }

    // Check for book title references (complex)
    if (this.containsBookTitle(lowerQuery)) {
      return null; // Complex query
    }

    // Check for exact UI filter matches (simple)
    for (const mood of this.UI_FILTERS.MOODS) {
      if (lowerQuery.includes(mood.toLowerCase())) {
        return {
          type: 'mood',
          value: mood,
          originalQuery: query
        };
      }
    }

    for (const theme of this.UI_FILTERS.THEMES) {
      if (lowerQuery.includes(theme.toLowerCase())) {
        return {
          type: 'theme',
          value: theme,
          originalQuery: query
        };
      }
    }

    console.log(`${this.LOG_PREFIX} Checking reading styles...`);
    for (const style of this.UI_FILTERS.READING_STYLES) {
      const styleMatch = lowerQuery.includes(style.toLowerCase());
      console.log(`${this.LOG_PREFIX} Checking "${style.toLowerCase()}" in "${lowerQuery}": ${styleMatch}`);
      if (styleMatch) {
        console.log(`${this.LOG_PREFIX} Matched reading style: "${style}"`);
        return {
          type: 'pace',
          value: style,
          originalQuery: query
        };
      }
    }

    for (const profession of this.UI_FILTERS.PROFESSIONS) {
      if (lowerQuery.includes(profession.toLowerCase())) {
        return {
          type: 'profession',
          value: profession,
          originalQuery: query
        };
      }
    }

    // Check for simple category keywords
    const categoryKeywords = {
      'fantasy': 'Fantasy',
      'science fiction': 'Science Fiction',
      'sci-fi': 'Science Fiction',
      'romance': 'Romance',
      'mystery': 'Mystery',
      'thriller': 'Thriller',
      'self-help': 'Self-Help',
      'business': 'Business',
      'biography': 'Biography',
      'history': 'Historical',
      'horror': 'Horror'
    };

    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (lowerQuery.includes(keyword)) {
        return {
          type: 'category',
          value: category,
          originalQuery: query
        };
      }
    }

    // Check if it might be an author search
    if (lowerQuery.includes('by ') || lowerQuery.includes('author') || this.looksLikeAuthorName(lowerQuery)) {
      const authorName = this.extractAuthorName(lowerQuery);
      if (authorName) {
        return {
          type: 'author',
          value: authorName,
          originalQuery: query
        };
      }
    }

    // If it's a single word or simple phrase without complex indicators, treat as general search
    const words = lowerQuery.split(/\s+/).filter(word => word.length > 2);
    if (words.length <= 2 && !this.hasComplexStructure(lowerQuery)) {
      return {
        type: 'general',
        value: query,
        originalQuery: query
      };
    }

    console.log(`${this.LOG_PREFIX} No simple classification found, defaulting to complex query`);
    return null; // Default to complex for unclear cases
  }

  /**
   * Check if query contains book titles (indicating need for LLM processing)
   */
  private containsBookTitle(query: string): boolean {
    // Common book title patterns
    const titleIndicators = [
      'dune', 'harry potter', 'game of thrones', 'lord of the rings',
      'the hobbit', 'pride and prejudice', '1984', 'to kill a mockingbird',
      'the great gatsby', 'sapiens', 'atomic habits'
    ];
    
    return titleIndicators.some(title => query.includes(title));
  }

  /**
   * Check if query looks like an author name
   */
  private looksLikeAuthorName(query: string): boolean {
    // Simple heuristic: two capitalized words
    const words = query.split(/\s+/);
    return words.length === 2 && words.every(word => 
      word.length > 1 && word[0] === word[0].toUpperCase()
    );
  }

  /**
   * Extract author name from query
   */
  private extractAuthorName(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Remove common words
    const cleanQuery = lowerQuery
      .replace(/books?\s+(by|from|written\s+by)\s+/g, '')
      .replace(/\s+(books?|novels?|works?)\s*$/g, '')
      .trim();
    
    if (cleanQuery.length > 0 && cleanQuery.length < 50) {
      return cleanQuery;
    }
    
    return null;
  }

  /**
   * Check if query has complex grammatical structure
   */
  private hasComplexStructure(query: string): boolean {
    const complexPatterns = [
      /\b(that|which|who|where|when|why|how)\b/,
      /\b(because|since|although|while|if|unless)\b/,
      /\?/,
      /\b(and|or|but)\b.*\b(and|or|but)\b/ // Multiple conjunctions
    ];
    
    return complexPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Perform direct Supabase search for simple queries
   */
  private async performDirectSearch(simpleQuery: SimpleQuery): Promise<Book[]> {
    console.log(`${this.LOG_PREFIX} Performing direct search for ${simpleQuery.type}: ${simpleQuery.value}`);

    try {
      let query = supabase.from('book').select('*');

      switch (simpleQuery.type) {
        case 'mood':
          // Search in tone array for mood
          console.log(`${this.LOG_PREFIX} Searching for mood "${simpleQuery.value}" in tone array`);
          query = query.contains('tone', [simpleQuery.value]);
          break;

        case 'theme':
          // Search in themes array
          console.log(`${this.LOG_PREFIX} Searching for theme "${simpleQuery.value}" in themes array`);
          query = query.contains('themes', [simpleQuery.value]);
          break;

        case 'profession':
          // Search in professions array
          console.log(`${this.LOG_PREFIX} Searching for profession "${simpleQuery.value}" in professions array`);
          query = query.contains('professions', [simpleQuery.value]);
          break;

        case 'category':
          // Search in categories array
          console.log(`${this.LOG_PREFIX} Searching for category "${simpleQuery.value}" in categories array`);
          query = query.contains('categories', [simpleQuery.value]);
          break;

        case 'pace':
          // Map reading style to pace value
          const mappedPace = this.mapReadingStyleToPace(simpleQuery.value);
          console.log(`${this.LOG_PREFIX} Mapping reading style "${simpleQuery.value}" to pace "${mappedPace}"`);
          console.log(`${this.LOG_PREFIX} Building query: SELECT * FROM book WHERE pace = '${mappedPace}'`);
          query = query.eq('pace', mappedPace);
          break;

        case 'author':
          // Search by author name
          query = query.ilike('author', `%${simpleQuery.value}%`);
          break;

        case 'title':
          // Search by title
          query = query.ilike('title', `%${simpleQuery.value}%`);
          break;

        case 'general':
          // General text search across multiple fields
          query = query.or(`title.ilike.%${simpleQuery.value}%, author.ilike.%${simpleQuery.value}%, description.ilike.%${simpleQuery.value}%`);
          break;
      }

      console.log(`${this.LOG_PREFIX} Executing Supabase query...`);
      const { data, error } = await query.order('title').limit(50);

      if (error) {
        console.error(`${this.LOG_PREFIX} Supabase query error:`, error);
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      console.log(`${this.LOG_PREFIX} Supabase query successful. Raw data length: ${data?.length || 0}`);
      console.log(`${this.LOG_PREFIX} First few results:`, data?.slice(0, 3).map(book => ({
        title: book.title,
        pace: book.pace,
        tone: book.tone
      })));
      
      return data || [];
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Direct search failed:`, error);
      throw error;
    }
  }

  /**
   * Map UI reading styles to database pace values
   */
  private mapReadingStyleToPace(readingStyle: string): string {
    const lowerStyle = readingStyle.toLowerCase();
    console.log(`${this.LOG_PREFIX} Mapping reading style: "${readingStyle}" -> "${lowerStyle}"`);
    
    switch (lowerStyle) {
      case 'quick read':
        console.log(`${this.LOG_PREFIX} Mapped to: Fast`);
        return 'Fast';
      case 'deep dive':
      case 'academic':
        console.log(`${this.LOG_PREFIX} Mapped to: Slow`);
        return 'Slow';
      case 'light reading':
      case 'standalone':
      case 'series':
      case 'visual':
      case 'interactive':
      default:
        console.log(`${this.LOG_PREFIX} Mapped to: Moderate (default)`);
        return 'Moderate';
    }
  }

  /**
   * Perform LLM-powered search for complex queries
   */
  private async performLLMSearch(query: string): Promise<Book[]> {
    console.log(`${this.LOG_PREFIX} Performing LLM search for complex query`);

    try {
      // Get LLM analysis
      const llmResult = await this.llmService.analyzeQuery(query);
      
      if (!llmResult.success || !llmResult.analysis) {
        console.log(`${this.LOG_PREFIX} LLM analysis failed, falling back to text search`);
        return await this.performBasicTextSearch(query);
      }

      // Use the analysis to build a sophisticated search
      return await this.performEnhancedSearch(llmResult.analysis);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} LLM search failed:`, error);
      return await this.performBasicTextSearch(query);
    }
  }

  /**
   * Perform enhanced search using LLM analysis
   */
  private async performEnhancedSearch(analysis: QueryAnalysis): Promise<Book[]> {
    console.log(`${this.LOG_PREFIX} Performing enhanced search with analysis:`, {
      themes: analysis.themes,
      categories: analysis.categories,
      moods: analysis.moods,
      professions: analysis.professions,
      pace: analysis.pace
    });

    try {
      // Get all books and score them
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

      // Score-based filtering for flexible matching
      const scoredBooks = allBooks.map(book => {
        let score = 0;
        let matches: string[] = [];

        // Category matching (highest priority)
        if (analysis.categories && analysis.categories.length > 0) {
          const categoryMatches = analysis.categories.filter(category => 
            book.categories && book.categories.includes(category)
          );
          if (categoryMatches.length > 0) {
            score += categoryMatches.length * 5;
            matches.push(`categories: ${categoryMatches.join(', ')}`);
          }
        }

        // Theme matching
        if (analysis.themes && analysis.themes.length > 0) {
          const themeMatches = analysis.themes.filter(theme => 
            book.themes && book.themes.includes(theme)
          );
          if (themeMatches.length > 0) {
            score += themeMatches.length * 3;
            matches.push(`themes: ${themeMatches.join(', ')}`);
          }
        }

        // Mood matching (using tone field)
        if (analysis.moods && analysis.moods.length > 0) {
          const moodMatches = analysis.moods.filter(mood => 
            book.tone && book.tone.includes(mood)
          );
          if (moodMatches.length > 0) {
            score += moodMatches.length * 2;
            matches.push(`moods: ${moodMatches.join(', ')}`);
          }
        }

        // Profession matching
        if (analysis.professions && analysis.professions.length > 0) {
          const professionMatches = analysis.professions.filter(profession => 
            book.professions && book.professions.some((bookProf: string) => 
              bookProf.toLowerCase().includes(profession.toLowerCase()) ||
              profession.toLowerCase().includes(bookProf.toLowerCase())
            )
          );
          if (professionMatches.length > 0) {
            score += professionMatches.length * 2;
            matches.push(`professions: ${professionMatches.join(', ')}`);
          }
        }

        // Pace matching
        if (analysis.pace) {
          const mappedPace = this.mapReadingStyleToPace(analysis.pace);
          if (book.pace === mappedPace) {
            score += 1;
            matches.push(`pace: ${analysis.pace}`);
          }
        }

        // Text matching boost
        if (analysis.enhancedKeywords && analysis.enhancedKeywords.length > 0) {
          const bookText = `${book.title} ${book.author} ${book.description}`.toLowerCase();
          const textMatches = analysis.enhancedKeywords.filter(keyword => 
            bookText.includes(keyword.toLowerCase())
          );
          if (textMatches.length > 0) {
            score += textMatches.length * 1;
            matches.push(`text: ${textMatches.join(', ')}`);
          }
        }

        return { book, score, matches };
      });

      // Filter and sort by score
      const matchedBooks = scoredBooks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50) // Limit results

      console.log(`${this.LOG_PREFIX} Enhanced search scoring complete:`);
      console.log(`${this.LOG_PREFIX} Total books analyzed: ${scoredBooks.length}`);
      console.log(`${this.LOG_PREFIX} Books with score > 0: ${matchedBooks.length}`);
      
      if (matchedBooks.length > 0) {
        console.log(`${this.LOG_PREFIX} Top ${Math.min(3, matchedBooks.length)} results:`);
        matchedBooks.slice(0, 3).forEach((item, index) => {
          console.log(`${this.LOG_PREFIX}   ${index + 1}. ${item.book.title} (score: ${item.score}) | matches: ${item.matches.join(', ')}`);
        });
      } else {
        console.log(`${this.LOG_PREFIX} No books matched the criteria. Sample scores from first 5 books:`);
        scoredBooks.slice(0, 5).forEach((item, index) => {
          console.log(`${this.LOG_PREFIX}   ${index + 1}. ${item.book.title} (score: ${item.score}) | matches: ${item.matches.join(', ')}`);
        });
      }

      const finalResults = matchedBooks.map(item => item.book);
      console.log(`${this.LOG_PREFIX} Enhanced search returned ${finalResults.length} results`);
      return finalResults;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Enhanced search failed:`, error);
      throw error;
    }
  }

  /**
   * Basic text search fallback
   */
  private async performBasicTextSearch(query: string): Promise<Book[]> {
    console.log(`${this.LOG_PREFIX} Performing basic text search fallback`);

    try {
      const { data, error } = await supabase
        .from('book')
        .select('*')
        .or(`title.ilike.%${query}%, author.ilike.%${query}%, description.ilike.%${query}%`)
        .order('title')
        .limit(50);

      if (error) {
        throw new Error(`Basic text search failed: ${error.message}`);
      }

      console.log(`${this.LOG_PREFIX} Basic text search returned ${data?.length || 0} results`);
      return data || [];
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Basic text search failed:`, error);
      return [];
    }
  }
} 