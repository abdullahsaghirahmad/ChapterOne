/**
 * This script updates existing books with profession data.
 * Each book will get profession suggestions based on its content and themes.
 */

const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

// Database connection
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'chapterone'
});

// Available professions to assign to books
const professions = {
  'product-management': 'Product Management',
  'design': 'UX/UI Design',
  'sales': 'Sales',
  'marketing': 'Marketing',
  'engineering': 'Software Engineering',
  'data-science': 'Data Science',
  'leadership': 'Leadership',
  'project-management': 'Project Management',
  'finance': 'Finance',
  'human-resources': 'Human Resources',
  'entrepreneurship': 'Entrepreneurship',
  'consulting': 'Consulting'
};

// Keywords that suggest which profession a book might be relevant to
const professionKeywords = {
  'product-management': ['product', 'user experience', 'customer', 'market', 'roadmap', 'innovation', 'feature', 'strategy', 'prioritization', 'agile'],
  'design': ['design', 'user interface', 'ux', 'ui', 'usability', 'creative', 'visual', 'prototype', 'accessibility', 'wireframe'],
  'sales': ['sales', 'negotiation', 'customer', 'pitch', 'closing', 'persuasion', 'client', 'revenue', 'deal', 'objection'],
  'marketing': ['marketing', 'brand', 'campaign', 'strategy', 'social media', 'audience', 'messaging', 'content', 'analytics', 'promotion'],
  'engineering': ['software', 'engineer', 'code', 'development', 'programming', 'technical', 'architecture', 'algorithm', 'debugging', 'testing'],
  'data-science': ['data', 'analytics', 'statistics', 'machine learning', 'ai', 'artificial intelligence', 'model', 'prediction', 'visualization', 'insight'],
  'leadership': ['leadership', 'management', 'team', 'vision', 'inspiration', 'strategy', 'executive', 'coach', 'decision', 'influence'],
  'project-management': ['project', 'management', 'timeline', 'deadline', 'resources', 'planning', 'coordination', 'risk', 'delivery', 'milestone'],
  'finance': ['finance', 'investment', 'capital', 'budget', 'money', 'valuation', 'accounting', 'risk', 'portfolio', 'profit'],
  'human-resources': ['human resources', 'hr', 'talent', 'hiring', 'recruitment', 'culture', 'people', 'training', 'performance', 'benefit'],
  'entrepreneurship': ['startup', 'entrepreneur', 'founder', 'venture', 'business model', 'innovation', 'risk', 'growth', 'scaling', 'disruption'],
  'consulting': ['consulting', 'advisory', 'problem-solving', 'strategy', 'analysis', 'recommendation', 'stakeholder', 'framework', 'client', 'business']
};

// Themes that suggest professions
const themeToProffession = {
  'Business': ['entrepreneurship', 'leadership', 'sales', 'marketing', 'consulting'],
  'Technology': ['engineering', 'data-science', 'product-management'],
  'Leadership': ['leadership', 'project-management', 'consulting'],
  'Innovation': ['product-management', 'entrepreneurship', 'design'],
  'Science': ['data-science', 'engineering'],
  'Self-Help': ['leadership', 'human-resources', 'consulting'],
  'Philosophy': ['leadership', 'consulting'],
  'Communication': ['sales', 'marketing', 'leadership', 'human-resources'],
  'Creativity': ['design', 'product-management', 'marketing'],
  'Politics': ['leadership', 'consulting'],
  'Economics': ['finance', 'entrepreneurship', 'consulting'],
  'Education': ['human-resources', 'leadership'],
  'Psychology': ['human-resources', 'leadership', 'design', 'sales', 'marketing']
};

// Function to determine relevant professions for a book
function determineProfessions(book) {
  const relevantProfessions = new Set();
  
  // Check description for relevant keywords
  if (book.description) {
    const description = book.description.toLowerCase();
    
    Object.entries(professionKeywords).forEach(([profId, keywords]) => {
      if (keywords.some(keyword => description.includes(keyword.toLowerCase()))) {
        relevantProfessions.add(profId);
      }
    });
  }
  
  // Check themes for relevant matches
  if (book.themes && book.themes.length > 0) {
    book.themes.forEach(theme => {
      const relatedProfessions = themeToProffession[theme];
      if (relatedProfessions) {
        relatedProfessions.forEach(prof => relevantProfessions.add(prof));
      }
    });
  }

  // If no professions were found, assign some based on book tone or bestFor
  if (relevantProfessions.size === 0) {
    // If book is inspirational, it could be good for leadership
    const inspirational = book.tone && book.tone.some(t => 
      ['Inspirational', 'Motivational', 'Uplifting'].includes(t)
    );
    
    if (inspirational) {
      relevantProfessions.add('leadership');
      relevantProfessions.add('entrepreneurship');
    }
    
    // If the book is philosophical, it might be good for strategic roles
    const philosophical = book.tone && book.tone.some(t => 
      ['Philosophical', 'Thoughtful', 'Intellectual'].includes(t)
    );
    
    if (philosophical) {
      relevantProfessions.add('consulting');
      relevantProfessions.add('leadership');
    }
    
    // If still no professions, add at least one random profession
    if (relevantProfessions.size === 0) {
      const allProfIds = Object.keys(professions);
      const randomProfId = allProfIds[Math.floor(Math.random() * allProfIds.length)];
      relevantProfessions.add(randomProfId);
    }
  }
  
  // Convert from profession IDs to labels for storage in database
  return Array.from(relevantProfessions).map(profId => professions[profId]);
}

async function updateBooks() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get all books
    const result = await client.query('SELECT * FROM book');
    const books = result.rows;
    console.log(`Found ${books.length} books to update`);
    
    // Update each book with professions
    let updatedCount = 0;
    for (const book of books) {
      const assignedProfessions = determineProfessions(book);
      
      // Update the book with the new professions
      await client.query(
        'UPDATE book SET professions = $1 WHERE id = $2',
        [assignedProfessions, book.id]
      );
      
      updatedCount++;
      console.log(`Updated book "${book.title}" with professions: ${assignedProfessions.join(', ')}`);
    }
    
    console.log(`Successfully updated ${updatedCount} books with profession data`);
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