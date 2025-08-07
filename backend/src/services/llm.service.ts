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
   * Call the devs.ai API using their chat completions endpoint
   */
  private async callDevsAI(prompt: string): Promise<string> {
    console.log(`${this.LOG_PREFIX} Making API request to devs.ai chat completions`);

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/chats/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      if (response.data?.choices?.[0]?.message?.content) {
        const content = response.data.choices[0].message.content;
        console.log(`${this.LOG_PREFIX} API request successful, received ${content.length} characters`);
        return content;
      } else {
        throw new Error('Invalid response format from devs.ai API');
      }
    } catch (error: any) {
      console.error(`${this.LOG_PREFIX} API request failed:`, error?.response?.data || error.message);
      
      // If API fails, fall back to local parsing
      console.log(`${this.LOG_PREFIX} Falling back to local query analysis`);
      return this.parseQueryLocally(prompt);
    }
  }

  /**
   * Generate a compelling description for a book using AI
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
   * Generate a notable quote for a book using AI
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
      
      if (quote && quote.length > 5) {
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
   * Build prompt for description generation
   */
  private buildDescriptionPrompt(title: string, author: string, existingDescription?: string): string {
    return `Generate a compelling 2-line book description for "${title}" by ${author}.

Requirements:
- Maximum 2 sentences (140 characters or less)
- Engaging and professional tone
- Focus on what makes this book unique
- Avoid generic phrases
${existingDescription ? `- Current description: "${existingDescription}"` : ''}

Return only the description text, no additional formatting.`;
  }

  /**
   * Build prompt for quote generation
   */
  private buildQuotePrompt(title: string, author: string, description?: string): string {
    return `Generate a meaningful, inspiring quote that would resonate with readers of "${title}" by ${author}.

Requirements:
- Should feel relevant to the book's themes
- Inspirational or thought-provoking
- 10-50 words maximum
- No attribution needed
${description ? `- Book context: "${description}"` : ''}

Return only the quote text, no additional formatting.`;
  }

  /**
   * Parse description from AI response
   */
  private parseDescriptionResponse(response: string): string {
    // Clean up the response - remove quotes, extra whitespace, etc.
    let description = response.trim();
    
    // Remove surrounding quotes if present
    if (description.startsWith('"') && description.endsWith('"')) {
      description = description.slice(1, -1);
    }
    
    // Ensure it's not too long
    if (description.length > 140) {
      const sentences = description.split('. ');
      if (sentences.length >= 2) {
        description = sentences[0] + '. ' + sentences[1];
        if (description.length > 140) {
          description = description.substring(0, 137) + '...';
        }
      } else {
        description = description.substring(0, 137) + '...';
      }
    }
    
    return description;
  }

  /**
   * Parse quote from AI response
   */
  private parseQuoteResponse(response: string): string {
    let quote = response.trim();
    
    // Remove surrounding quotes if present
    if (quote.startsWith('"') && quote.endsWith('"')) {
      quote = quote.slice(1, -1);
    }
    
    // Remove any attribution if present
    quote = quote.replace(/\s*[-–—]\s*[^,]+$/, '');
    
    // Ensure reasonable length
    if (quote.length > 100) {
      const words = quote.split(' ');
      quote = words.slice(0, 15).join(' ') + (words.length > 15 ? '...' : '');
    }
    
    return quote;
  }

  /**
   * Generate improved fallback description
   */
  private generateFallbackDescription(title: string, author: string, existingDescription?: string): string {
    if (existingDescription && existingDescription !== 'No description available' && existingDescription.length > 20) {
      // Use existing description but truncate it nicely
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
    
    // Graceful fallback message instead of generic templates
    return `"${title}" by ${author} - AI-generated description coming soon. Click to explore this book.`;
  }

  /**
   * Generate improved fallback quote
   */
  private generateFallbackQuote(title: string, author: string): string {
    // Instead of cycling through generic quotes, show a loading state
    return `"Discovering the perfect quote from ${title}..." - AI content loading`;
  }
} 