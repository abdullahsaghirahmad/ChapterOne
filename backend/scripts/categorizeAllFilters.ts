/**
 * Comprehensive Book Filter Categorization Script
 * Maps books to ALL UI filter categories: moods, themes, reading styles, and professions
 * Uses LLM analysis with intelligent keyword-based fallback
 */

import { createClient } from '@supabase/supabase-js';
import { LLMService } from '../src/services/llm.service';

// Load environment variables
require('dotenv').config({ path: './supabase.env' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// All UI filter categories
const UI_FILTERS = {
  MOODS: [
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
  ],
  
  THEMES: [
    'Love', 'Friendship', 'Family', 'Adventure', 'Mystery', 'Science Fiction',
    'Fantasy', 'Historical', 'Biography', 'Self-Help', 'Business', 'Health',
    'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'War', 'Politics',
    'Philosophy', 'Psychology', 'Technology', 'Nature', 'Travel', 'Food',
    'Art', 'Music', 'Sports', 'Religion', 'Education', 'Parenting'
  ],
  
  READING_STYLES: [
    'Quick Read',
    'Deep Dive', 
    'Light Reading',
    'Academic',
    'Visual',
    'Interactive',
    'Series',
    'Standalone'
  ],
  
  PROFESSIONS: [
    'Technology',
    'Healthcare', 
    'Education',
    'Business',
    'Creative Arts',
    'Science',
    'Finance',
    'Legal',
    'Engineering',
    'Marketing',
    'Design',
    'Management',
    'Consulting',
    'Entrepreneurship',
    'Research',
    'Writing'
  ]
};

interface BookAnalysis {
  moods: string[];
  themes: string[];
  readingStyles: string[];
  professions: string[];
}

/**
 * Build comprehensive LLM prompt for all filter categories
 */
function buildComprehensivePrompt(book: any): string {
  return `You are an expert book curator and librarian with deep knowledge of reader preferences and book categorization.

Analyze this book comprehensively and categorize it across ALL the following dimensions:

BOOK DETAILS:
Title: "${book.title}"
Author: ${book.author}
Description: ${book.description || 'No description available'}
Current Themes: ${book.themes ? book.themes.join(', ') : 'None'}
Current Tone: ${book.tone ? book.tone.join(', ') : 'None'}
Categories: ${book.categories ? book.categories.join(', ') : 'None'}
Professions: ${book.professions ? book.professions.join(', ') : 'None'}
Page Count: ${book.pageCount || 'Unknown'}

CATEGORIZATION DIMENSIONS:

1. READER MOODS (What emotional state would make someone want this book?):
${UI_FILTERS.MOODS.map((mood, i) => `   ${i + 1}. "${mood}"`).join('\n')}

2. THEMES (What are the main subjects/topics?):
${UI_FILTERS.THEMES.map((theme, i) => `   ${i + 1}. "${theme}"`).join('\n')}

3. READING STYLES (How should this book be consumed?):
${UI_FILTERS.READING_STYLES.map((style, i) => `   ${i + 1}. "${style}"`).join('\n')}

4. PROFESSIONS (Which professionals would benefit most?):
${UI_FILTERS.PROFESSIONS.map((prof, i) => `   ${i + 1}. "${prof}"`).join('\n')}

INSTRUCTIONS:
- Select 2-4 most relevant options from EACH category
- Base selections on book content, target audience, and reading experience
- Consider what type of person would pick up this book and why
- Order by relevance (most relevant first)

Respond with ONLY a JSON object in this exact format:
{
  "moods": ["mood1", "mood2"],
  "themes": ["theme1", "theme2", "theme3"],
  "readingStyles": ["style1", "style2"],
  "professions": ["prof1", "prof2", "prof3"]
}`;
}

/**
 * Comprehensive keyword-based analysis fallback
 */
function analyzeWithKeywords(book: any): BookAnalysis {
  const bookContent = `${book.title} ${book.author} ${book.description || ''} ${(book.themes || []).join(' ')} ${(book.tone || []).join(' ')} ${(book.categories || []).join(' ')}`.toLowerCase();
  
  // Mood analysis
  const moodMappings = {
    'Feeling overwhelmed': ['stress', 'anxiety', 'calm', 'peace', 'mindfulness', 'meditation', 'healing', 'therapy', 'self-help', 'mental health', 'burnout'],
    'Need inspiration': ['inspiration', 'motivational', 'success', 'achievement', 'triumph', 'overcome', 'perseverance', 'hope', 'dream', 'goal', 'uplifting'],
    'Want to escape': ['fantasy', 'magic', 'adventure', 'journey', 'travel', 'another world', 'imagination', 'escape', 'quest', 'magical', 'mystical'],
    'Looking for adventure': ['adventure', 'action', 'thriller', 'exciting', 'dangerous', 'expedition', 'survival', 'explorer', 'bold', 'daring'],
    'Feeling nostalgic': ['nostalgia', 'childhood', 'memories', 'past', 'history', 'family', 'tradition', 'comfort', 'home', 'heritage'],
    'Want to learn': ['education', 'science', 'knowledge', 'facts', 'discovery', 'learning', 'study', 'research', 'academic', 'inform'],
    'Need motivation': ['motivation', 'goals', 'productivity', 'habits', 'success', 'leadership', 'achievement', 'power', 'drive'],
    'Seeking comfort': ['comfort', 'healing', 'gentle', 'warm', 'cozy', 'friendship', 'love', 'support', 'care', 'tender'],
    'Curious about life': ['philosophy', 'human nature', 'psychology', 'relationships', 'meaning', 'existence', 'society', 'culture'],
    'Ready for change': ['change', 'transformation', 'new beginning', 'growth', 'evolution', 'fresh start', 'reinvention'],
    'Need guidance': ['advice', 'wisdom', 'mentor', 'guide', 'direction', 'help', 'counsel', 'leadership'],
    'Feeling creative': ['creativity', 'art', 'imagination', 'design', 'writing', 'innovation', 'artistic', 'creative']
  };

  // Theme analysis
  const themeMappings = {
    'Love': ['love', 'romance', 'relationship', 'heart', 'passion', 'romantic'],
    'Friendship': ['friend', 'friendship', 'companion', 'bond', 'loyalty'],
    'Family': ['family', 'parent', 'child', 'sibling', 'home', 'mother', 'father'],
    'Adventure': ['adventure', 'journey', 'quest', 'explore', 'expedition'],
    'Mystery': ['mystery', 'detective', 'crime', 'investigation', 'clue', 'puzzle'],
    'Science Fiction': ['science fiction', 'sci-fi', 'space', 'future', 'technology', 'alien'],
    'Fantasy': ['fantasy', 'magic', 'wizard', 'dragon', 'myth', 'legend'],
    'Historical': ['history', 'historical', 'past', 'war', 'ancient', 'period'],
    'Biography': ['biography', 'memoir', 'life story', 'personal', 'autobiography'],
    'Self-Help': ['self-help', 'improvement', 'personal development', 'guide', 'how to'],
    'Business': ['business', 'entrepreneur', 'management', 'corporate', 'finance'],
    'Health': ['health', 'medical', 'wellness', 'fitness', 'nutrition', 'medicine'],
    'Psychology': ['psychology', 'mind', 'behavior', 'mental', 'brain', 'cognitive'],
    'Philosophy': ['philosophy', 'meaning', 'existence', 'ethics', 'truth', 'wisdom'],
    'Technology': ['technology', 'computer', 'digital', 'internet', 'software'],
    'Politics': ['politics', 'government', 'power', 'policy', 'democracy']
  };

  // Reading Style analysis
  const styleMappings = {
    'Quick Read': ['short', 'brief', 'quick', 'easy', 'light', 'simple'],
    'Deep Dive': ['comprehensive', 'detailed', 'thorough', 'in-depth', 'extensive'],
    'Light Reading': ['entertaining', 'fun', 'enjoyable', 'relaxing', 'casual'],
    'Academic': ['academic', 'scholarly', 'research', 'study', 'theoretical'],
    'Visual': ['visual', 'illustrated', 'graphics', 'pictures', 'diagrams'],
    'Interactive': ['interactive', 'exercises', 'workbook', 'activities', 'practice'],
    'Series': ['series', 'sequel', 'volume', 'book one', 'part of'],
    'Standalone': ['standalone', 'complete', 'single', 'independent']
  };

  // Profession analysis
  const professionMappings = {
    'Technology': ['technology', 'software', 'programming', 'coding', 'tech', 'computer', 'developer'],
    'Healthcare': ['healthcare', 'medical', 'doctor', 'nurse', 'health', 'medicine', 'patient'],
    'Education': ['education', 'teaching', 'teacher', 'student', 'learning', 'school'],
    'Business': ['business', 'management', 'corporate', 'executive', 'entrepreneur'],
    'Creative Arts': ['art', 'creative', 'design', 'artist', 'creative', 'visual'],
    'Science': ['science', 'research', 'scientist', 'laboratory', 'experiment'],
    'Finance': ['finance', 'money', 'investment', 'banking', 'financial'],
    'Legal': ['legal', 'law', 'lawyer', 'attorney', 'court', 'justice'],
    'Engineering': ['engineering', 'engineer', 'technical', 'construction'],
    'Marketing': ['marketing', 'advertising', 'brand', 'promotion', 'sales'],
    'Design': ['design', 'designer', 'user experience', 'interface', 'ux'],
    'Management': ['management', 'manager', 'leadership', 'team', 'organization'],
    'Writing': ['writing', 'writer', 'author', 'journalism', 'content']
  };

  // Calculate scores for each category
  const analyzeCategory = (mappings: any) => {
    const scores: { item: string; score: number }[] = [];
    
    for (const [item, keywords] of Object.entries(mappings)) {
      let score = 0;
      const keywordArray = keywords as string[];
      
      // Keyword matches
      const keywordMatches = keywordArray.filter(keyword => bookContent.includes(keyword)).length;
      score += keywordMatches;
      
      // Existing data matches
      if (book.themes) {
        const themeMatches = book.themes.filter((theme: string) => 
          theme.toLowerCase().includes(item.toLowerCase()) || 
          keywordArray.some(kw => theme.toLowerCase().includes(kw))
        ).length;
        score += themeMatches * 2;
      }
      
      if (book.categories) {
        const categoryMatches = book.categories.filter((cat: string) => 
          cat.toLowerCase().includes(item.toLowerCase()) ||
          keywordArray.some(kw => cat.toLowerCase().includes(kw))
        ).length;
        score += categoryMatches * 3;
      }
      
      if (score > 0) {
        scores.push({ item, score });
      }
    }
    
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(s => s.item);
  };

  const moods = analyzeCategory(moodMappings);
  const themes = analyzeCategory(themeMappings);
  let readingStyles = analyzeCategory(styleMappings);
  const professions = analyzeCategory(professionMappings);

  // Special logic for reading styles based on page count
  const pageCount = book.pageCount;
  if (pageCount) {
    if (pageCount < 250 && !readingStyles.includes('Quick Read')) {
      readingStyles.unshift('Quick Read'); // Add to beginning for priority
    } else if (pageCount > 600 && !readingStyles.includes('Deep Dive')) {
      readingStyles.unshift('Deep Dive');
    }
    // Limit to top 3 reading styles
    readingStyles = readingStyles.slice(0, 3);
  }

  // Ensure we have at least one entry in each category
  return {
    moods: moods.length > 0 ? moods : ['Curious about life'],
    themes: themes.length > 0 ? themes : ['Adventure'],
    readingStyles: readingStyles.length > 0 ? readingStyles : ['Standalone'],
    professions: professions.length > 0 ? professions : ['Education']
  };
}

/**
 * Analyze book using LLM with keyword fallback
 */
async function analyzeBookComprehensively(book: any, llmService: LLMService): Promise<BookAnalysis> {
  console.log(`🔍 Comprehensive analysis: "${book.title}" by ${book.author}`);
  
  try {
    // Try LLM analysis first
    const prompt = buildComprehensivePrompt(book);
    const analysis = await llmService.analyzeQuery(prompt);
    
    if (analysis.success && analysis.analysis) {
      // Extract valid categories from LLM response
      const result: BookAnalysis = {
        moods: [],
        themes: [],
        readingStyles: [],
        professions: []
      };
      
      // Map LLM response to our categories
      if (analysis.analysis.moods) {
        result.moods = analysis.analysis.moods.filter(mood => UI_FILTERS.MOODS.includes(mood)).slice(0, 4);
      }
      
      if (analysis.analysis.themes) {
        result.themes = analysis.analysis.themes.filter(theme => UI_FILTERS.THEMES.includes(theme)).slice(0, 4);
      }
      
      if (analysis.analysis.professions) {
        result.professions = analysis.analysis.professions.filter(prof => UI_FILTERS.PROFESSIONS.includes(prof)).slice(0, 4);
      }
      
      // For reading styles, we need to check different field names
      if (analysis.analysis.readingStyle || analysis.analysis.pace) {
        const styles = analysis.analysis.readingStyle || [];
        result.readingStyles = styles.filter((style: string) => UI_FILTERS.READING_STYLES.includes(style)).slice(0, 3);
      }
      
      // Check if we got reasonable results
      if (result.moods.length > 0 || result.themes.length > 0) {
        console.log(`✅ LLM analysis successful`);
        
        // Fill in missing categories with keyword analysis
        const keywordAnalysis = analyzeWithKeywords(book);
        if (result.moods.length === 0) result.moods = keywordAnalysis.moods;
        if (result.themes.length === 0) result.themes = keywordAnalysis.themes;
        if (result.readingStyles.length === 0) result.readingStyles = keywordAnalysis.readingStyles;
        if (result.professions.length === 0) result.professions = keywordAnalysis.professions;
        
        return result;
      }
    }
    
    console.log(`⚠️ LLM analysis incomplete, using keyword analysis`);
    return analyzeWithKeywords(book);
    
  } catch (error) {
    console.log(`⚠️ LLM error, using keyword analysis:`, error);
    return analyzeWithKeywords(book);
  }
}

/**
 * Update book with all filter categories
 */
async function updateBookWithAllFilters(bookId: string, analysis: BookAnalysis, existingData: any): Promise<boolean> {
  try {
    // Preserve existing data and merge with new analysis
    const existingMoods = (existingData.tone || []).filter((tone: string) => !UI_FILTERS.MOODS.includes(tone));
    const existingThemes = existingData.themes || [];
    const existingProfessions = existingData.professions || [];
    
    // Combine new analysis with existing data
    const updatedTone = [...new Set([...analysis.moods, ...existingMoods])];
    const updatedThemes = [...new Set([...analysis.themes, ...existingThemes])];
    const updatedProfessions = [...new Set([...analysis.professions, ...existingProfessions])];
    
    // Map reading styles to database-compatible pace values
    let pace = existingData.pace;
    if (analysis.readingStyles.length > 0) {
      const primaryStyle = analysis.readingStyles[0];
      switch (primaryStyle) {
        case 'Quick Read':
          pace = 'Fast';
          break;
        case 'Deep Dive':
        case 'Academic':
          pace = 'Slow';
          break;
        case 'Light Reading':
        case 'Standalone':
        case 'Series':
        case 'Visual':
        case 'Interactive':
        default:
          pace = 'Moderate';
          break;
      }
    } else if (!pace) {
      // Fallback based on page count
      const pageCount = existingData.pageCount;
      if (pageCount && pageCount < 250) pace = 'Fast';
      else if (pageCount && pageCount > 600) pace = 'Slow';
      else pace = 'Moderate';
    }
    
    const { error } = await supabase
      .from('book')
      .update({ 
        tone: updatedTone,
        themes: updatedThemes,
        professions: updatedProfessions,
        pace: pace,
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
 * Main comprehensive categorization function
 */
async function categorizeAllFilters() {
  console.log('🚀 Starting COMPREHENSIVE book filter categorization...');
  console.log('🎯 Mapping to: Moods, Themes, Reading Styles, and Professions');
  console.log('🧠 Using: LLM analysis with keyword fallback');
  console.log('='.repeat(80));
  
  try {
    // Initialize LLM service
    console.log('🧠 Initializing LLM service...');
    const llmService = new LLMService();
    
    // Fetch all books
    console.log('📚 Fetching books from database...');
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
    
    console.log(`📊 Found ${books.length} books to analyze comprehensively`);
    console.log(`🎯 Filter categories:`);
    console.log(`   • Moods: ${UI_FILTERS.MOODS.length} options`);
    console.log(`   • Themes: ${UI_FILTERS.THEMES.length} options`);
    console.log(`   • Reading Styles: ${UI_FILTERS.READING_STYLES.length} options`);
    console.log(`   • Professions: ${UI_FILTERS.PROFESSIONS.length} options`);
    
    let processed = 0;
    let updated = 0;
    let llmSuccesses = 0;
    let keywordFallbacks = 0;
    let errors = 0;
    
    console.log('\n📖 Starting comprehensive analysis...\n');
    
    for (const book of books) {
      try {
        console.log(`[${processed + 1}/${books.length}] Processing: "${book.title}" by ${book.author}`);
        
        // Comprehensive analysis
        const analysis = await analyzeBookComprehensively(book, llmService);
        
        // Track analysis method
        if (analysis.moods.length > 0 && analysis.themes.length > 0) {
          llmSuccesses++;
        } else {
          keywordFallbacks++;
        }
        
        // Update the book
        const success = await updateBookWithAllFilters(book.id, analysis, book);
        
        if (success) {
          updated++;
          console.log(`✅ Updated filters:`);
          console.log(`   📋 Moods: ${analysis.moods.join(', ')}`);
          console.log(`   🎨 Themes: ${analysis.themes.join(', ')}`);
          console.log(`   📚 Reading Styles: ${analysis.readingStyles.join(', ')}`);
          console.log(`   💼 Professions: ${analysis.professions.join(', ')}`);
        } else {
          errors++;
          console.log(`❌ Failed to update database`);
        }
        
        processed++;
        
        // Progress update
        if (processed % 5 === 0) {
          console.log(`\n📈 Progress: ${processed}/${books.length} (${Math.round(processed/books.length*100)}%)`);
          console.log(`   ✅ Updated: ${updated}, 🧠 LLM: ${llmSuccesses}, 🔤 Keyword: ${keywordFallbacks}, ❌ Errors: ${errors}\n`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`❌ Error processing "${book.title}":`, error);
        errors++;
        processed++;
      }
    }
    
    // Final statistics
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPREHENSIVE filter categorization completed!');
    console.log(`📊 Final Statistics:`);
    console.log(`   • Total books processed: ${processed}`);
    console.log(`   • Successfully updated: ${updated}`);
    console.log(`   • LLM analysis used: ${llmSuccesses}`);
    console.log(`   • Keyword fallback used: ${keywordFallbacks}`);
    console.log(`   • Errors encountered: ${errors}`);
    console.log(`   • Success rate: ${Math.round(updated/processed*100)}%`);
    
    // Verification across all filter types
    console.log('\n🔍 Verification - Sample counts per filter category:');
    
    // Check moods
    console.log('\n📋 MOODS:');
    for (const mood of UI_FILTERS.MOODS.slice(0, 4)) {
      const { data: moodBooks } = await supabase
        .from('book')
        .select('id')
        .contains('tone', [mood]);
      console.log(`   • "${mood}": ${moodBooks?.length || 0} books`);
    }
    
    // Check themes
    console.log('\n🎨 THEMES:');
    for (const theme of UI_FILTERS.THEMES.slice(0, 6)) {
      const { data: themeBooks } = await supabase
        .from('book')
        .select('id')
        .contains('themes', [theme]);
      console.log(`   • "${theme}": ${themeBooks?.length || 0} books`);
    }
    
    // Check professions
    console.log('\n💼 PROFESSIONS:');
    for (const profession of UI_FILTERS.PROFESSIONS.slice(0, 4)) {
      const { data: profBooks } = await supabase
        .from('book')
        .select('id')
        .contains('professions', [profession]);
      console.log(`   • "${profession}": ${profBooks?.length || 0} books`);
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    throw error;
  }
}

// Script execution
async function main() {
  try {
    await categorizeAllFilters();
    console.log('\n✨ Comprehensive categorization completed successfully!');
    console.log('🎯 All books now have complete filter mappings for improved search!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Comprehensive categorization failed:', error);
    process.exit(1);
  }
}

// Run script if called directly
if (require.main === module) {
  main();
}

export { categorizeAllFilters }; 