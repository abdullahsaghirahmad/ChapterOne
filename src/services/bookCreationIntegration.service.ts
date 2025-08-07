/**
 * Book Creation Integration Service
 * 
 * Orchestrates the complete book creation flow using the hybrid content system.
 * This service acts as the main entry point for creating books with AI-enhanced content.
 * 
 * @author Senior Engineer - Content Strategy Team
 */

import { HybridContentCreationService, BookCreationInput, HybridContentResult } from './hybridContentCreation.service';
import { FeatureFlagService } from './featureFlag.service';

export interface BookCreationOptions {
  title: string;
  author: string;
  isbn?: string;
  source?: 'manual' | 'import' | 'admin' | 'api';
  userId?: string;
  forceRefresh?: boolean;
}

export interface EnhancedBookData {
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
  
  // Source tracking fields
  description_source?: string;
  quote_source?: string;
  description_quality_score?: number;
  quote_quality_score?: number;
  ai_enhancement_needed?: boolean;
  last_ai_enhancement_at?: Date;
  original_description?: string;
  original_quote?: string;
  external_api_data?: any;
  enhancement_history?: any[];
}

export interface BookCreationResult {
  success: boolean;
  bookData: EnhancedBookData;
  
  // Processing metadata
  processingTime: number;
  sourcesUsed: string[];
  enhancementsApplied: string[];
  
  // Quality insights
  qualityReport: {
    summary: string;
    confidence: number;
    adminFlags: string[];
  };
  
  // Debug information
  warnings: string[];
  errors: string[];
}

export class BookCreationIntegrationService {
  private static readonly LOG_PREFIX = '[BOOK_CREATION]';

  /**
   * Create a new book with AI-enhanced content using the hybrid pipeline
   */
  static async createEnhancedBook(options: BookCreationOptions): Promise<BookCreationResult> {
    const startTime = Date.now();
    console.log(`${this.LOG_PREFIX} Creating enhanced book: "${options.title}" by ${options.author}`);

    try {
      // Check if hybrid content creation is enabled
      const hybridEnabled = await FeatureFlagService.isFeatureEnabled('hybrid_content_creation', options.userId);
      
      if (!hybridEnabled) {
        console.log(`${this.LOG_PREFIX} Hybrid content creation disabled, using simple creation`);
        return this.createSimpleBook(options);
      }

      // Use hybrid content creation pipeline
      const hybridInput: BookCreationInput = {
        title: options.title,
        author: options.author,
        isbn: options.isbn,
        source: options.source || 'api',
        userId: options.userId
      };

      const hybridResult = await HybridContentCreationService.createBookContent(hybridInput);

      // Transform hybrid result to our interface
      const result: BookCreationResult = {
        success: hybridResult.success,
        bookData: {
          title: hybridResult.bookData.title,
          author: hybridResult.bookData.author,
          isbn: hybridResult.bookData.isbn,
          publishedYear: hybridResult.bookData.publishedYear,
          coverImage: hybridResult.bookData.coverImage,
          pageCount: hybridResult.bookData.pageCount,
          categories: hybridResult.bookData.categories,
          description: hybridResult.bookData.description,
          quote: hybridResult.bookData.quote,
          description_source: hybridResult.bookData.description_source,
          quote_source: hybridResult.bookData.quote_source,
          description_quality_score: hybridResult.bookData.description_quality_score,
          quote_quality_score: hybridResult.bookData.quote_quality_score,
          ai_enhancement_needed: hybridResult.bookData.ai_enhancement_needed,
          last_ai_enhancement_at: hybridResult.bookData.last_ai_enhancement_at,
          original_description: hybridResult.bookData.original_description,
          original_quote: hybridResult.bookData.original_quote,
          external_api_data: hybridResult.bookData.external_api_data,
          enhancement_history: hybridResult.bookData.enhancement_history
        },
        processingTime: hybridResult.processingLog.totalTime,
        sourcesUsed: hybridResult.processingLog.sourcesUsed,
        enhancementsApplied: hybridResult.processingLog.enhancementsApplied,
        qualityReport: {
          summary: hybridResult.qualityReport.summary,
          confidence: hybridResult.qualityReport.confidence,
          adminFlags: hybridResult.qualityReport.flags
        },
        warnings: hybridResult.processingLog.warnings,
        errors: hybridResult.processingLog.errors
      };

      console.log(`${this.LOG_PREFIX} Enhanced book creation completed in ${result.processingTime}ms`);
      return result;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Enhanced book creation failed:`, error);
      
      // Fallback to simple creation
      console.log(`${this.LOG_PREFIX} Falling back to simple book creation`);
      return this.createSimpleBook(options, error as Error);
    }
  }

  /**
   * Simple book creation fallback (when hybrid system is disabled or fails)
   */
  private static async createSimpleBook(options: BookCreationOptions, originalError?: Error): Promise<BookCreationResult> {
    const startTime = Date.now();
    
    const bookData: EnhancedBookData = {
      title: options.title,
      author: options.author,
      isbn: options.isbn,
      description: `"${options.title}" by ${options.author} - Content will be enhanced soon.`,
      quote: `"Discovering insights from ${options.title}..." - Content loading`,
      description_source: 'fallback',
      quote_source: 'fallback',
      description_quality_score: 1,
      quote_quality_score: 1,
      ai_enhancement_needed: true
    };

    const result: BookCreationResult = {
      success: true,
      bookData,
      processingTime: Date.now() - startTime,
      sourcesUsed: ['fallback'],
      enhancementsApplied: ['fallback_content'],
      qualityReport: {
        summary: 'Simple fallback content generated',
        confidence: 25,
        adminFlags: originalError ? ['hybrid_system_failed'] : ['hybrid_system_disabled']
      },
      warnings: originalError ? [`Hybrid system failed: ${originalError.message}`] : ['Hybrid system disabled'],
      errors: []
    };

    return result;
  }

  /**
   * Check if a book needs content enhancement
   */
  static async needsEnhancement(bookData: Partial<EnhancedBookData>): Promise<boolean> {
    // Check explicit flag
    if (bookData.ai_enhancement_needed) {
      return true;
    }

    // Check content quality
    if (!bookData.description || bookData.description.length < 30) {
      return true;
    }

    if (!bookData.quote || bookData.quote.length < 10) {
      return true;
    }

    // Check quality scores
    if ((bookData.description_quality_score || 0) <= 2) {
      return true;
    }

    if ((bookData.quote_quality_score || 0) <= 2) {
      return true;
    }

    return false;
  }

  /**
   * Get enhancement recommendations for existing books
   */
  static getEnhancementRecommendations(bookData: Partial<EnhancedBookData>): {
    priority: 'low' | 'medium' | 'high';
    recommendations: string[];
    estimatedCost: 'free' | 'low' | 'medium' | 'high';
  } {
    const recommendations: string[] = [];
    let priority: 'low' | 'medium' | 'high' = 'low';
    let estimatedCost: 'free' | 'low' | 'medium' | 'high' = 'free';

    // Check description quality
    if (!bookData.description || bookData.description.length < 30) {
      recommendations.push('Generate description');
      priority = 'high';
      estimatedCost = 'medium';
    } else if ((bookData.description_quality_score || 0) <= 2) {
      recommendations.push('Improve description quality');
      priority = 'medium';
      estimatedCost = 'low';
    }

    // Check quote quality
    if (!bookData.quote || bookData.quote.length < 10) {
      recommendations.push('Generate quote');
      priority = priority === 'high' ? 'high' : 'medium';
      estimatedCost = estimatedCost === 'medium' ? 'medium' : 'low';
    } else if ((bookData.quote_quality_score || 0) <= 2) {
      recommendations.push('Improve quote quality');
      priority = priority === 'high' ? 'high' : 'medium';
      estimatedCost = estimatedCost === 'medium' ? 'medium' : 'low';
    }

    // Check for external source opportunities
    if (bookData.description_source === 'fallback' || bookData.quote_source === 'fallback') {
      recommendations.push('Fetch from external sources');
      estimatedCost = 'free';
    }

    return {
      priority,
      recommendations,
      estimatedCost
    };
  }

  /**
   * Get creation pipeline status for admin interface
   */
  static async getPipelineStatus(userId?: string): Promise<{
    available: boolean;
    featuresEnabled: {
      hybridCreation: boolean;
      sourceTracking: boolean;
      aiEnhancement: boolean;
      adminDashboard: boolean;
    };
    estimatedCosts: {
      perBook: string;
      perEnhancement: string;
    };
  }> {
    try {
      const [hybridEnabled, sourceTracking, aiEnhancement, adminDashboard] = await Promise.all([
        FeatureFlagService.isFeatureEnabled('hybrid_content_creation', userId),
        FeatureFlagService.isFeatureEnabled('content_source_tracking', userId),
        FeatureFlagService.isFeatureEnabled('ai_content_enhancement', userId),
        FeatureFlagService.isFeatureEnabled('admin_content_dashboard', userId)
      ]);

      return {
        available: true,
        featuresEnabled: {
          hybridCreation: hybridEnabled,
          sourceTracking: sourceTracking,
          aiEnhancement: aiEnhancement,
          adminDashboard: adminDashboard
        },
        estimatedCosts: {
          perBook: aiEnhancement ? '$0.01-$0.05' : 'Free',
          perEnhancement: '$0.01-$0.02'
        }
      };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Failed to get pipeline status:`, error);
      return {
        available: false,
        featuresEnabled: {
          hybridCreation: false,
          sourceTracking: false,
          aiEnhancement: false,
          adminDashboard: false
        },
        estimatedCosts: {
          perBook: 'Unknown',
          perEnhancement: 'Unknown'
        }
      };
    }
  }
}