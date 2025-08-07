/**
 * Hybrid Content Creation Service
 * 
 * Orchestrates the complete content creation pipeline:
 * External APIs → Quality Assessment → AI Enhancement → Storage
 * 
 * @author Senior Engineer - Content Strategy Team
 */

import { ContentQualityAssessmentService, ExternalSourceData } from './contentQualityAssessment.service';
import { BookContentEnhancementService } from './bookContentEnhancement.service';
import { FeatureFlagService } from './featureFlag.service';

export interface BookCreationInput {
  title: string;
  author: string;
  isbn?: string;
  source?: 'manual' | 'import' | 'admin' | 'api';
  userId?: string;
}

export interface HybridContentResult {
  success: boolean;
  bookData: {
    // Core book fields
    title: string;
    author: string;
    isbn?: string;
    publishedYear?: number;
    coverImage?: string;
    pageCount?: number;
    categories?: string[];
    
    // Content fields
    description: string;
    quote: string;
    
    // Source tracking
    description_source: string;
    quote_source: string;
    description_quality_score: number;
    quote_quality_score: number;
    
    // Enhancement tracking
    ai_enhancement_needed: boolean;
    last_ai_enhancement_at?: Date;
    original_description?: string;
    original_quote?: string;
    external_api_data: any;
    enhancement_history: any[];
  };
  
  // Process metadata
  processingLog: {
    externalFetchTime: number;
    qualityAssessmentTime: number;
    aiEnhancementTime: number;
    totalTime: number;
    sourcesUsed: string[];
    enhancementsApplied: string[];
    errors: string[];
    warnings: string[];
  };
  
  // Quality report for admin
  qualityReport: {
    summary: string;
    strategy: string;
    flags: string[];
    confidence: number;
  };
}

export class HybridContentCreationService {
  private static readonly LOG_PREFIX = '[HYBRID_CONTENT]';
  
  // Check feature flags for hybrid pipeline features
  private static async isHybridPipelineEnabled(userId?: string): Promise<boolean> {
    try {
      return await FeatureFlagService.isFeatureEnabled('hybrid_content_creation', userId);
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} Failed to check feature flag, defaulting to disabled:`, error);
      return false;
    }
  }
  
  private static async isAIEnhancementEnabled(userId?: string): Promise<boolean> {
    try {
      return await FeatureFlagService.isFeatureEnabled('ai_content_enhancement', userId);
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} Failed to check AI enhancement flag, defaulting to disabled:`, error);
      return false;
    }
  }
  
  // Timeouts for external API calls
  private static readonly TIMEOUTS = {
    externalApi: 10000,    // 10 seconds max for external APIs
    aiEnhancement: 30000,  // 30 seconds max for AI processing
  };

  /**
   * Create book content using hybrid pipeline
   */
  static async createBookContent(input: BookCreationInput): Promise<HybridContentResult> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} Starting hybrid content creation for: "${input.title}" by ${input.author}`);

    // Check if hybrid pipeline is enabled via feature flag
    const hybridEnabled = await this.isHybridPipelineEnabled(input.userId);
    const aiEnhancementEnabled = await this.isAIEnhancementEnabled(input.userId);
    
    console.log(`${this.LOG_PREFIX} Feature flags - Hybrid: ${hybridEnabled}, AI Enhancement: ${aiEnhancementEnabled}`);

    const result: HybridContentResult = {
      success: false,
      bookData: {
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        description: '',
        quote: '',
        description_source: 'unknown',
        quote_source: 'unknown',
        description_quality_score: 1,
        quote_quality_score: 1,
        ai_enhancement_needed: true,
        external_api_data: {},
        enhancement_history: []
      },
      processingLog: {
        externalFetchTime: 0,
        qualityAssessmentTime: 0,
        aiEnhancementTime: 0,
        totalTime: 0,
        sourcesUsed: [],
        enhancementsApplied: [],
        errors: [],
        warnings: []
      },
      qualityReport: {
        summary: '',
        strategy: 'unknown',
        flags: [],
        confidence: 0
      }
    };

    try {
      if (!hybridEnabled) {
        // If hybrid pipeline is disabled, generate fallback content immediately
        console.log(`${this.LOG_PREFIX} Hybrid pipeline disabled by feature flag, using fallback content`);
        await this.generateFallbackContent(input, result);
        result.success = true;
        result.processingLog.totalTime = Date.now() - startTime;
        return result;
      }

      // Phase 1: Fetch from external sources
      const externalData = await this.fetchFromExternalSources(input, result.processingLog);
      
      // Phase 2: Assess content quality
      const qualityAssessment = await this.assessContentQuality(externalData, result.processingLog);
      
      // Phase 3: Apply AI enhancement if needed (controlled by separate feature flag)
      const enhancedContent = await this.applyAIEnhancement(
        externalData, 
        qualityAssessment, 
        result.processingLog,
        aiEnhancementEnabled,
        input.title,
        input.author
      );
      
      // Phase 4: Compile final book data
      result.bookData = {
        ...result.bookData,
        ...externalData,
        ...enhancedContent,
        enhancement_history: this.buildEnhancementHistory(externalData, qualityAssessment, enhancedContent)
      };
      
      // Phase 5: Generate quality report
      result.qualityReport = this.generateQualityReport(qualityAssessment, result.processingLog);
      
      result.success = true;
      result.processingLog.totalTime = Date.now() - startTime;
      
      console.log(`${this.LOG_PREFIX} Hybrid content creation completed in ${result.processingLog.totalTime}ms`);
      
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Hybrid content creation failed:`, error);
      result.processingLog.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingLog.totalTime = Date.now() - startTime;
      
      // Generate fallback content
      await this.generateFallbackContent(input, result);
    }

    return result;
  }

  /**
   * Phase 1: Fetch data from external sources
   */
  private static async fetchFromExternalSources(
    input: BookCreationInput,
    log: HybridContentResult['processingLog']
  ): Promise<ExternalSourceData & { publishedYear?: number; coverImage?: string; pageCount?: number; categories?: string[]; external_api_data: any }> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} Fetching from external sources...`);

    const result: ExternalSourceData & { publishedYear?: number; coverImage?: string; pageCount?: number; categories?: string[]; external_api_data: any } = {
      title: input.title,
      author: input.author,
      source: 'unknown',
      external_api_data: {}
    };

    try {
      // Try multiple sources in priority order
      const sources = [
        () => this.fetchFromGoogleBooks(input),
        () => this.fetchFromOpenLibrary(input),
        () => this.fetchFromGoodreads(input)
      ];

      for (let index = 0; index < sources.length; index++) {
        const fetchSource = sources[index];
        try {
          const data = await Promise.race([
            fetchSource(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('External API timeout')), this.TIMEOUTS.externalApi)
            )
          ]) as any;

          if (data && (data.description || data.quote)) {
            Object.assign(result, data);
            log.sourcesUsed.push(data.source);
            console.log(`${this.LOG_PREFIX} Successfully fetched from ${data.source}`);
            break;
          }
        } catch (error) {
          const sourceName = ['Google Books', 'Open Library', 'Goodreads'][index];
          console.warn(`${this.LOG_PREFIX} ${sourceName} failed:`, error);
          log.warnings.push(`${sourceName} API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // If no external data found, create minimal structure
      if (!result.source || result.source === 'unknown') {
        result.source = 'fallback';
        log.warnings.push('No external data sources available');
      }

    } catch (error) {
      console.error(`${this.LOG_PREFIX} External source fetching failed:`, error);
      log.errors.push(`External fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    log.externalFetchTime = Date.now() - startTime;
    return result;
  }

  /**
   * Phase 2: Assess content quality
   */
  private static async assessContentQuality(
    externalData: ExternalSourceData,
    log: HybridContentResult['processingLog']
  ): Promise<ReturnType<typeof ContentQualityAssessmentService.generateQualityReport>> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} Assessing content quality...`);

    try {
      const qualityReport = ContentQualityAssessmentService.generateQualityReport(externalData);
      
      console.log(`${this.LOG_PREFIX} Quality assessment: ${qualityReport.summary}`);
      
      // Log quality insights
      if (qualityReport.details.overall.score <= 2) {
        log.warnings.push('Low content quality detected');
      }
      if (!qualityReport.details.overall.layoutCompatible) {
        log.warnings.push('Content not compatible with UI layout');
      }
      
      log.qualityAssessmentTime = Date.now() - startTime;
      return qualityReport;
      
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Quality assessment failed:`, error);
      log.errors.push(`Quality assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return default assessment
      return {
        summary: 'Quality assessment failed',
        details: ContentQualityAssessmentService.assessContent(externalData),
        strategy: ContentQualityAssessmentService.getEnhancementStrategy(
          ContentQualityAssessmentService.assessContent(externalData)
        ),
        adminFlags: ['assessment_failed']
      };
    }
  }

  /**
   * Phase 3: Apply AI enhancement based on strategy
   */
  private static async applyAIEnhancement(
    externalData: ExternalSourceData,
    qualityAssessment: ReturnType<typeof ContentQualityAssessmentService.generateQualityReport>,
    log: HybridContentResult['processingLog'],
    aiEnhancementEnabled: boolean,
    title: string,
    author: string
  ): Promise<{
    description: string;
    quote: string;
    description_source: string;
    quote_source: string;
    description_quality_score: number;
    quote_quality_score: number;
    ai_enhancement_needed: boolean;
    last_ai_enhancement_at?: Date;
    original_description?: string;
    original_quote?: string;
  }> {
    const startTime = Date.now();
    const strategy = qualityAssessment.strategy;
    
    console.log(`${this.LOG_PREFIX} Applying enhancement strategy: ${strategy.action}`);

    const result: {
      description: string;
      quote: string;
      description_source: string;
      quote_source: string;
      description_quality_score: number;
      quote_quality_score: number;
      ai_enhancement_needed: boolean;
      last_ai_enhancement_at?: Date;
      original_description?: string;
      original_quote?: string;
    } = {
      description: externalData.description || '',
      quote: externalData.quote || '',
      description_source: externalData.source,
      quote_source: externalData.source,
      description_quality_score: qualityAssessment.details.description.score,
      quote_quality_score: qualityAssessment.details.quote.score,
      ai_enhancement_needed: false,
      original_description: externalData.description,
      original_quote: externalData.quote
    };

    try {
      if (strategy.action === 'use_as_is') {
        console.log(`${this.LOG_PREFIX} Using external content as-is`);
        log.enhancementsApplied.push('none_needed');
        
      } else if (strategy.action === 'ai_refine' || strategy.action === 'ai_generate') {
        console.log(`${this.LOG_PREFIX} Applying AI enhancement...`);
        
        // Only call AI if AI enhancement is enabled via feature flag
        if (aiEnhancementEnabled) {
          const enhancementPromise = this.callAIEnhancement(externalData, strategy.action, title, author);
          const enhancement = await Promise.race([
            enhancementPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('AI enhancement timeout')), this.TIMEOUTS.aiEnhancement)
            )
          ]) as any;

          if (enhancement.description) {
            result.description = enhancement.description;
            result.description_source = strategy.action === 'ai_refine' ? 'ai_refined' : 'ai_generated';
            result.description_quality_score = Math.min(5, result.description_quality_score + 1);
            log.enhancementsApplied.push('description_enhanced');
          }

          if (enhancement.quote) {
            result.quote = enhancement.quote;
            result.quote_source = strategy.action === 'ai_refine' ? 'ai_refined' : 'ai_generated';
            result.quote_quality_score = Math.min(5, result.quote_quality_score + 1);
            log.enhancementsApplied.push('quote_enhanced');
          }

          result.last_ai_enhancement_at = new Date();
          
        } else {
          console.log(`${this.LOG_PREFIX} AI enhancement disabled by feature flag`);
          log.warnings.push('AI enhancement skipped (disabled by feature flag)');
          result.ai_enhancement_needed = true;
        }
        
      } else if (strategy.action === 'manual_review') {
        console.log(`${this.LOG_PREFIX} Flagging for manual review`);
        result.ai_enhancement_needed = true;
        log.enhancementsApplied.push('flagged_for_review');
      }

    } catch (error) {
      console.error(`${this.LOG_PREFIX} AI enhancement failed:`, error);
      log.errors.push(`AI enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.ai_enhancement_needed = true;
    }

    log.aiEnhancementTime = Date.now() - startTime;
    return result;
  }

  /**
   * Call AI enhancement service
   */
  private static async callAIEnhancement(
    externalData: ExternalSourceData,
    action: 'ai_refine' | 'ai_generate',
    title: string,
    author: string
  ): Promise<{ description?: string; quote?: string }> {
    try {
      // Use the existing BookContentEnhancementService
      const enhancement = await BookContentEnhancementService.quickEnhance({
        title: title,
        author: author,
        description: action === 'ai_refine' ? externalData.description : undefined
      });

      return enhancement;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} AI service call failed:`, error);
      throw error;
    }
  }

  /**
   * Fetch from Google Books API
   */
  private static async fetchFromGoogleBooks(input: BookCreationInput): Promise<any> {
    // This would integrate with the existing GoogleBooksAPI service
    // For now, return null to indicate not implemented
    return null;
  }

  /**
   * Fetch from Open Library API
   */
  private static async fetchFromOpenLibrary(input: BookCreationInput): Promise<any> {
    // This would integrate with the existing OpenLibraryAPI service
    // For now, return null to indicate not implemented
    return null;
  }

  /**
   * Fetch from Goodreads API
   */
  private static async fetchFromGoodreads(input: BookCreationInput): Promise<any> {
    // This would integrate with the existing GoodreadsAPI service
    // For now, return null to indicate not implemented
    return null;
  }

  /**
   * Generate fallback content when everything fails
   */
  private static async generateFallbackContent(
    input: BookCreationInput,
    result: HybridContentResult
  ): Promise<void> {
    console.log(`${this.LOG_PREFIX} Generating fallback content...`);
    
    result.bookData.description = `"${input.title}" by ${input.author} - Content will be enhanced soon.`;
    result.bookData.quote = `"Discovering insights from ${input.title}..." - Content loading`;
    result.bookData.description_source = 'fallback';
    result.bookData.quote_source = 'fallback';
    result.bookData.description_quality_score = 1;
    result.bookData.quote_quality_score = 1;
    result.bookData.ai_enhancement_needed = true;
    
    result.processingLog.enhancementsApplied.push('fallback_content');
    result.qualityReport.summary = 'Fallback content generated';
    result.qualityReport.flags.push('needs_enhancement');
  }

  /**
   * Build enhancement history for audit trail
   */
  private static buildEnhancementHistory(
    externalData: ExternalSourceData,
    qualityAssessment: any,
    enhancedContent: any
  ): any[] {
    const history = [];

    if (externalData.source && externalData.source !== 'unknown') {
      history.push({
        timestamp: new Date().toISOString(),
        action: 'external_fetch',
        source: externalData.source,
        quality_score: qualityAssessment.details.overall.score
      });
    }

    if (enhancedContent.last_ai_enhancement_at) {
      history.push({
        timestamp: enhancedContent.last_ai_enhancement_at.toISOString(),
        action: 'ai_enhancement',
        enhancements: ['description', 'quote'].filter(field => 
          enhancedContent[`${field}_source`]?.includes('ai_')
        )
      });
    }

    return history;
  }

  /**
   * Generate quality report for admin interface
   */
  private static generateQualityReport(
    qualityAssessment: any,
    log: HybridContentResult['processingLog']
  ): HybridContentResult['qualityReport'] {
    const confidence = Math.max(0, Math.min(100, 
      (qualityAssessment.details.overall.score / 5) * 100 - 
      (log.errors.length * 20) - 
      (log.warnings.length * 5)
    ));

    return {
      summary: qualityAssessment.summary,
      strategy: qualityAssessment.strategy.action,
      flags: [
        ...qualityAssessment.adminFlags,
        ...(log.errors.length > 0 ? ['has_errors'] : []),
        ...(log.warnings.length > 2 ? ['has_warnings'] : []),
        ...(confidence < 70 ? ['low_confidence'] : [])
      ],
      confidence: Math.round(confidence)
    };
  }

  /**
   * Get current pipeline status (using feature flags)
   */
  static async getPipelineStatus(userId?: string): Promise<{
    hybridEnabled: boolean;
    aiEnhancementEnabled: boolean;
    contentTrackingEnabled: boolean;
    externalApiTimeout: number;
    aiEnhancementTimeout: number;
  }> {
    const [hybridEnabled, aiEnhancementEnabled, contentTrackingEnabled] = await Promise.all([
      this.isHybridPipelineEnabled(userId),
      this.isAIEnhancementEnabled(userId),
      FeatureFlagService.isFeatureEnabled('content_source_tracking', userId)
    ]);

    return {
      hybridEnabled,
      aiEnhancementEnabled,
      contentTrackingEnabled,
      externalApiTimeout: this.TIMEOUTS.externalApi,
      aiEnhancementTimeout: this.TIMEOUTS.aiEnhancement
    };
  }
}