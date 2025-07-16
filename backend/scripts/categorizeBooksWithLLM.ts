/**
 * Enhanced book mood categorization using the existing LLM service
 * This script leverages the backend LLM service for intelligent mood analysis
 */

import { AppDataSource } from '../src/config/database';
import { Book } from '../src/entities/Book';
import { LLMService } from '../src/services/llm.service';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// UI mood categories that we need to map books to
const UI_MOOD_CATEGORIES = [
  'Feeling overwhelmed',
  'Need inspiration', 
  'Want to escape',
  'Looking for adventure',
  'Feeling nostalgic',
  'Want to learn',
  'Need motivation',
  'Seeking comfort',
  'Curious about life',
  'Ready for change',
  'Need guidance',
  'Feeling creative'
];

/**
 * Create a specialized prompt for mood-based book categorization
 */
function buildBookMoodPrompt(book: any): string {
  return `You are an expert book curator specializing in emotional and mood-based recommendations.

Analyze this book and determine which reader moods/emotional states it would best serve:

BOOK DETAILS:
Title: "${book.title}"
Author: ${book.author}
Description: ${book.description || 'No description available'}
Current Themes: ${book.themes ? book.themes.join(', ') : 'None'}
Current Tone: ${book.tone ? book.tone.join(', ') : 'None'}
Categories: ${book.categories ? book.categories.join(', ') : 'None'}
Page Count: ${book.pageCount || 'Unknown'}

MOOD CATEGORIES TO CONSIDER:
1. "Feeling overwhelmed" - Calming, grounding books for stressed/anxious readers
2. "Need inspiration" - Motivational, uplifting content for those seeking hope
3. "Want to escape" - Immersive fiction/fantasy for mental getaway
4. "Looking for adventure" - Action-packed, exciting books for thrill-seekers
5. "Feeling nostalgic" - Comforting reads about the past, family, tradition
6. "Want to learn" - Educational, informative books for curious minds
7. "Need motivation" - Goal-oriented content for achievement and success
8. "Seeking comfort" - Gentle, healing books for emotional support
9. "Curious about life" - Philosophy, psychology, human nature exploration
10. "Ready for change" - Transformation and growth-focused content
11. "Need guidance" - Wisdom, advice, and direction for life decisions
12. "Feeling creative" - Artistic inspiration and imagination-sparking content

INSTRUCTIONS:
- Select the 2-4 most appropriate mood categories for this book
- Consider what emotional state would make someone pick up this book
- Think about the book's primary emotional impact on readers
- Order by relevance (most relevant first)

Respond with ONLY a JSON array of mood categories:
["category1", "category2", "category3"]`;
}

/**
 * Fallback analysis using keyword matching and content analysis
 */
function analyzeMoodWithKeywords(book: any): string[] {
  const bookContent = `${book.title} ${book.author} ${book.description || ''} ${(book.themes || []).join(' ')} ${(book.tone || []).join(' ')} ${(book.categories || []).join(' ')}`.toLowerCase();
  
  const moodMappings = {
    'Feeling overwhelmed': {
      keywords: ['stress', 'anxiety', 'calm', 'peace', 'mindfulness', 'meditation', 'healing', 'therapy', 'self-help', 'mental health', 'overwhelm', 'burnout', 'pressure'],
      themes: ['Mental Health', 'Self-Help', 'Psychology', 'Mindfulness'],
      categories: ['Self-Help', 'Psychology', 'Health'],
      weight: 1
    },
    'Need inspiration': {
      keywords: ['inspiration', 'inspiring', 'motivational', 'success', 'achievement', 'triumph', 'overcome', 'perseverance', 'hope', 'dream', 'goal'],
      themes: ['Success', 'Achievement', 'Perseverance', 'Hope'],
      categories: ['Biography', 'Self-Help', 'Business'],
      weight: 1
    },
    'Want to escape': {
      keywords: ['fantasy', 'magic', 'adventure', 'journey', 'travel', 'another world', 'imagination', 'escape', 'quest', 'magical', 'mystical'],
      themes: ['Fantasy', 'Adventure', 'Magic', 'Quest', 'Journey'],
      categories: ['Fantasy', 'Science Fiction', 'Adventure'],
      weight: 1.2
    },
    'Looking for adventure': {
      keywords: ['adventure', 'action', 'thriller', 'exciting', 'dangerous', 'expedition', 'survival', 'explorer', 'bold', 'daring', 'risk'],
      themes: ['Adventure', 'Action', 'Survival', 'Exploration'],
      categories: ['Adventure', 'Thriller', 'Action'],
      weight: 1.1
    },
    'Feeling nostalgic': {
      keywords: ['nostalgia', 'childhood', 'memories', 'past', 'history', 'family', 'tradition', 'comfort', 'home', 'heritage', 'vintage'],
      themes: ['Family', 'Childhood', 'Memory', 'History', 'Tradition'],
      categories: ['Historical Fiction', 'Family', 'Memoir'],
      weight: 1
    },
    'Want to learn': {
      keywords: ['education', 'science', 'knowledge', 'facts', 'discovery', 'learning', 'study', 'research', 'academic', 'inform', 'teach'],
      themes: ['Science', 'Education', 'Knowledge', 'Discovery', 'Research'],
      categories: ['Science', 'Education', 'Academic', 'Non-fiction'],
      weight: 1
    },
    'Need motivation': {
      keywords: ['motivation', 'goals', 'productivity', 'habits', 'success', 'leadership', 'achievement', 'power', 'drive', 'ambition', 'improve'],
      themes: ['Productivity', 'Goals', 'Leadership', 'Success', 'Habits'],
      categories: ['Business', 'Self-Help', 'Leadership'],
      weight: 1
    },
    'Seeking comfort': {
      keywords: ['comfort', 'healing', 'gentle', 'warm', 'cozy', 'friendship', 'love', 'support', 'care', 'tender', 'soft'],
      themes: ['Friendship', 'Love', 'Comfort', 'Healing', 'Support'],
      categories: ['Romance', 'Friendship', 'Family'],
      weight: 1
    },
    'Curious about life': {
      keywords: ['philosophy', 'human nature', 'psychology', 'relationships', 'meaning', 'existence', 'society', 'culture', 'behavior'],
      themes: ['Philosophy', 'Psychology', 'Human Nature', 'Society', 'Culture'],
      categories: ['Philosophy', 'Psychology', 'Sociology'],
      weight: 1
    },
    'Ready for change': {
      keywords: ['change', 'transformation', 'new beginning', 'growth', 'evolution', 'fresh start', 'reinvention', 'transform', 'adapt'],
      themes: ['Transformation', 'Growth', 'Change', 'Evolution'],
      categories: ['Self-Help', 'Personal Development'],
      weight: 1
    },
    'Need guidance': {
      keywords: ['advice', 'wisdom', 'mentor', 'guide', 'direction', 'help', 'counsel', 'leadership', 'guidance', 'wisdom'],
      themes: ['Guidance', 'Wisdom', 'Leadership', 'Advice'],
      categories: ['Self-Help', 'Leadership', 'Philosophy'],
      weight: 1
    },
    'Feeling creative': {
      keywords: ['creativity', 'art', 'imagination', 'design', 'writing', 'innovation', 'artistic', 'creative', 'inspire', 'vision'],
      themes: ['Creativity', 'Art', 'Innovation', 'Design', 'Writing'],
      categories: ['Art', 'Design', 'Creative Writing'],
      weight: 1
    }
  };

  const scores: { mood: string; score: number }[] = [];

  for (const [mood, mapping] of Object.entries(moodMappings)) {
    let score = 0;

    // Check keywords
    const keywordMatches = mapping.keywords.filter(keyword => bookContent.includes(keyword)).length;
    score += keywordMatches * mapping.weight;

    // Check themes
    if (book.themes) {
      const themeMatches = mapping.themes.filter(theme => 
        book.themes.some((bookTheme: string) => bookTheme.toLowerCase().includes(theme.toLowerCase()))
      ).length;
      score += themeMatches * 2 * mapping.weight; // Themes are more reliable
    }

    // Check categories
    if (book.categories) {
      const categoryMatches = mapping.categories.filter(category => 
        book.categories.some((bookCat: string) => bookCat.toLowerCase().includes(category.toLowerCase()))
      ).length;
      score += categoryMatches * 3 * mapping.weight; // Categories are most reliable
    }

    if (score > 0) {
      scores.push({ mood, score });
    }
  }

  // Sort by score and return top 3-4
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.mood);
}

/**
 * Analyze a book using LLM service
 */
async function analyzeBookWithLLM(book: any, llmService: LLMService): Promise<string[]> {
  try {
    console.log(`🧠 Using LLM analysis for: "${book.title}"`);
    
    const prompt = buildBookMoodPrompt(book);
    
    // Use the analyzeQuery method with our mood prompt - it will handle LLM calls internally
    const analysis = await llmService.analyzeQuery(prompt);
    
    if (analysis.success && analysis.analysis?.moods && analysis.analysis.moods.length > 0) {
      // Filter to only include valid UI mood categories
      const validMoods = analysis.analysis.moods.filter(mood => UI_MOOD_CATEGORIES.includes(mood));
      if (validMoods.length > 0) {
        console.log(`✅ LLM analysis successful: ${validMoods.join(', ')}`);
        return validMoods.slice(0, 4); // Limit to 4
      }
    }
    
    // Fallback to keyword analysis
    console.log(`⚠️ LLM analysis didn't return valid moods, using keyword analysis`);
    return analyzeMoodWithKeywords(book);
    
  } catch (error) {
    console.log(`⚠️ LLM error: ${error}, using keyword analysis`);
    return analyzeMoodWithKeywords(book);
  }
}

/**
 * Update book with mood categories
 */
async function updateBookWithMoods(bookId: string, moods: string[], existingTone: string[]): Promise<boolean> {
  try {
    // Preserve existing non-mood tones
    const existingNonMoodTones = (existingTone || []).filter(tone => 
      !UI_MOOD_CATEGORIES.includes(tone)
    );
    
    // Combine mood categories with existing tones
    const updatedTone = [...new Set([...moods, ...existingNonMoodTones])];
    
    const { error } = await supabase
      .from('book')
      .update({ 
        tone: updatedTone,
        updatedAt: new Date().toISOString()
      })
      .eq('id', bookId);
      
    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error updating book ${bookId}:`, error);
    return false;
  }
}

/**
 * Main categorization function
 */
async function categorizeAllBooksWithLLM() {
  console.log('🚀 Starting enhanced LLM-powered book mood categorization...');
  console.log('='.repeat(70));
  
  try {
    // Initialize LLM service
    console.log('🧠 Initializing LLM service...');
    const llmService = new LLMService();
    
    // Fetch all books
    console.log('📚 Fetching books from Supabase...');
    const { data: books, error } = await supabase
      .from('book')
      .select('*')
      .order('title');
      
    if (error) {
      throw new Error(`Failed to fetch books: ${error.message}`);
    }
    
    if (!books || books.length === 0) {
      console.log('📭 No books found in database');
      return;
    }
    
    console.log(`📊 Found ${books.length} books to analyze`);
    console.log(`🎯 Target mood categories: ${UI_MOOD_CATEGORIES.length}`);
    
    let processed = 0;
    let updated = 0;
    let llmUsed = 0;
    let fallbackUsed = 0;
    let errors = 0;
    
    console.log('\n📖 Starting analysis...\n');
    
    for (const book of books) {
      try {
        console.log(`[${processed + 1}/${books.length}] "${book.title}" by ${book.author}`);
        
        // Analyze moods
        const moods = await analyzeBookWithLLM(book, llmService);
        
        if (moods.length === 0) {
          console.log(`⚠️ No moods identified, using default`);
          moods.push('Curious about life');
          fallbackUsed++;
        } else {
          llmUsed++;
        }
        
        // Update the book
        const success = await updateBookWithMoods(book.id, moods, book.tone);
        
        if (success) {
          updated++;
          console.log(`✅ Updated with moods: ${moods.join(', ')}`);
        } else {
          errors++;
          console.log(`❌ Failed to update database`);
        }
        
        processed++;
        
        // Progress update
        if (processed % 5 === 0) {
          console.log(`\n📈 Progress: ${processed}/${books.length} (${Math.round(processed/books.length*100)}%)`);
          console.log(`   ✅ Updated: ${updated}, ❌ Errors: ${errors}\n`);
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Error processing "${book.title}":`, error);
        errors++;
        processed++;
      }
    }
    
    // Final statistics
    console.log('\n' + '='.repeat(70));
    console.log('🎉 Enhanced mood categorization completed!');
    console.log(`📊 Final Statistics:`);
    console.log(`   • Total books processed: ${processed}`);
    console.log(`   • Successfully updated: ${updated}`);
    console.log(`   • LLM analysis used: ${llmUsed}`);
    console.log(`   • Fallback analysis used: ${fallbackUsed}`);
    console.log(`   • Errors encountered: ${errors}`);
    console.log(`   • Success rate: ${Math.round(updated/processed*100)}%`);
    
    // Verification
    console.log('\n🔍 Verification - Books per mood category:');
    for (const mood of UI_MOOD_CATEGORIES) {
      const { data: moodBooks, error } = await supabase
        .from('book')
        .select('id')
        .contains('tone', [mood]);
        
      if (!error && moodBooks) {
        console.log(`   • "${mood}": ${moodBooks.length} books`);
      }
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    throw error;
  }
}

// Script execution
async function main() {
  try {
    await categorizeAllBooksWithLLM();
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run script if called directly
if (require.main === module) {
  main();
}

export { categorizeAllBooksWithLLM, analyzeMoodWithKeywords }; 