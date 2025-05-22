/**
 * This script improves book metadata with better NLP for tagging and fixes thumbnail issues.
 * It enhances existing books with better professions, themes, tone categorization, and ensures 
 * thumbnails are correctly assigned.
 */

const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stopwords = require('stopwords').english;

// Database connection
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'chapterone'
});

// Professional domains with more comprehensive keywords for better NLP
const professionKeywords = {
  'Product Management': [
    'product', 'product manager', 'roadmap', 'user experience', 'customer development',
    'product owner', 'market fit', 'user need', 'feature prioritization', 'product strategy',
    'customer feedback', 'user story', 'scrum', 'agile', 'sprints', 'market research',
    'MVP', 'minimum viable product', 'user testing', 'customer journey', 'product lifecycle'
  ],
  'UX/UI Design': [
    'design', 'user interface', 'ux', 'ui', 'usability', 'creative', 'visual', 'prototype',
    'accessibility', 'wireframe', 'user centered', 'interaction design', 'information architecture',
    'visual hierarchy', 'typography', 'color theory', 'design system', 'user research',
    'usability testing', 'design thinking', 'heuristic evaluation', 'interface', 'graphics'
  ],
  'Sales': [
    'sales', 'selling', 'negotiation', 'customer', 'pitch', 'closing', 'persuasion', 'client',
    'revenue', 'deal', 'objection', 'lead generation', 'pipeline', 'conversion', 'sales funnel',
    'prospecting', 'sales strategy', 'consultative selling', 'territory management', 'account executive',
    'business development', 'quota', 'CRM', 'sales enablement', 'value proposition'
  ],
  'Marketing': [
    'marketing', 'brand', 'campaign', 'audience', 'messaging', 'content', 'analytics', 'promotion',
    'social media', 'demand generation', 'market segmentation', 'SEO', 'advertising', 'public relations',
    'digital marketing', 'growth hacking', 'positioning', 'customer acquisition', 'conversion',
    'marketing channel', 'funnel', 'buyer persona', 'marketing strategy', 'marketing analytics'
  ],
  'Software Engineering': [
    'software', 'engineering', 'code', 'development', 'programming', 'technical', 'architecture',
    'algorithm', 'debugging', 'testing', 'developer', 'coding', 'full stack', 'backend', 'frontend',
    'software design', 'software architecture', 'version control', 'continuous integration',
    'deployment', 'DevOps', 'API', 'web development', 'mobile development', 'refactoring'
  ],
  'Data Science': [
    'data', 'analytics', 'statistics', 'machine learning', 'ai', 'artificial intelligence',
    'model', 'prediction', 'visualization', 'insight', 'big data', 'data mining', 'data analysis',
    'regression', 'classification', 'clustering', 'deep learning', 'neural network', 'NLP',
    'computer vision', 'business intelligence', 'data engineering', 'data warehouse', 'algorithm'
  ],
  'Leadership': [
    'leadership', 'management', 'team', 'vision', 'inspiration', 'executive', 'coach', 'decision',
    'influence', 'delegation', 'motivation', 'emotional intelligence', 'strategic thinking',
    'organizational culture', 'change management', 'coaching', 'mentorship', 'alignment',
    'servant leadership', 'transformational leadership', 'executive presence', 'communication'
  ],
  'Project Management': [
    'project', 'management', 'timeline', 'deadline', 'resources', 'planning', 'coordination',
    'risk', 'delivery', 'milestone', 'project plan', 'project scope', 'gantt chart', 'critical path',
    'dependencies', 'project budget', 'stakeholder management', 'project lifecycle', 'agile',
    'waterfall', 'scrum', 'PMP', 'PMO', 'project governance', 'status reporting'
  ],
  'Finance': [
    'finance', 'investment', 'capital', 'budget', 'money', 'valuation', 'accounting', 'risk',
    'portfolio', 'profit', 'financial analysis', 'financial planning', 'financial modeling',
    'asset management', 'cash flow', 'balance sheet', 'income statement', 'financial statement',
    'corporate finance', 'venture capital', 'private equity', 'treasury', 'financial strategy'
  ],
  'Human Resources': [
    'human resources', 'hr', 'talent', 'hiring', 'recruitment', 'culture', 'people', 'training',
    'performance', 'benefit', 'employee engagement', 'compensation', 'workforce planning',
    'talent acquisition', 'performance management', 'diversity and inclusion', 'employee relations',
    'organizational development', 'succession planning', 'HR analytics', 'employee experience'
  ],
  'Entrepreneurship': [
    'startup', 'entrepreneur', 'founder', 'venture', 'business model', 'innovation', 'risk',
    'growth', 'scaling', 'disruption', 'pitch deck', 'fundraising', 'venture capital', 'seed funding',
    'startup culture', 'lean startup', 'business plan', 'market validation', 'product-market fit',
    'bootstrapping', 'angel investor', 'incubator', 'accelerator', 'pivot', 'MVP'
  ],
  'Consulting': [
    'consulting', 'advisory', 'problem-solving', 'strategy', 'analysis', 'recommendation',
    'stakeholder', 'framework', 'client', 'business', 'management consulting', 'strategic consulting',
    'business transformation', 'case study', 'client relationship', 'consulting project',
    'deliverable', 'implementation', 'issue tree', 'hypothesis driven', 'slide deck', 'engagement'
  ]
};

// Enhanced theme categories for more accurate tagging
const themeKeywords = {
  'Love': ['love', 'romantic', 'romance', 'relationship', 'marriage', 'passion', 'affection'],
  'Adventure': ['adventure', 'journey', 'quest', 'exploration', 'expedition', 'voyage', 'discovery'],
  'Mystery': ['mystery', 'detective', 'suspense', 'enigma', 'thriller', 'puzzle', 'clue', 'investigation'],
  'Fantasy': ['fantasy', 'magic', 'enchantment', 'mythical', 'supernatural', 'dragon', 'wizard', 'spell'],
  'Science Fiction': ['science fiction', 'sci-fi', 'futuristic', 'technology', 'space', 'alien', 'robot', 'dystopian'],
  'History': ['history', 'historical', 'past', 'ancient', 'medieval', 'century', 'era', 'period', 'civilization'],
  'Philosophy': ['philosophy', 'philosophical', 'ethics', 'morality', 'existence', 'consciousness', 'metaphysics'],
  'Science': ['science', 'scientific', 'research', 'experiment', 'discovery', 'theory', 'biology', 'physics'],
  'Coming of Age': ['coming of age', 'growing up', 'adolescence', 'youth', 'maturity', 'identity', 'bildungsroman'],
  'Family': ['family', 'parent', 'child', 'sibling', 'generation', 'ancestry', 'heritage', 'genealogy'],
  'Friendship': ['friendship', 'friend', 'companion', 'ally', 'relationship', 'bond', 'camaraderie'],
  'Identity': ['identity', 'self-discovery', 'personal growth', 'self-awareness', 'character development'],
  'Politics': ['politics', 'political', 'government', 'power', 'election', 'democracy', 'regime', 'authority'],
  'Social Issues': ['social issue', 'social justice', 'inequality', 'discrimination', 'activism', 'reform'],
  'War': ['war', 'battle', 'conflict', 'military', 'soldier', 'combat', 'warfare', 'strategy'],
  'Survival': ['survival', 'endurance', 'resilience', 'wilderness', 'hardship', 'perseverance'],
  'Redemption': ['redemption', 'forgiveness', 'atonement', 'salvation', 'repentance', 'absolution'],
  'Justice': ['justice', 'law', 'righteousness', 'fairness', 'equality', 'moral', 'ethical'],
  'Courage': ['courage', 'bravery', 'valor', 'heroism', 'fortitude', 'daring', 'fearlessness'],
  'Loss': ['loss', 'grief', 'death', 'bereavement', 'mourning', 'sorrow', 'tragedy'],
  'Technology': ['technology', 'innovation', 'digital', 'computer', 'software', 'hardware', 'internet'],
  'Nature': ['nature', 'environment', 'wilderness', 'ecology', 'landscape', 'natural world', 'conservation'],
  'Self-Discovery': ['self-discovery', 'introspection', 'realization', 'enlightenment', 'awakening'],
  'Travel': ['travel', 'journey', 'destination', 'expedition', 'voyage', 'exploration', 'tourism'],
  'Leadership': ['leadership', 'leader', 'influence', 'guidance', 'authority', 'direction', 'management']
};

// Better tone categorization
const toneKeywords = {
  'Humorous': ['humor', 'funny', 'comedy', 'wit', 'joke', 'amusing', 'hilarious', 'satirical', 'comedic'],
  'Dark': ['dark', 'grim', 'bleak', 'morbid', 'macabre', 'ominous', 'sinister', 'brooding', 'noir'],
  'Lighthearted': ['lighthearted', 'cheerful', 'playful', 'carefree', 'buoyant', 'jovial', 'breezy'],
  'Serious': ['serious', 'grave', 'solemn', 'earnest', 'weighty', 'profound', 'thoughtful', 'academic'],
  'Emotional': ['emotional', 'moving', 'touching', 'poignant', 'heartfelt', 'affecting', 'sentimental'],
  'Inspirational': ['inspirational', 'uplifting', 'motivational', 'encouraging', 'empowering', 'hopeful'],
  'Romantic': ['romantic', 'passionate', 'sensual', 'intimate', 'amorous', 'tender', 'sentimental'],
  'Suspenseful': ['suspenseful', 'tense', 'thrilling', 'gripping', 'riveting', 'nail-biting', 'edge-of-seat'],
  'Mysterious': ['mysterious', 'enigmatic', 'cryptic', 'puzzling', 'obscure', 'elusive', 'secretive'],
  'Thoughtful': ['thoughtful', 'reflective', 'contemplative', 'introspective', 'meditative', 'pensive'],
  'Uplifting': ['uplifting', 'heartwarming', 'encouraging', 'positive', 'reassuring', 'optimistic'],
  'Philosophical': ['philosophical', 'theoretical', 'conceptual', 'abstract', 'speculative', 'intellectual'],
  'Dramatic': ['dramatic', 'intense', 'powerful', 'emphatic', 'vivid', 'impactful', 'theatrical'],
  'Intense': ['intense', 'fierce', 'severe', 'extreme', 'powerful', 'acute', 'passionate', 'forceful'],
  'Comforting': ['comforting', 'soothing', 'reassuring', 'consoling', 'calming', 'peaceful', 'serene'],
  'Melancholic': ['melancholic', 'sad', 'wistful', 'somber', 'mournful', 'nostalgic', 'regretful'],
  'Hopeful': ['hopeful', 'optimistic', 'positive', 'encouraging', 'promising', 'looking forward'],
  'Scientific': ['scientific', 'analytical', 'objective', 'factual', 'empirical', 'methodical', 'precise']
};

// Helper function to check if book text contains keywords
function textContainsKeywords(text, keywords) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

// Convert text to tokens and remove stopwords
function tokenizeAndRemoveStopwords(text) {
  if (!text) return [];
  const tokens = tokenizer.tokenize(text.toLowerCase());
  return tokens.filter(token => !stopwords.includes(token));
}

// Check text for theme relevance more intelligently
function findRelevantThemes(text) {
  if (!text) return [];
  const relevantThemes = [];
  const textTokens = tokenizeAndRemoveStopwords(text);
  
  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    // Check direct inclusion
    if (keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
      relevantThemes.push(theme);
      return;
    }
    
    // Check word presence ratio
    const keywordTokens = keywords.flatMap(keyword => 
      tokenizeAndRemoveStopwords(keyword)
    );
    
    const matchCount = keywordTokens.filter(token => 
      textTokens.includes(token)
    ).length;
    
    // If more than 30% of theme-related keywords are present, consider it relevant
    if (keywordTokens.length > 0 && (matchCount / keywordTokens.length) > 0.3) {
      relevantThemes.push(theme);
    }
  });
  
  return relevantThemes;
}

// Analyze tone based on text
function analyzeTone(text) {
  if (!text) return [];
  const relevantTones = [];
  
  Object.entries(toneKeywords).forEach(([tone, keywords]) => {
    if (keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
      relevantTones.push(tone);
    }
  });
  
  return relevantTones;
}

// Find professions more intelligently
function findRelevantProfessions(text, themes) {
  if (!text && (!themes || themes.length === 0)) return [];
  const relevantProfessions = new Set();
  
  // Check text for profession keywords
  if (text) {
    Object.entries(professionKeywords).forEach(([profession, keywords]) => {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
        relevantProfessions.add(profession);
      }
    });
  }
  
  // Theme-to-profession mapping for deeper inferences
  const themeToProfession = {
    'Business': ['Leadership', 'Entrepreneurship', 'Marketing', 'Sales', 'Consulting', 'Finance'],
    'Technology': ['Software Engineering', 'Data Science', 'Product Management'],
    'Leadership': ['Leadership', 'Project Management', 'Consulting'],
    'Philosophy': ['Leadership', 'Consulting'],
    'Science': ['Data Science', 'Software Engineering'],
    'Self-Help': ['Leadership', 'Human Resources'],
    'Social Issues': ['Human Resources', 'Consulting', 'Leadership'],
    'History': ['Leadership', 'Consulting'],
    'Politics': ['Leadership', 'Consulting'],
    'Identity': ['Human Resources', 'Leadership'],
    'Self-Discovery': ['Leadership', 'Human Resources']
  };
  
  // Add professions based on themes
  if (themes && themes.length > 0) {
    themes.forEach(theme => {
      const professions = themeToProfession[theme];
      if (professions) {
        professions.forEach(prof => relevantProfessions.add(prof));
      }
    });
  }
  
  // If no professions found, assign at least one based on common themes
  if (relevantProfessions.size === 0 && themes && themes.length > 0) {
    // Default to Leadership for most non-fiction books
    relevantProfessions.add('Leadership');
  }
  
  return Array.from(relevantProfessions);
}

// Fix thumbnail issues by checking for valid URLs
async function verifyAndFixThumbnail(book) {
  if (!book.coverImage) {
    return 'https://covers.openlibrary.org/b/id/10637208-L.jpg'; // Default cover
  }
  
  try {
    // Check if the image URL is valid
    const response = await axios.head(book.coverImage, { timeout: 3000 });
    if (response.status === 200) {
      return book.coverImage; // URL is valid
    } else {
      return 'https://covers.openlibrary.org/b/id/10637208-L.jpg'; // Default cover
    }
  } catch (error) {
    // URL is invalid or unreachable, provide replacement based on book title
    const coverIds = [
      10637208, 12707030, 12753460, 12731471, 12765394, 12795822, 
      12808055, 10710101, 12729593, 12599919, 12665156, 12705048
    ];
    
    // Generate a consistent index based on book title to always get the same cover
    const titleSum = book.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const coverIndex = titleSum % coverIds.length;
    
    return `https://covers.openlibrary.org/b/id/${coverIds[coverIndex]}-L.jpg`;
  }
}

async function updateBooks() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get all books
    const result = await client.query('SELECT * FROM book');
    const books = result.rows;
    console.log(`Found ${books.length} books to update`);
    
    // Update each book with improved metadata
    let updatedCount = 0;
    for (const book of books) {
      // Combine title, author, and description for better analysis
      const bookText = `${book.title} ${book.author} ${book.description || ''}`;
      
      // Apply NLP to identify themes, tone, and professions
      const improvedThemes = findRelevantThemes(bookText);
      const improvedTone = analyzeTone(bookText);
      const improvedProfessions = findRelevantProfessions(bookText, improvedThemes);
      
      // Fix the thumbnail
      const fixedCoverImage = await verifyAndFixThumbnail(book);
      
      // Ensure we have at least some data in each category
      const finalThemes = improvedThemes.length > 0 ? improvedThemes : book.themes || ['General'];
      const finalTone = improvedTone.length > 0 ? improvedTone : book.tone || ['Neutral'];
      const finalProfessions = improvedProfessions.length > 0 ? improvedProfessions : book.professions || ['General'];
      
      // Update the book with the improved metadata
      await client.query(
        `UPDATE book SET 
         themes = $1, 
         tone = $2, 
         professions = $3, 
         "coverImage" = $4 
         WHERE id = $5`,
        [finalThemes, finalTone, finalProfessions, fixedCoverImage, book.id]
      );
      
      updatedCount++;
      console.log(`Updated book "${book.title}" with improved metadata`);
      console.log(`  Themes: ${finalThemes.join(', ')}`);
      console.log(`  Tone: ${finalTone.join(', ')}`);
      console.log(`  Professions: ${finalProfessions.join(', ')}`);
      console.log(`  Cover image: ${fixedCoverImage}`);
    }
    
    console.log(`Successfully updated ${updatedCount} books with improved metadata`);
  } catch (error) {
    console.error('Error updating books:', error);
  } finally {
    // Close database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the update
updateBooks(); 