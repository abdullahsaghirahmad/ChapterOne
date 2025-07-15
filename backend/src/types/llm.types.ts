// Types for LLM-powered query understanding

export interface QueryAnalysis {
  // Original query for reference
  originalQuery: string;
  
  // Analyzed components
  themes?: string[];
  moods?: string[];
  professions?: string[];
  categories?: string[];
  pace?: string;
  
  // Reading preferences
  readingStyle?: string[];
  
  // Constraints and preferences
  constraints?: {
    maxPages?: number;
    minPages?: number;
    excludeGenres?: string[];
    preferredTone?: string[];
    contentWarnings?: string[];
  };
  
  // Search enhancement
  enhancedKeywords?: string[];
  searchType?: 'title' | 'author' | 'theme' | 'mood' | 'profession' | 'all';
  
  // Confidence and metadata
  confidence?: number;
  analysisTimestamp?: string;
  modelUsed?: string;
}

export interface LLMResponse {
  success: boolean;
  analysis?: QueryAnalysis;
  error?: string;
  processingTime?: number;
  fallbackUsed?: boolean;
}

export interface DevsAIRequest {
  message: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface DevsAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  timeout?: number;
  retries?: number;
} 