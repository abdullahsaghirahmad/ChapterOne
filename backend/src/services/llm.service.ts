import axios from 'axios';
import { QueryAnalysis, LLMResponse, DevsAIRequest, DevsAIResponse, LLMConfig } from '../types/llm.types';

export class LLMService {
  private config: LLMConfig;
  private readonly LOG_PREFIX = '[LLM_SERVICE]';

  constructor() {
    this.config = {
      apiKey: process.env.DEVS_AI_API_KEY || '',
      model: process.env.DEVS_AI_MODEL || 'claude-3-5-sonnet-20241022',
      baseUrl: process.env.DEVS_AI_BASE_URL || 'https://devs.ai/api/v1',
      enabled: process.env.DEVS_AI_ENABLED === 'true',
      timeout: 30000, // 30 seconds
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

    if (!this.config.enabled) {
      console.log(`${this.LOG_PREFIX} LLM is disabled, using fallback`);
      return {
        success: false,
        error: 'LLM service is disabled',
        fallbackUsed: true,
        processingTime: Date.now() - startTime
      };
    }

    if (!this.config.apiKey) {
      console.error(`${this.LOG_PREFIX} API key is missing`);
      return {
        success: false,
        error: 'API key is not configured',
        fallbackUsed: true,
        processingTime: Date.now() - startTime
      };
    }

    try {
      const analysis = await this.performAnalysis(query);
      const processingTime = Date.now() - startTime;

      console.log(`${this.LOG_PREFIX} Analysis completed successfully in ${processingTime}ms:`, {
        themes: analysis.themes,
        moods: analysis.moods,
        professions: analysis.professions,
        confidence: analysis.confidence,
        modelUsed: analysis.modelUsed
      });

      return {
        success: true,
        analysis,
        processingTime,
        fallbackUsed: false
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`${this.LOG_PREFIX} Analysis failed after ${processingTime}ms:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
        fallbackUsed: true
      };
    }
  }

  /**
   * Perform the actual LLM analysis
   */
  private async performAnalysis(query: string): Promise<QueryAnalysis> {
    const prompt = this.buildAnalysisPrompt(query);
    
    console.log(`${this.LOG_PREFIX} Sending request to ${this.config.model}...`);

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
   * Call the devs.ai API using their AI chat system
   */
  private async callDevsAI(prompt: string): Promise<string> {
    console.log(`${this.LOG_PREFIX} Making API request to devs.ai chat system`);

    try {
      // For now, we'll implement a simple fallback since devs.ai requires
      // a specific AI setup. In a real implementation, you would:
      // 1. Create or use an existing AI
      // 2. Create a chat session with that AI
      // 3. Send messages to the chat session
      
      console.log(`${this.LOG_PREFIX} devs.ai integration requires AI setup - using fallback analysis`);
      
      // Temporary implementation: parse the query locally until devs.ai is properly configured
      return this.parseQueryLocally(prompt);
    } catch (error: any) {
      console.error(`${this.LOG_PREFIX} API request failed:`, error);
      throw error;
    }
  }

  /**
   * Local query parsing fallback until devs.ai is properly configured
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
    if (query.includes('psychology') || query.includes('mind') || query.includes('brain')) {
      analysis.categories.push('Psychology');
    }

    // Theme detection (abstract concepts)
    if (query.includes('power') || query.includes('control') || query.includes('authority')) {
      analysis.themes.push('Power');
    }
    if (query.includes('identity') || query.includes('self-discovery') || query.includes('finding yourself')) {
      analysis.themes.push('Identity');
    }
    if (query.includes('family') || query.includes('relationships') || query.includes('friendship')) {
      analysis.themes.push('Family');
    }
    if (query.includes('war') || query.includes('conflict') || query.includes('battle')) {
      analysis.themes.push('War');
    }

    // Mood detection
    if (query.includes('overwhelmed') || query.includes('stressed') || query.includes('calm')) {
      analysis.moods.push('overwhelmed');
    }
    if (query.includes('inspired') || query.includes('motivation') || query.includes('inspiring')) {
      analysis.moods.push('inspired');
    }
    if (query.includes('nostalgic') || query.includes('nostalgia') || query.includes('childhood')) {
      analysis.moods.push('nostalgic');
    }
    if (query.includes('adventure') || query.includes('exciting') || query.includes('thrill')) {
      analysis.moods.push('adventurous');
    }
    if (query.includes('escape') || query.includes('get lost') || query.includes('another world')) {
      analysis.moods.push('escapist');
    }

    // Profession detection
    if (query.includes('software') || query.includes('programming') || query.includes('coding') || query.includes('tech')) {
      analysis.professions.push('Software Engineer');
    }
    if (query.includes('healthcare') || query.includes('medical') || query.includes('doctor') || query.includes('nurse')) {
      analysis.professions.push('Healthcare');
    }
    if (query.includes('business') || query.includes('management') || query.includes('entrepreneur')) {
      analysis.professions.push('Business');
    }
    if (query.includes('education') || query.includes('teacher') || query.includes('academic')) {
      analysis.professions.push('Education');
    }

    // Enhanced keywords
    analysis.enhancedKeywords = query.split(' ').filter(word => word.length > 2);

    console.log(`${this.LOG_PREFIX} Local analysis result:`, analysis);
    
    return JSON.stringify(analysis);
  }

  /**
   * Parse the LLM response into a QueryAnalysis object
   */
  private parseAnalysisResponse(response: string, originalQuery: string): QueryAnalysis {
    console.log(`${this.LOG_PREFIX} Parsing LLM response:`, response.substring(0, 200) + '...');

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

      console.log(`${this.LOG_PREFIX} Successfully parsed analysis:`, analysis);
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
   * Sanitize and validate array fields
   */
  private sanitizeArray(value: any): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    
    const sanitized = value
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim());
    
    return sanitized.length > 0 ? sanitized : undefined;
  }

  /**
   * Update the LLM configuration (for model switching)
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    const oldModel = this.config.model;
    this.config = { ...this.config, ...newConfig };
    
    console.log(`${this.LOG_PREFIX} Configuration updated:`, {
      oldModel,
      newModel: this.config.model,
      enabled: this.config.enabled
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Test the LLM connection
   */
  async testConnection(): Promise<boolean> {
    console.log(`${this.LOG_PREFIX} Testing connection...`);
    
    try {
      const result = await this.analyzeQuery('test query for connection');
      const isConnected = result.success && !result.fallbackUsed;
      
      console.log(`${this.LOG_PREFIX} Connection test ${isConnected ? 'passed' : 'failed'}`);
      return isConnected;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Connection test failed:`, error);
      return false;
    }
  }

  /**
   * Fallback local query analysis when LLM is unavailable
   */
  private performLocalAnalysis(query: string): QueryAnalysis {
    console.log(`${this.LOG_PREFIX} Using local query analysis as fallback`);
    
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);
    
    // Enhanced category detection (genres)
    const categories: string[] = [];
    const categoryKeywords = {
      'Fantasy': ['fantasy', 'magical', 'wizards', 'dragons', 'elves', 'magic'],
      'Science Fiction': ['science fiction', 'sci-fi', 'scifi', 'space', 'futuristic', 'robots', 'ai', 'cyberpunk'],
      'Romance': ['romance', 'love', 'romantic', 'dating'],
      'Mystery': ['mystery', 'detective', 'crime', 'murder', 'investigation'],
      'Thriller': ['thriller', 'suspense', 'action'],
      'Horror': ['horror', 'scary', 'frightening', 'supernatural'],
      'Historical Fiction': ['historical', 'history', 'period', 'era'],
      'Biography': ['biography', 'memoir', 'autobiography'],
      'Self-Help': ['self-help', 'self help', 'improvement', 'productivity'],
      'Business': ['business', 'entrepreneurship', 'leadership', 'management'],
      'Philosophy': ['philosophy', 'philosophical', 'ethics'],
      'Psychology': ['psychology', 'psychological', 'mental', 'behavior']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        categories.push(category);
      }
    }

    // More conservative theme detection (abstract concepts only)
    const themes: string[] = [];
    const themeKeywords = {
      'Power': ['power', 'control', 'authority', 'dominance', 'influence'],
      'Identity': ['identity', 'self-discovery', 'who am i', 'finding myself'],
      'Love': ['love', 'relationship', 'heartbreak', 'romance', 'passion'],
      'War': ['war', 'battle', 'conflict', 'military', 'combat', 'soldiers'],
      'Family': ['family', 'parents', 'children', 'siblings', 'relatives'],
      'Friendship': ['friendship', 'friends', 'loyalty', 'companions'],
      'Betrayal': ['betrayal', 'deception', 'lies', 'backstab'],
      'Redemption': ['redemption', 'forgiveness', 'second chance', 'atonement'],
      'Survival': ['survival', 'survive', 'endurance', 'perseverance'],
      'Coming of Age': ['growing up', 'maturity', 'adolescent', 'teenager'],
      'Good vs Evil': ['good vs evil', 'moral', 'ethics', 'right wrong'],
      'Technology': ['technology', 'tech', 'digital', 'artificial intelligence', 'computers']
    };

    // Only add themes if they're explicitly mentioned and not part of a genre
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword)) && categories.length === 0) {
        themes.push(theme);
      }
    }

    // Profession detection
    const professions: string[] = [];
    const professionKeywords = {
      'Software Engineer': ['software engineer', 'programmer', 'developer', 'coder', 'tech worker'],
      'Doctor': ['doctor', 'physician', 'medical', 'healthcare'],
      'Teacher': ['teacher', 'educator', 'professor', 'academic'],
      'Lawyer': ['lawyer', 'attorney', 'legal', 'law'],
      'Business Professional': ['business', 'executive', 'manager', 'entrepreneur'],
      'Scientist': ['scientist', 'researcher', 'research'],
      'Artist': ['artist', 'creative', 'designer'],
      'Writer': ['writer', 'author', 'journalist'],
      'Student': ['student', 'college', 'university', 'school']
    };

    for (const [profession, keywords] of Object.entries(professionKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        professions.push(profession);
      }
    }

    // Enhanced mood detection
    const moods: string[] = [];
    const moodKeywords = {
      'Dark': ['dark', 'grim', 'depressing', 'heavy', 'serious'],
      'Light': ['light', 'uplifting', 'cheerful', 'happy', 'positive'],
      'Inspirational': ['inspirational', 'motivational', 'uplifting', 'encouraging'],
      'Humorous': ['funny', 'humorous', 'comedy', 'witty', 'hilarious'],
      'Romantic': ['romantic', 'love', 'passion', 'heart-warming'],
      'Suspenseful': ['suspenseful', 'thrilling', 'edge of seat', 'tension'],
      'Thought-provoking': ['thought-provoking', 'philosophical', 'deep', 'meaningful'],
      'Nostalgic': ['nostalgic', 'memories', 'past', 'reminiscent'],
      'Adventurous': ['adventurous', 'exciting', 'action-packed', 'thrilling']
    };

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        moods.push(mood);
      }
    }

    // Pace detection
    let pace: string | undefined;
    if (lowerQuery.includes('fast') || lowerQuery.includes('quick')) {
      pace = 'Fast';
    } else if (lowerQuery.includes('slow') || lowerQuery.includes('relaxed')) {
      pace = 'Slow';
    }

    // Reading style detection
    const readingStyle: string[] = [];
    if (lowerQuery.includes('easy') || lowerQuery.includes('light')) {
      readingStyle.push('easy');
    }
    if (lowerQuery.includes('challenging') || lowerQuery.includes('complex')) {
      readingStyle.push('challenging');
    }

    // Enhanced keywords - extract meaningful words
    const enhancedKeywords = query.split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['and', 'the', 'for', 'with', 'that', 'this', 'are'].includes(word.toLowerCase()));

    console.log(`${this.LOG_PREFIX} Local analysis result:`, {
      themes,
      moods,
      professions,
      categories,
      pace,
      readingStyle,
      constraints: {},
      enhancedKeywords,
      searchType: 'all',
      confidence: 0.6
    });

    return {
      originalQuery: query,
      themes: themes.length > 0 ? themes : undefined,
      moods: moods.length > 0 ? moods : undefined,
      professions: professions.length > 0 ? professions : undefined,
      categories: categories.length > 0 ? categories : undefined,
      pace,
      readingStyle: readingStyle.length > 0 ? readingStyle : undefined,
      constraints: {},
      enhancedKeywords,
      searchType: 'all',
      confidence: 0.6,
      analysisTimestamp: new Date().toISOString(),
      modelUsed: this.config.model
    };
  }
} 