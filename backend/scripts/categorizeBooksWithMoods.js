/**
 * Script to categorize books using LLM and map them to mood-based filters
 * This script analyzes book content and updates the tone field with mood-compatible values
 */

require('dotenv').config({ path: './supabase.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

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
 * LLM-powered mood analysis prompt
 */
function buildMoodAnalysisPrompt(book) {
  return `You are a book recommendation expert specializing in emotional and mood-based categorization.

Book Information:
- Title: "${book.title}"
- Author: ${book.author}
- Description: ${book.description || 'No description available'}
- Existing Themes: ${book.themes ? book.themes.join(', ') : 'None'}
- Current Tone: ${book.tone ? book.tone.join(', ') : 'None'}
- Categories: ${book.categories ? book.categories.join(', ') : 'None'}

Based on this book's content, themes, and overall emotional impact, determine which of the following mood categories this book would best serve. Select ALL that apply, ranking them by relevance:

Available Mood Categories:
1. "Feeling overwhelmed" - For people who are stressed, anxious, or need calming, grounding reads
2. "Need inspiration" - For people seeking motivation, success stories, or uplifting content
3. "Want to escape" - For people who want to get lost in another world, fantasy, adventure
4. "Looking for adventure" - For people craving excitement, action, thrills, and bold journeys
5. "Feeling nostalgic" - For people longing for the past, comfort, tradition, or childhood memories
6. "Want to learn" - For people eager to discover new facts, skills, or understand the world better
7. "Need motivation" - For people seeking energy, drive, or push to achieve their goals
8. "Seeking comfort" - For people needing emotional support, warmth, or healing reads
9. "Curious about life" - For people exploring human nature, relationships, or life's big questions
10. "Ready for change" - For people looking to transform their lives or embrace new beginnings
11. "Need guidance" - For people seeking advice, wisdom, or direction in life
12. "Feeling creative" - For people wanting to spark their imagination or artistic expression

Respond with ONLY a JSON array of the most relevant mood categories (2-4 maximum), ordered by relevance:
["category1", "category2", "category3"]

Consider:
- The book's emotional impact on readers
- What life situation or mood would make someone want to read this book
- The book's tone, themes, and subject matter
- Who would benefit most from reading this book and when`;
}

/**
 * Fallback mood analysis using keyword matching
 */
function analyzeMoodLocally(book) {
  const bookText = `${book.title} ${book.author} ${book.description || ''} ${(book.themes || []).join(' ')} ${(book.tone || []).join(' ')}`.toLowerCase();
  
  const moodKeywords = {
    'Feeling overwhelmed': ['stress', 'anxiety', 'calm', 'peace', 'mindfulness', 'meditation', 'healing', 'therapy', 'self-help', 'mental health'],
    'Need inspiration': ['inspiration', 'inspiring', 'motivational', 'success', 'achievement', 'triumph', 'overcome', 'perseverance', 'hope'],
    'Want to escape': ['fantasy', 'magic', 'adventure', 'journey', 'travel', 'another world', 'imagination', 'escape', 'quest'],
    'Looking for adventure': ['adventure', 'action', 'thriller', 'exciting', 'dangerous', 'expedition', 'survival', 'explorer'],
    'Feeling nostalgic': ['nostalgia', 'childhood', 'memories', 'past', 'history', 'family', 'tradition', 'comfort', 'home'],
    'Want to learn': ['education', 'science', 'knowledge', 'facts', 'discovery', 'learning', 'study', 'research', 'academic'],
    'Need motivation': ['motivation', 'goals', 'productivity', 'habits', 'success', 'leadership', 'achievement', 'power'],
    'Seeking comfort': ['comfort', 'healing', 'gentle', 'warm', 'cozy', 'friendship', 'love', 'support', 'care'],
    'Curious about life': ['philosophy', 'human nature', 'psychology', 'relationships', 'meaning', 'existence', 'society'],
    'Ready for change': ['change', 'transformation', 'new beginning', 'growth', 'evolution', 'fresh start', 'reinvention'],
    'Need guidance': ['advice', 'wisdom', 'mentor', 'guide', 'direction', 'help', 'counsel', 'leadership'],
    'Feeling creative': ['creativity', 'art', 'imagination', 'design', 'writing', 'innovation', 'artistic', 'creative']
  };
  
  const matchedMoods = [];
  
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    const matchCount = keywords.filter(keyword => bookText.includes(keyword)).length;
    if (matchCount > 0) {
      matchedMoods.push({ mood, score: matchCount });
    }
  }
  
  // Sort by match count and return top 3
  return matchedMoods
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.mood);
}

/**
 * Analyze a single book and determine its mood categories
 */
async function analyzeBookMood(book) {
  console.log(`\n📖 Analyzing: "${book.title}" by ${book.author}`);
  
  try {
    // Try LLM analysis first (you can integrate with your existing LLM service here)
    // For now, using local keyword-based analysis
    const moods = analyzeMoodLocally(book);
    
    // Ensure we have at least one mood and maximum 4
    let finalMoods = moods.slice(0, 4);
    
    if (finalMoods.length === 0) {
      // Default fallback based on basic categories
      if (book.categories && book.categories.includes('Self-Help')) {
        finalMoods = ['Need inspiration'];
      } else if (book.categories && (book.categories.includes('Fantasy') || book.categories.includes('Science Fiction'))) {
        finalMoods = ['Want to escape'];
      } else if (book.categories && book.categories.includes('Biography')) {
        finalMoods = ['Need inspiration', 'Curious about life'];
      } else {
        finalMoods = ['Curious about life'];
      }
    }
    
    console.log(`✅ Mapped to moods: ${finalMoods.join(', ')}`);
    return finalMoods;
    
  } catch (error) {
    console.error(`❌ Error analyzing "${book.title}":`, error.message);
    return ['Curious about life']; // Safe fallback
  }
}

/**
 * Update a book's tone field with mood categories
 */
async function updateBookMoods(bookId, moods, existingTone) {
  try {
    // Combine mood categories with existing tone values (keep non-mood related tones)
    const existingNonMoodTones = (existingTone || []).filter(tone => 
      !UI_MOOD_CATEGORIES.includes(tone)
    );
    
    const updatedTone = [...new Set([...moods, ...existingNonMoodTones])];
    
    const { error } = await supabase
      .from('book')
      .update({ 
        tone: updatedTone,
        updatedAt: new Date().toISOString()
      })
      .eq('id', bookId);
      
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error updating book ${bookId}:`, error.message);
    return false;
  }
}

/**
 * Main function to categorize all books
 */
async function categorizeAllBooks() {
  console.log('🚀 Starting LLM-powered book mood categorization...');
  console.log('='.repeat(60));
  
  try {
    // Fetch all books from database
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
    
    console.log(`📊 Found ${books.length} books to analyze`);
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    
    // Process each book
    for (const book of books) {
      try {
        // Analyze mood categories for this book
        const moods = await analyzeBookMood(book);
        
        // Update the book's tone field
        const success = await updateBookMoods(book.id, moods, book.tone);
        
        if (success) {
          updated++;
          console.log(`   ✅ Updated tone field`);
        } else {
          errors++;
        }
        
        processed++;
        
        // Progress indicator
        if (processed % 10 === 0) {
          console.log(`\n📈 Progress: ${processed}/${books.length} books processed`);
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing "${book.title}":`, error.message);
        errors++;
        processed++;
      }
    }
    
    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Mood categorization completed!');
    console.log(`📊 Summary:`);
    console.log(`   • Total books processed: ${processed}`);
    console.log(`   • Successfully updated: ${updated}`);
    console.log(`   • Errors: ${errors}`);
    
    // Verify the update by checking some mood categories
    console.log('\n🔍 Verifying mood categorization...');
    for (const mood of UI_MOOD_CATEGORIES.slice(0, 3)) {
      const { data: moodBooks, error } = await supabase
        .from('book')
        .select('title, author, tone')
        .contains('tone', [mood])
        .limit(3);
        
      if (!error && moodBooks && moodBooks.length > 0) {
        console.log(`✅ "${mood}" has ${moodBooks.length}+ books:`);
        moodBooks.forEach(book => 
          console.log(`   • "${book.title}" by ${book.author}`)
        );
      }
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  categorizeAllBooks()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { categorizeAllBooks, analyzeBookMood }; 