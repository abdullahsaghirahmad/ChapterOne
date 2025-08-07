/**
 * Content Quality Assessment Service
 * 
 * Evaluates content from external sources and determines if AI enhancement is needed.
 * Uses industry-standard content evaluation metrics for production reliability.
 * 
 * @author Senior Engineer - Content Strategy Team
 */

export interface ContentQualityResult {
  score: number; // 1-5 scale
  needsEnhancement: boolean;
  issues: string[];
  recommendations: string[];
  layoutCompatible: boolean;
  sourceReliability: 'high' | 'medium' | 'low' | 'unknown';
}

export interface ContentConstraints {
  description: {
    minLength: number;
    maxLength: number;
    idealLength: { min: number; max: number };
  };
  quote: {
    minLength: number;
    maxLength: number;
    idealLength: { min: number; max: number };
  };
}

export interface ExternalSourceData {
  title?: string;
  author?: string;
  description?: string;
  quote?: string;
  source: 'google_books' | 'open_library' | 'goodreads' | 'manual' | 'unknown' | 'fallback' | 'ai_generated' | 'ai_refined';
  language?: string;
  publishedYear?: number;
  categories?: string[];
}

export class ContentQualityAssessmentService {
  private static readonly LOG_PREFIX = '[CONTENT_QUALITY]';
  
  // UI Layout constraints (based on BookCard design)
  private static readonly CONSTRAINTS: ContentConstraints = {
    description: {
      minLength: 30,      // Minimum for meaningful description
      maxLength: 200,     // Maximum for card layout
      idealLength: { min: 50, max: 150 } // Sweet spot for engagement
    },
    quote: {
      minLength: 10,      // Minimum for meaningful quote
      maxLength: 100,     // Maximum for card layout  
      idealLength: { min: 20, max: 80 }  // Sweet spot for readability
    }
  };

  // Content quality indicators
  private static readonly QUALITY_INDICATORS = {
    low: [
      'no description available',
      'description not available',
      'coming soon',
      'to be announced',
      'check back later',
      'lorem ipsum',
      'placeholder',
      'test description',
      'sample text'
    ],
    marketing: [
      'bestselling author',
      'must-read',
      'don\'t miss',
      'limited time',
      'order now',
      'available in stores',
      'click here',
      'visit our website'
    ],
    generic: [
      'this book is about',
      'the story follows',
      'readers will enjoy',
      'a tale of',
      'journey through',
      'discover the secrets'
    ]
  };

  /**
   * Assess overall content quality for a book
   */
  static assessContent(data: ExternalSourceData): {
    description: ContentQualityResult;
    quote: ContentQualityResult;
    overall: ContentQualityResult;
  } {
    console.log(`${this.LOG_PREFIX} Assessing content quality from ${data.source}`);

    const descriptionResult = this.assessDescription(data.description, data.source);
    const quoteResult = this.assessQuote(data.quote, data.source);
    
    // Calculate overall quality
    const overallScore = Math.round((descriptionResult.score + quoteResult.score) / 2);
    const overallNeeds = descriptionResult.needsEnhancement || quoteResult.needsEnhancement;
    const overallIssues = [...descriptionResult.issues, ...quoteResult.issues];
    const overallRecommendations = [...descriptionResult.recommendations, ...quoteResult.recommendations];

    return {
      description: descriptionResult,
      quote: quoteResult,
      overall: {
        score: overallScore,
        needsEnhancement: overallNeeds,
        issues: overallIssues,
        recommendations: overallRecommendations,
        layoutCompatible: descriptionResult.layoutCompatible && quoteResult.layoutCompatible,
        sourceReliability: this.getSourceReliability(data.source)
      }
    };
  }

  /**
   * Assess description quality
   */
  private static assessDescription(description?: string, source?: string): ContentQualityResult {
    const result: ContentQualityResult = {
      score: 1,
      needsEnhancement: false,
      issues: [],
      recommendations: [],
      layoutCompatible: false,
      sourceReliability: this.getSourceReliability(source)
    };

    // Missing description
    if (!description || description.trim().length === 0) {
      result.score = 1;
      result.needsEnhancement = true;
      result.issues.push('Description is missing');
      result.recommendations.push('Generate AI description');
      return result;
    }

    const text = description.trim();
    const length = text.length;

    // Length analysis
    if (length < this.CONSTRAINTS.description.minLength) {
      result.score = Math.max(result.score, 2);
      result.needsEnhancement = true;
      result.issues.push(`Description too short (${length} chars, need ${this.CONSTRAINTS.description.minLength}+)`);
      result.recommendations.push('Expand description with AI');
    } else if (length > this.CONSTRAINTS.description.maxLength) {
      result.score = Math.max(result.score, 2);
      result.needsEnhancement = true;
      result.issues.push(`Description too long (${length} chars, max ${this.CONSTRAINTS.description.maxLength})`);
      result.recommendations.push('Condense description with AI');
    } else {
      result.layoutCompatible = true;
      result.score = Math.max(result.score, 3);
    }

    // Content quality analysis
    const lowerText = text.toLowerCase();
    
    // Check for low-quality indicators
    const lowQualityFound = this.QUALITY_INDICATORS.low.some(indicator => 
      lowerText.includes(indicator)
    );
    if (lowQualityFound) {
      result.score = Math.min(result.score, 2);
      result.needsEnhancement = true;
      result.issues.push('Contains low-quality placeholder text');
      result.recommendations.push('Replace with AI-generated description');
    }

    // Check for marketing fluff
    const marketingCount = this.QUALITY_INDICATORS.marketing.filter(indicator =>
      lowerText.includes(indicator)
    ).length;
    if (marketingCount >= 2) {
      result.score = Math.min(result.score, 3);
      result.needsEnhancement = true;
      result.issues.push('Heavy marketing language detected');
      result.recommendations.push('Refine to focus on book content');
    }

    // Check for generic language
    const genericCount = this.QUALITY_INDICATORS.generic.filter(indicator =>
      lowerText.includes(indicator)
    ).length;
    if (genericCount >= 2) {
      result.score = Math.min(result.score, 3);
      result.issues.push('Generic description language');
      result.recommendations.push('Enhance with more specific details');
    }

    // Sentence structure analysis
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 2) {
      result.score = Math.min(result.score, 3);
      result.issues.push('Single sentence description');
      result.recommendations.push('Expand to multiple sentences');
    }

    // High-quality indicators
    if (
      length >= this.CONSTRAINTS.description.idealLength.min &&
      length <= this.CONSTRAINTS.description.idealLength.max &&
      sentences.length >= 2 &&
      !lowQualityFound &&
      marketingCount <= 1
    ) {
      result.score = Math.max(result.score, 4);
      
      // Perfect score indicators
      if (sentences.length >= 3 && genericCount === 0) {
        result.score = 5;
      }
    }

    return result;
  }

  /**
   * Assess quote quality
   */
  private static assessQuote(quote?: string, source?: string): ContentQualityResult {
    const result: ContentQualityResult = {
      score: 1,
      needsEnhancement: false,
      issues: [],
      recommendations: [],
      layoutCompatible: false,
      sourceReliability: this.getSourceReliability(source)
    };

    // Missing quote (common for external sources)
    if (!quote || quote.trim().length === 0) {
      result.score = 1;
      result.needsEnhancement = true;
      result.issues.push('Quote is missing');
      result.recommendations.push('Generate AI quote');
      return result;
    }

    const text = quote.trim();
    const length = text.length;

    // Length analysis
    if (length < this.CONSTRAINTS.quote.minLength) {
      result.score = Math.max(result.score, 2);
      result.needsEnhancement = true;
      result.issues.push(`Quote too short (${length} chars, need ${this.CONSTRAINTS.quote.minLength}+)`);
      result.recommendations.push('Generate longer AI quote');
    } else if (length > this.CONSTRAINTS.quote.maxLength) {
      result.score = Math.max(result.score, 2);
      result.needsEnhancement = true;
      result.issues.push(`Quote too long (${length} chars, max ${this.CONSTRAINTS.quote.maxLength})`);
      result.recommendations.push('Shorten quote with AI');
    } else {
      result.layoutCompatible = true;
      result.score = Math.max(result.score, 3);
    }

    // Content quality checks
    const lowerText = text.toLowerCase();

    // Check for marketing/promotional text (not actual book quotes)
    if (
      lowerText.includes('available now') ||
      lowerText.includes('order today') ||
      lowerText.includes('bestseller') ||
      lowerText.includes('review') ||
      lowerText.includes('praise for')
    ) {
      result.score = Math.min(result.score, 2);
      result.needsEnhancement = true;
      result.issues.push('Marketing text instead of book quote');
      result.recommendations.push('Generate thematic AI quote');
    }

    // Check for attribution issues
    if (text.includes(' - ') && !text.startsWith('"')) {
      result.score = Math.min(result.score, 3);
      result.issues.push('Quote formatting needs improvement');
      result.recommendations.push('Clean quote formatting');
    }

    // High-quality quote indicators
    if (
      length >= this.CONSTRAINTS.quote.idealLength.min &&
      length <= this.CONSTRAINTS.quote.idealLength.max &&
      !lowerText.includes('available') &&
      !lowerText.includes('order')
    ) {
      result.score = Math.max(result.score, 4);
      
      // Perfect score for well-formatted, thematic quotes
      if ((text.startsWith('"') && text.endsWith('"')) || text.includes('...')) {
        result.score = 5;
      }
    }

    return result;
  }

  /**
   * Get source reliability rating
   */
  private static getSourceReliability(source?: string): 'high' | 'medium' | 'low' | 'unknown' {
    switch (source) {
      case 'google_books':
        return 'high';      // Direct from publishers
      case 'open_library':
        return 'high';      // Curated library data
      case 'manual':
        return 'high';      // Human-curated
      case 'ai_refined':
        return 'medium';    // AI-enhanced external content
      case 'goodreads':
        return 'medium';    // Community-generated, variable quality
      case 'ai_generated':
        return 'medium';    // AI-generated content
      case 'fallback':
        return 'low';       // Fallback content
      case 'unknown':
      default:
        return 'unknown';
    }
  }

  /**
   * Determine enhancement strategy based on assessment
   */
  static getEnhancementStrategy(assessment: ReturnType<typeof ContentQualityAssessmentService.assessContent>): {
    action: 'use_as_is' | 'ai_refine' | 'ai_generate' | 'manual_review';
    priority: 'low' | 'medium' | 'high';
    estimatedCost: 'free' | 'low' | 'medium' | 'high';
    reasoning: string;
  } {
    const { description, quote, overall } = assessment;

    // Use external content as-is if both are high quality
    if (description.score >= 4 && quote.score >= 3 && overall.layoutCompatible) {
      return {
        action: 'use_as_is',
        priority: 'low',
        estimatedCost: 'free',
        reasoning: 'External content meets quality standards'
      };
    }

    // AI refinement if content exists but needs improvement
    if (description.score >= 2 && quote.score >= 1) {
      return {
        action: 'ai_refine',
        priority: 'medium',
        estimatedCost: 'low',
        reasoning: 'External content exists but needs enhancement'
      };
    }

    // Full AI generation if content is missing or very poor
    if (description.score <= 1 || quote.score <= 1) {
      return {
        action: 'ai_generate',
        priority: 'high',
        estimatedCost: 'medium',
        reasoning: 'Missing or very poor quality content'
      };
    }

    // Manual review for edge cases
    return {
      action: 'manual_review',
      priority: 'medium',
      estimatedCost: 'high',
      reasoning: 'Content quality assessment inconclusive'
    };
  }

  /**
   * Generate quality report for admin interface
   */
  static generateQualityReport(data: ExternalSourceData): {
    summary: string;
    details: ReturnType<typeof ContentQualityAssessmentService.assessContent>;
    strategy: ReturnType<typeof ContentQualityAssessmentService.getEnhancementStrategy>;
    adminFlags: string[];
  } {
    const assessment = this.assessContent(data);
    const strategy = this.getEnhancementStrategy(assessment);
    
    const adminFlags: string[] = [];
    
    if (assessment.overall.score <= 2) {
      adminFlags.push('low_quality_content');
    }
    if (!assessment.overall.layoutCompatible) {
      adminFlags.push('layout_incompatible');
    }
    if (assessment.overall.sourceReliability === 'low') {
      adminFlags.push('unreliable_source');
    }
    if (strategy.action === 'manual_review') {
      adminFlags.push('needs_manual_review');
    }

    const summary = `Quality: ${assessment.overall.score}/5, ` +
                   `Strategy: ${strategy.action}, ` +
                   `Source: ${data.source} (${assessment.overall.sourceReliability})`;

    return {
      summary,
      details: assessment,
      strategy,
      adminFlags
    };
  }
}