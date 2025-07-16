import axios from 'axios';

export interface QueryAnalysis {
  originalQuery: string;
  themes?: string[];
  moods?: string[];
  professions?: string[];
  categories?: string[];
  pace?: string;
  readingStyle?: string[];
  constraints?: {
    maxPages?: number;
    minPages?: number;
    excludeGenres?: string[];
    preferredTone?: string[];
    contentWarnings?: string[];
  };
  enhancedKeywords?: string[];
  searchType: 'title' | 'author' | 'theme' | 'mood' | 'profession' | 'all';
  confidence: number;
  analysisTimestamp?: string;
  modelUsed?: string;
}

export interface LLMResponse {
  success: boolean;
  analysis?: QueryAnalysis;
  error?: string;
  processingTime: number;
  fallbackUsed: boolean;
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  timeout: number;
  retries: number;
}

export class LLMService {
  private config: LLMConfig;
  private readonly LOG_PREFIX = '[LLM_SERVICE]';

  constructor() {
    this.config = {
      apiKey: process.env.REACT_APP_DEVS_AI_API_KEY || '',
      model: process.env.REACT_APP_DEVS_AI_MODEL || 'claude-3-5-sonnet-20241022',
      baseUrl: process.env.REACT_APP_DEVS_AI_BASE_URL || 'https://devs.ai/api/v1',
      enabled: process.env.REACT_APP_DEVS_AI_ENABLED === 'true',
      timeout: 30000,
      retries: 2
    };

    console.log(`${this.LOG_PREFIX} Initialized with config:`, {
      model: this.config.model,
      baseUrl: this.config.baseUrl,
      enabled: this.config.enabled,
      hasApiKey: !!this.config.apiKey
    });
  }

  /**
   * Analyze a natural language query to extract book search parameters
   */
  async analyzeQuery(query: string): Promise<LLMResponse> {
    const startTime = Date.now();
    
    console.log(`${this.LOG_PREFIX} Starting query analysis for: "${query}"`);

    if (!this.config.enabled || !this.config.apiKey) {
      console.log(`${this.LOG_PREFIX} LLM is disabled or API key missing, using fallback`);
      return this.performLocalAnalysis(query, startTime);
    }

    try {
      const analysis = await this.performAnalysis(query);
      const processingTime = Date.now() - startTime;

      console.log(`${this.LOG_PREFIX} Analysis completed successfully in ${processingTime}ms`);

      return {
        success: true,
        analysis,
        processingTime,
        fallbackUsed: false
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`${this.LOG_PREFIX} Analysis failed after ${processingTime}ms:`, error);

      // Fallback to local analysis
      return this.performLocalAnalysis(query, startTime);
    }
  }

  /**
   * Perform the actual LLM analysis
   */
  private async performAnalysis(query: string): Promise<QueryAnalysis> {
    const prompt = this.buildAnalysisPrompt(query);
    
    console.log(`${this.LOG_PREFIX} Sending request to ${this.config.model}...`);

    // For now, use local fallback until devs.ai is fully configured
    const response = await this.callDevsAI(prompt);
    const analysis = this.parseAnalysisResponse(response, query);

    return analysis;
  }

  /**
   * Build the prompt for query analysis
   */
  private buildAnalysisPrompt(query: string): string {
    return `You are a book recommendation expert. Analyze the following user query and extract relevant search parameters in JSON format.

User Query: "${query}"

Please analyze this query and return a JSON object with the following structure:
{
  "themes": ["string array of abstract concepts like 'Power', 'Identity', 'Love', 'War', 'Politics', etc."],
  "categories": ["string array of book genres like 'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller', 'Self-Help', 'Business', 'Biography', etc."],
  "moods": ["string array of emotional states like 'overwhelmed', 'inspired', 'nostalgic', etc."],
  "professions": ["string array of professional contexts like 'Software Engineer', 'Healthcare', etc."],
  "pace": "string for reading pace like 'Quick Read', 'Deep Dive', etc.",
  "readingStyle": ["string array of reading preferences"],
  "constraints": {
    "maxPages": number or null,
    "minPages": number or null,
    "excludeGenres": ["string array"],
    "preferredTone": ["string array"],
    "contentWarnings": ["string array"]
  },
  "enhancedKeywords": ["string array of additional search terms"],
  "searchType": "string: 'title', 'author', 'theme', 'mood', 'profession', or 'all'",
  "confidence": number between 0 and 1
}

Guidelines:
- THEMES are abstract concepts: Power, Love, Identity, War, Politics, Family, Friendship, etc.
- CATEGORIES are book genres: Fantasy, Science Fiction, Romance, Mystery, Thriller, Self-Help, Business, Biography, etc.
- Extract only what is clearly mentioned or strongly implied
- Use standardized moods: overwhelmed, inspired, nostalgic, adventurous, romantic, curious, etc.
- Be conservative with constraints - only include if explicitly mentioned
- Set confidence based on how clear the query is
- For queries like "fantasy books", put "Fantasy" in categories, not themes
- For complex queries, extract multiple dimensions

Return only the JSON object, no additional text.`;
  }

  /**
   * Call devs.ai API (currently using local fallback)
   */
  private async callDevsAI(prompt: string): Promise<string> {
    console.log(`${this.LOG_PREFIX} Making API request to devs.ai chat system`);

    try {
      // TODO: Implement actual devs.ai API call when configured
      console.log(`${this.LOG_PREFIX} devs.ai integration requires setup - using fallback analysis`);
      
      // Temporary implementation: parse the query locally until devs.ai is properly configured
      return this.parseQueryLocally(prompt);
    } catch (error: any) {
      console.error(`${this.LOG_PREFIX} API request failed:`, error);
      throw error;
    }
  }

  /**
   * Local query parsing fallback
   */
  private parseQueryLocally(prompt: string): string {
    console.log(`${this.LOG_PREFIX} Using local query analysis as fallback`);
    
    // Extract the user query from the prompt
    const queryMatch = prompt.match(/User Query: "([^"]+)"/);
    const query = queryMatch ? queryMatch[1].toLowerCase() : '';
    
    // Simple keyword-based analysis
    const analysis: any = {
      themes: [],
      moods: [],
      professions: [],
      categories: [],
      pace: null,
      readingStyle: [],
      constraints: {},
      enhancedKeywords: [],
      searchType: 'all',
      confidence: 0.6
    };

    // Category/Genre detection
    if (query.includes('fantasy') || query.includes('magic') || query.includes('wizard')) {
      analysis.categories.push('Fantasy');
    }
    if (query.includes('science fiction') || query.includes('sci-fi') || query.includes('space') || query.includes('robot')) {
      analysis.categories.push('Science Fiction');
    }
    if (query.includes('romance') || query.includes('love') || query.includes('romantic')) {
      analysis.categories.push('Romance');
    }
    if (query.includes('mystery') || query.includes('detective') || query.includes('crime')) {
      analysis.categories.push('Mystery');
    }
    if (query.includes('self-help') || query.includes('personal development') || query.includes('productivity')) {
      analysis.categories.push('Self-Help');
    }
    if (query.includes('business') || query.includes('entrepreneurship') || query.includes('leadership')) {
      analysis.categories.push('Business');
    }
    if (query.includes('biography') || query.includes('memoir') || query.includes('life story')) {
      analysis.categories.push('Biography');
    }
    if (query.includes('history') || query.includes('historical')) {
      analysis.categories.push('History');
    }

    // Theme detection (abstract concepts)
    const themeKeywords = {
      'Love': ['love', 'romance', 'relationship', 'heart', 'passion'],
      'Family': ['family', 'parent', 'child', 'sibling', 'mother', 'father'],
      'Friendship': ['friend', 'friendship', 'companion', 'buddy'],
      'Power': ['power', 'control', 'authority', 'dominance', 'influence'],
      'Identity': ['identity', 'self', 'who am i', 'belonging', 'self-discovery'],
      'Adventure': ['adventure', 'journey', 'quest', 'exploration', 'travel'],
      'War': ['war', 'battle', 'conflict', 'military', 'soldier'],
      'Politics': ['politics', 'government', 'election', 'democracy', 'political'],
      'Psychology': ['psychology', 'mind', 'mental', 'behavior', 'cognitive']
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        analysis.themes.push(theme);
      }
    }

    // Mood detection
    const moodKeywords = {
      'Feeling overwhelmed': ['overwhelmed', 'stressed', 'anxious', 'pressure'],
      'Need inspiration': ['inspiration', 'motivate', 'uplift', 'encourage'],
      'Want to escape': ['escape', 'distraction', 'forget', 'immerse'],
      'Looking for adventure': ['adventure', 'exciting', 'thrill', 'action'],
      'Curious about life': ['curious', 'wonder', 'explore', 'understand'],
      'Need guidance': ['guidance', 'advice', 'help', 'direction']
    };

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        analysis.moods.push(mood);
      }
    }

    // Profession detection
    const professionKeywords = {
      'Technology': ['technology', 'software', 'programming', 'coding', 'tech', 'developer'],
      'Business': ['business', 'entrepreneur', 'startup', 'management', 'corporate'],
      'Healthcare': ['healthcare', 'medical', 'doctor', 'nurse', 'health'],
      'Education': ['education', 'teaching', 'teacher', 'learning', 'academic']
    };

    for (const [profession, keywords] of Object.entries(professionKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        analysis.professions.push(profession);
      }
    }

    // Pace detection
    if (query.includes('quick') || query.includes('fast') || query.includes('short')) {
      analysis.pace = 'Quick Read';
    } else if (query.includes('deep') || query.includes('comprehensive') || query.includes('detailed')) {
      analysis.pace = 'Deep Dive';
    }

    // Extract meaningful keywords
    const enhancedKeywords = query.split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['and', 'the', 'for', 'with', 'that', 'this', 'are', 'like', 'books'].includes(word.toLowerCase()));

    analysis.enhancedKeywords = enhancedKeywords;

    return JSON.stringify(analysis);
  }

  /**
   * Parse the LLM response into a QueryAnalysis object
   */
  private parseAnalysisResponse(response: string, originalQuery: string): QueryAnalysis {
    console.log(`${this.LOG_PREFIX} Parsing LLM response`);

    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      const analysis: QueryAnalysis = {
        originalQuery,
        themes: this.sanitizeArray(parsed.themes),
        moods: this.sanitizeArray(parsed.moods),
        professions: this.sanitizeArray(parsed.professions),
        categories: this.sanitizeArray(parsed.categories),
        pace: typeof parsed.pace === 'string' ? parsed.pace : undefined,
        readingStyle: this.sanitizeArray(parsed.readingStyle),
        constraints: parsed.constraints || {},
        enhancedKeywords: this.sanitizeArray(parsed.enhancedKeywords),
        searchType: parsed.searchType || 'all',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        analysisTimestamp: new Date().toISOString(),
        modelUsed: this.config.model
      };

      console.log(`${this.LOG_PREFIX} Successfully parsed analysis:`, {
        categories: analysis.categories,
        themes: analysis.themes,
        moods: analysis.moods,
        professions: analysis.professions,
        pace: analysis.pace,
        enhancedKeywords: analysis.enhancedKeywords
      });
      return analysis;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Failed to parse response:`, error);
      
      // Return minimal analysis if parsing fails
      return {
        originalQuery,
        enhancedKeywords: [originalQuery],
        searchType: 'all',
        confidence: 0.1,
        analysisTimestamp: new Date().toISOString(),
        modelUsed: this.config.model
      };
    }
  }

  /**
   * Perform local analysis as fallback
   */
  private performLocalAnalysis(query: string, startTime: number): LLMResponse {
    try {
      const analysis = this.performLocalQueryAnalysis(query);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        analysis,
        processingTime,
        fallbackUsed: true
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
        fallbackUsed: true
      };
    }
  }

  /**
   * Local query analysis without LLM
   */
  private performLocalQueryAnalysis(query: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();
    
    // Simple classification logic
    const categories: string[] = [];
    const themes: string[] = [];
    const moods: string[] = [];
    const professions: string[] = [];
    
    // Category detection
    if (lowerQuery.includes('fantasy') || lowerQuery.includes('magic')) categories.push('Fantasy');
    if (lowerQuery.includes('science fiction') || lowerQuery.includes('sci-fi')) categories.push('Science Fiction');
    if (lowerQuery.includes('romance') || lowerQuery.includes('love story')) categories.push('Romance');
    if (lowerQuery.includes('mystery') || lowerQuery.includes('detective')) categories.push('Mystery');
    if (lowerQuery.includes('self-help') || lowerQuery.includes('personal development')) categories.push('Self-Help');
    if (lowerQuery.includes('business') || lowerQuery.includes('entrepreneur')) categories.push('Business');
    
    // Theme detection
    if (lowerQuery.includes('love') || lowerQuery.includes('relationship')) themes.push('Love');
    if (lowerQuery.includes('family') || lowerQuery.includes('parent')) themes.push('Family');
    if (lowerQuery.includes('adventure') || lowerQuery.includes('journey')) themes.push('Adventure');
    if (lowerQuery.includes('power') || lowerQuery.includes('politics')) themes.push('Power');
    
    // Mood detection
    if (lowerQuery.includes('overwhelmed') || lowerQuery.includes('stressed')) moods.push('Feeling overwhelmed');
    if (lowerQuery.includes('inspiration') || lowerQuery.includes('motivate')) moods.push('Need inspiration');
    if (lowerQuery.includes('escape') || lowerQuery.includes('distract')) moods.push('Want to escape');
    if (lowerQuery.includes('adventure') || lowerQuery.includes('exciting')) moods.push('Looking for adventure');
    
    // Profession detection
    if (lowerQuery.includes('tech') || lowerQuery.includes('programming')) professions.push('Technology');
    if (lowerQuery.includes('business') || lowerQuery.includes('management')) professions.push('Business');
    if (lowerQuery.includes('healthcare') || lowerQuery.includes('medical')) professions.push('Healthcare');
    
    // Pace detection
    let pace: string | undefined;
    if (lowerQuery.includes('quick') || lowerQuery.includes('short')) pace = 'Quick Read';
    else if (lowerQuery.includes('deep') || lowerQuery.includes('comprehensive')) pace = 'Deep Dive';
    
    // Enhanced keywords
    const enhancedKeywords = query.split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['and', 'the', 'for', 'with', 'that', 'this', 'are', 'like', 'books'].includes(word.toLowerCase()));

    return {
      originalQuery: query,
      themes: themes.length > 0 ? themes : undefined,
      categories: categories.length > 0 ? categories : undefined,
      moods: moods.length > 0 ? moods : undefined,
      professions: professions.length > 0 ? professions : undefined,
      pace,
      enhancedKeywords,
      searchType: 'all',
      confidence: 0.7,
      analysisTimestamp: new Date().toISOString(),
      modelUsed: 'local-fallback'
    };
  }

  /**
   * Sanitize array inputs
   */
  private sanitizeArray(input: any): string[] | undefined {
    if (!Array.isArray(input)) return undefined;
    return input.filter(item => typeof item === 'string' && item.length > 0);
  }

  /**
   * Generate a compelling 2-line description for a book
   */
  async generateDescription(title: string, author: string, existingDescription?: string): Promise<string> {
    console.log(`${this.LOG_PREFIX} Generating description for: "${title}" by ${author}`);

    if (!this.config.enabled || !this.config.apiKey) {
      console.log(`${this.LOG_PREFIX} LLM disabled, using fallback description generation`);
      return this.generateFallbackDescription(title, author, existingDescription);
    }

    try {
      const prompt = this.buildDescriptionPrompt(title, author, existingDescription);
      const response = await this.callDevsAI(prompt);
      
      // Parse the response to extract the description
      const description = this.parseDescriptionResponse(response);
      
      if (description && description.length > 10) {
        console.log(`${this.LOG_PREFIX} Generated description: ${description.substring(0, 50)}...`);
        return description;
      } else {
        return this.generateFallbackDescription(title, author, existingDescription);
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Description generation failed:`, error);
      return this.generateFallbackDescription(title, author, existingDescription);
    }
  }

  /**
   * Generate a notable quote for a book
   */
  async generateQuote(title: string, author: string, description?: string): Promise<string> {
    console.log(`${this.LOG_PREFIX} Generating quote for: "${title}" by ${author}`);

    if (!this.config.enabled || !this.config.apiKey) {
      console.log(`${this.LOG_PREFIX} LLM disabled, using fallback quote generation`);
      return this.generateFallbackQuote(title, author);
    }

    try {
      const prompt = this.buildQuotePrompt(title, author, description);
      const response = await this.callDevsAI(prompt);
      
      // Parse the response to extract the quote
      const quote = this.parseQuoteResponse(response);
      
      if (quote && quote.length > 10) {
        console.log(`${this.LOG_PREFIX} Generated quote: ${quote.substring(0, 30)}...`);
        return quote;
      } else {
        return this.generateFallbackQuote(title, author);
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Quote generation failed:`, error);
      return this.generateFallbackQuote(title, author);
    }
  }

  /**
   * Build prompt for description generation
   */
  private buildDescriptionPrompt(title: string, author: string, existingDescription?: string): string {
    return `You are a book marketing expert. Create a compelling 2-line description for this book that would make readers want to read it.

Book: "${title}" by ${author}
${existingDescription ? `Current description: ${existingDescription}` : 'No existing description available.'}

Requirements:
- Maximum 2 lines (about 120-140 characters total)
- Compelling and engaging
- Captures the essence and appeal of the book
- Makes readers curious to learn more
- Professional marketing tone

Return only the 2-line description, no quotes or additional text.`;
  }

  /**
   * Build prompt for quote generation
   */
  private buildQuotePrompt(title: string, author: string, description?: string): string {
    return `You are a literary expert. Generate a notable, inspiring quote that would be associated with this book.

Book: "${title}" by ${author}
${description ? `Description: ${description}` : ''}

Requirements:
- Create a memorable, quotable line that fits the book's theme
- Should sound like it could be from the book or about the book's message
- Inspiring, thought-provoking, or emotionally resonant
- 10-25 words maximum
- No attribution needed

Return only the quote, no quotation marks or additional text.`;
  }

  /**
   * Parse description response
   */
  private parseDescriptionResponse(response: string): string {
    // Clean up the response
    let description = response.trim();
    
    // Remove quotes if present
    description = description.replace(/^["']|["']$/g, '');
    
    // Ensure it's not too long (max 2 lines ≈ 140 chars)
    if (description.length > 140) {
      const sentences = description.split('. ');
      if (sentences.length > 1) {
        description = sentences[0] + '. ' + sentences[1].substring(0, 140 - sentences[0].length - 2);
      } else {
        description = description.substring(0, 137) + '...';
      }
    }
    
    return description;
  }

  /**
   * Parse quote response
   */
  private parseQuoteResponse(response: string): string {
    // Clean up the response
    let quote = response.trim();
    
    // Remove outer quotes if present
    quote = quote.replace(/^["']|["']$/g, '');
    
    // Ensure reasonable length
    if (quote.length > 150) {
      quote = quote.substring(0, 147) + '...';
    }
    
    return quote;
  }

  /**
   * Generate fallback description when LLM is unavailable
   */
  private generateFallbackDescription(title: string, author: string, existingDescription?: string): string {
    if (existingDescription && existingDescription !== 'No description available') {
      // Truncate existing description to 2 lines
      const sentences = existingDescription.split('. ');
      if (sentences.length >= 2) {
        let result = sentences[0] + '. ' + sentences[1];
        if (result.length > 140) {
          result = result.substring(0, 137) + '...';
        }
        return result;
      } else if (existingDescription.length > 140) {
        return existingDescription.substring(0, 137) + '...';
      }
      return existingDescription;
    }
    
    // Generate basic description
    const templates = [
      `A compelling story by ${author} that explores profound themes. Discover what makes "${title}" a remarkable read.`,
      `${author} crafts an engaging narrative in "${title}". A book that promises to captivate and inspire readers.`,
      `"${title}" by ${author} offers readers an unforgettable journey. A thoughtfully written work worth exploring.`,
      `An insightful work by ${author} that delves into meaningful themes. "${title}" provides a rich reading experience.`
    ];
    
    const hash = (title.length + author.length) % templates.length;
    return templates[hash];
  }

  /**
   * Generate fallback quote when LLM is unavailable
   */
  private generateFallbackQuote(title: string, author: string): string {
    const quotes = [
      "The journey of a thousand miles begins with one step.",
      "Sometimes the heart sees what is invisible to the eye.",
      "Tell me and I forget, teach me and I may remember, involve me and I learn.",
      "The future belongs to those who believe in the beauty of their dreams.",
      "In the end, we will remember not the words of our enemies, but the silence of our friends.",
      "The greatest glory in living lies not in never falling, but in rising every time we fall.",
      "It is during our darkest moments that we must focus to see the light.",
      "Life is what happens to you while you're busy making other plans.",
      "The way to get started is to quit talking and begin doing.",
      "Innovation distinguishes between a leader and a follower."
    ];
    
    const hash = (title.length + author.length) % quotes.length;
    return quotes[hash];
  }
} 