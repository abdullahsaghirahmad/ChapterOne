const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './supabase.env' });

// Initialize Supabase client with service role key, fallback to anon key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Use service role key if available, otherwise use anon key
const supabaseKey = (supabaseServiceKey && supabaseServiceKey !== 'your-service-role-key-here') 
  ? supabaseServiceKey 
  : supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in supabase.env file');
  console.error('Please ensure SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Original hardcoded books from the frontend
const hardcodedBooks = [
  // Science Fiction
  {
    title: "Dune",
    author: "Frank Herbert",
    publishedYear: "1965",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg",
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the \"spice\" melange, a drug capable of extending life and enhancing consciousness.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Epic", "Philosophical", "Political", "Atmospheric", "Complex"],
    themes: ["Power", "Religion", "Ecology", "Politics", "Destiny", "Survival"],
    bestFor: ["Science Fiction Fans", "Political Theorists", "Philosophers", "Environmental Scientists"],
    professions: ["Political Scientists", "Ecologists", "Futurists", "Philosophers"],
    pageCount: 658,
    categories: ["Science Fiction", "Classic", "Space Opera"]
  },
  {
    title: "Neuromancer",
    author: "William Gibson",
    publishedYear: "1984",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1554437249i/6088007.jpg",
    description: "The Matrix is a world within the world, a global consensus-hallucination, the representation of every byte of data in cyberspace.",
    rating: 4.5,
    pace: "Fast",
    tone: ["Gritty", "Dystopian", "Cyberpunk", "Edgy", "Prophetic"],
    themes: ["Technology", "Artificial Intelligence", "Identity", "Cyberspace", "Corporate Power"],
    bestFor: ["Technology Enthusiasts", "Cyberpunk Fans", "Futurists", "Programmers"],
    professions: ["Software Engineers", "Data Scientists", "Tech Entrepreneurs", "Futurists"],
    pageCount: 271,
    categories: ["Science Fiction", "Cyberpunk", "Classic"]
  },
  {
    title: "Hyperion",
    author: "Dan Simmons",
    publishedYear: "1989",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1405546838i/77566.jpg",
    description: "On the world called Hyperion, beyond the reach of galactic law, waits a creature called the Shrike. There are those who worship it. There are those who fear it. And there are those who have vowed to destroy it.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Literary", "Complex", "Philosophical", "Mysterious", "Epic"],
    themes: ["Time", "Religion", "Artificial Intelligence", "Sacrifice", "Humanity"],
    bestFor: ["Science Fiction Enthusiasts", "Literary Fiction Readers", "Philosophers"],
    professions: ["Writers", "Philosophers", "Religious Scholars", "Scientists"],
    pageCount: 482,
    categories: ["Science Fiction", "Space Opera"]
  },
  {
    title: "Foundation",
    author: "Isaac Asimov",
    publishedYear: "1951",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1417900846i/29579.jpg",
    description: "For twelve thousand years the Galactic Empire has ruled supreme. Now it is dying. But only Hari Seldon, creator of the revolutionary science of psychohistory, can see into the future.",
    rating: 4.4,
    pace: "Moderate",
    tone: ["Intellectual", "Visionary", "Political", "Classic"],
    themes: ["Society", "History", "Mathematics", "Power", "Civilization"],
    bestFor: ["Science Fiction Fans", "Mathematicians", "Historians", "Political Scientists"],
    professions: ["Mathematicians", "Social Scientists", "Historians", "Policy Makers"],
    pageCount: 244,
    categories: ["Science Fiction", "Classic"]
  },
  {
    title: "Ender's Game",
    author: "Orson Scott Card",
    publishedYear: "1985",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1408303130i/375802.jpg",
    description: "In order to develop a secure defense against a hostile alien race's next attack, government agencies breed child geniuses and train them as soldiers.",
    rating: 4.5,
    pace: "Fast",
    tone: ["Suspenseful", "Military", "Coming-of-age", "Thought-provoking"],
    themes: ["War", "Leadership", "Ethics", "Childhood", "Manipulation"],
    bestFor: ["Young Adults", "Strategy Enthusiasts", "Military Fiction Fans"],
    professions: ["Military Strategists", "Teachers", "Game Designers", "Psychologists"],
    pageCount: 324,
    categories: ["Science Fiction", "Military Science Fiction"]
  },
  
  // Fantasy
  {
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    publishedYear: "1954",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1566425108i/33.jpg",
    description: "One Ring to rule them all, One Ring to find them, One Ring to bring them all and in the darkness bind them.",
    rating: 4.8,
    pace: "Slow",
    tone: ["Epic", "Descriptive", "Mythic", "Poetic", "Adventure"],
    themes: ["Good vs Evil", "Fellowship", "Heroism", "Power", "Sacrifice", "Journey"],
    bestFor: ["Fantasy Lovers", "Literary Scholars", "Historians", "Linguists"],
    professions: ["Writers", "Linguists", "Mythologists", "Historians"],
    pageCount: 1178,
    categories: ["Fantasy", "Classic", "Epic"]
  },
  {
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    publishedYear: "2007",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1270352123i/186074.jpg",
    description: "The intimate narrative of how a young man becomes the most notorious wizard his world has ever seen.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Immersive", "Lyrical", "Character-driven", "Coming-of-age"],
    themes: ["Music", "Knowledge", "Identity", "Love", "Revenge"],
    bestFor: ["Fantasy Enthusiasts", "Musicians", "Writers", "Students"],
    professions: ["Musicians", "Writers", "Academics", "Educators"],
    pageCount: 662,
    categories: ["Fantasy", "Epic Fantasy"]
  },
  {
    title: "Mistborn: The Final Empire",
    author: "Brandon Sanderson",
    publishedYear: "2006",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1617768316i/68428.jpg",
    description: "In a world where ash falls from the sky and mist dominates the night, an evil cloaks the land. The Dark Lord has reigned with absolute power for a thousand years.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Detailed", "Suspenseful", "Epic", "Dark", "Revolutionary"],
    themes: ["Revolution", "Magic Systems", "Social Classes", "Friendship", "Identity"],
    bestFor: ["Fantasy Readers", "Magic System Enthusiasts", "Revolution Storytelling"],
    professions: ["Writers", "Game Designers", "Political Scientists", "Philosophers"],
    pageCount: 541,
    categories: ["Fantasy", "High Fantasy"]
  },
  {
    title: "American Gods",
    author: "Neil Gaiman",
    publishedYear: "2001",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1462924585i/30165203.jpg",
    description: "A blend of Americana, fantasy, and mythology, telling the story of a war brewing between old and new gods.",
    rating: 4.5,
    pace: "Slow",
    tone: ["Dark", "Mythic", "Surreal", "Atmospheric", "Road Trip"],
    themes: ["Religion", "Identity", "America", "Belief", "Immigration"],
    bestFor: ["Mythology Enthusiasts", "Cultural Anthropologists", "American Culture Students"],
    professions: ["Anthropologists", "Religious Scholars", "Cultural Critics", "Writers"],
    pageCount: 635,
    categories: ["Fantasy", "Mythology", "Urban Fantasy"]
  },
  {
    title: "A Game of Thrones",
    author: "George R.R. Martin",
    publishedYear: "1996",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1562726234i/13496.jpg",
    description: "Summers span decades. Winter can last a lifetime. And the struggle for the Iron Throne has begun.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Gritty", "Political", "Realistic", "Complex", "Brutal"],
    themes: ["Power", "Politics", "War", "Family", "Loyalty", "Betrayal"],
    bestFor: ["Political Strategy Fans", "Medieval History Buffs", "Complex Character Enthusiasts"],
    professions: ["Political Scientists", "Historians", "Strategic Planners", "Diplomats"],
    pageCount: 835,
    categories: ["Fantasy", "Epic Fantasy", "Political Fantasy"]
  },
  
  // Romance
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publishedYear: "1813",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1320399351i/1885.jpg",
    description: "Since its immediate success in 1813, Pride and Prejudice has remained one of the most popular novels in the English language.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Witty", "Ironic", "Romantic", "Satirical", "Elegant"],
    themes: ["Social Class", "Marriage", "Pride", "Prejudice", "Love", "Self-discovery"],
    bestFor: ["Romance Readers", "Literary Critics", "Sociologists", "Feminists"],
    professions: ["English Professors", "Sociologists", "Journalists", "Writers"],
    pageCount: 279,
    categories: ["Romance", "Classic", "Literary Fiction"]
  },
  {
    title: "Jane Eyre",
    author: "Charlotte Brontë",
    publishedYear: "1847",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1557343311i/10210.jpg",
    description: "Jane Eyre follows the emotions and experiences of its title character, as she grows from an orphan into a governess, and falls in love with the master of the house.",
    rating: 4.5,
    pace: "Moderate",
    tone: ["Gothic", "Romantic", "Passionate", "Mysterious", "Feminist"],
    themes: ["Love", "Independence", "Social Class", "Gender", "Morality"],
    bestFor: ["Romance Readers", "Gothic Literature Fans", "Feminist Studies"],
    professions: ["Teachers", "Writers", "Psychologists", "Social Workers"],
    pageCount: 532,
    categories: ["Romance", "Classic", "Gothic"]
  },
  {
    title: "Outlander",
    author: "Diana Gabaldon",
    publishedYear: "1991",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1529065012i/10964.jpg",
    description: "The year is 1945. Claire Randall, a former combat nurse, is just back from the war and reunited with her husband on a second honeymoon when she walks through a standing stone in one of the ancient circles that dot the British Isles.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Historical", "Romantic", "Adventure", "Detailed", "Time-travel"],
    themes: ["Love", "Time Travel", "History", "Survival", "Identity"],
    bestFor: ["Historical Fiction Fans", "Romance Readers", "Adventure Enthusiasts"],
    professions: ["Historians", "Nurses", "Archaeologists", "Writers"],
    pageCount: 850,
    categories: ["Romance", "Historical Fiction", "Fantasy"]
  },
  {
    title: "The Notebook",
    author: "Nicholas Sparks",
    publishedYear: "1996",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1483183484i/33648131.jpg",
    description: "A story of miracles and emotions that make us laugh, cry, and hope.",
    rating: 4.4,
    pace: "Fast",
    tone: ["Emotional", "Nostalgic", "Sentimental", "Heartwarming"],
    themes: ["Love", "Memory", "Aging", "Devotion", "Sacrifice"],
    bestFor: ["Romance Enthusiasts", "Emotional Story Lovers", "Relationship Studies"],
    professions: ["Healthcare Workers", "Elderly Care Specialists", "Therapists", "Writers"],
    pageCount: 214,
    categories: ["Romance", "Contemporary", "Fiction"]
  },
  {
    title: "Normal People",
    author: "Sally Rooney",
    publishedYear: "2018",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1571423190i/41057294.jpg",
    description: "Follows the complex friendship and relationship between two teenagers who pretend not to know each other at school but forge a connection that changes their lives.",
    rating: 4.3,
    pace: "Moderate",
    tone: ["Contemporary", "Intimate", "Realistic", "Melancholic", "Character-driven"],
    themes: ["Love", "Class", "Communication", "Mental Health", "Identity"],
    bestFor: ["Contemporary Fiction Readers", "Young Adults", "Social Dynamics Students"],
    professions: ["Psychologists", "Sociologists", "Educators", "Social Workers"],
    pageCount: 273,
    categories: ["Romance", "Contemporary", "Literary Fiction"]
  },
  
  // Non-fiction
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    publishedYear: "2011",
    coverImage: "https://m.media-amazon.com/images/I/41shZGS-G+L._SY445_SX342_.jpg",
    description: "The renowned psychologist and winner of the Nobel Prize in Economics takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think.",
    rating: 4.5,
    pace: "Slow",
    tone: ["Academic", "Insightful", "Analytical", "Accessible", "Thought-provoking"],
    themes: ["Psychology", "Decision Making", "Behavioral Economics", "Cognitive Biases", "Rationality"],
    bestFor: ["Business Leaders", "Product Managers", "Decision Makers", "Psychology Enthusiasts"],
    professions: ["Psychologists", "Economists", "Product Managers", "Executives", "Data Scientists"],
    pageCount: 499,
    categories: ["Psychology", "Non-fiction", "Economics", "Science"]
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    publishedYear: "2011",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1595674533i/23692271.jpg",
    description: "Explores the ways in which biology and history have defined us and enhanced our understanding of what it means to be human.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Accessible", "Thought-provoking", "Engaging", "Provocative", "Big-picture"],
    themes: ["Human Evolution", "History", "Anthropology", "Society", "Culture"],
    bestFor: ["History Enthusiasts", "Science Readers", "Anthropology Students", "Big Picture Thinkers"],
    professions: ["Anthropologists", "Historians", "Social Scientists", "Educators", "Futurists"],
    pageCount: 443,
    categories: ["History", "Non-fiction", "Science", "Anthropology"]
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    publishedYear: "2018",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1535115320i/40121378.jpg",
    description: "Tiny Changes, Remarkable Results: An Easy & Proven Way to Build Good Habits & Break Bad Ones.",
    rating: 4.8,
    pace: "Fast",
    tone: ["Practical", "Actionable", "Inspiring", "Clear", "Methodical"],
    themes: ["Habit Formation", "Self-Improvement", "Psychology", "Productivity", "Behavior Change"],
    bestFor: ["Self-Help Enthusiasts", "Productivity Seekers", "Coaches", "Managers"],
    professions: ["Coaches", "Managers", "Entrepreneurs", "Teachers", "Healthcare Professionals"],
    pageCount: 320,
    categories: ["Self-Help", "Non-fiction", "Psychology", "Personal Development"]
  },
  {
    title: "Educated",
    author: "Tara Westover",
    publishedYear: "2018",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg",
    description: "A memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Compelling", "Inspiring", "Raw", "Personal", "Moving"],
    themes: ["Education", "Family", "Identity", "Resilience", "Self-Determination"],
    bestFor: ["Memoir Readers", "Educators", "Social Workers", "Psychology Students"],
    professions: ["Educators", "Psychologists", "Social Workers", "Counselors"],
    pageCount: 334,
    categories: ["Memoir", "Non-fiction", "Biography", "Education"]
  },
  {
    title: "Becoming",
    author: "Michelle Obama",
    publishedYear: "2018",
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1528206996i/38746485.jpg",
    description: "In her memoir, Michelle Obama invites readers into her world, chronicling the experiences that have shaped her.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Intimate", "Inspiring", "Reflective", "Authentic", "Eloquent"],
    themes: ["Identity", "Politics", "Race", "Family", "Leadership"],
    bestFor: ["Memoir Readers", "Political Science Students", "Women Studies", "Leadership Development"],
    professions: ["Public Servants", "Lawyers", "Community Organizers", "Educators", "Leaders"],
    pageCount: 426,
    categories: ["Memoir", "Non-fiction", "Biography", "Politics"]
  }
];

// Function to check if a book already exists in the database
async function bookExists(title, author) {
  const { data, error } = await supabase
    .from('book')
    .select('id, title, author')
    .ilike('title', title)
    .ilike('author', author);
  
  if (error) {
    console.error('Error checking book existence:', error);
    return false;
  }
  
  return data && data.length > 0;
}

// Function to add a single book to the database
async function addBook(book) {
  try {
    const { data, error } = await supabase
      .from('book')
      .insert([{
        title: book.title,
        author: book.author,
        publishedYear: book.publishedYear,
        coverImage: book.coverImage,
        description: book.description,
        rating: book.rating,
        pace: book.pace,
        tone: book.tone,
        themes: book.themes,
        bestFor: book.bestFor,
        professions: book.professions,
        pageCount: book.pageCount,
        categories: book.categories
      }]);
    
    if (error) {
      console.error(`❌ Error adding "${book.title}":`, error.message);
      return false;
    }
    
    console.log(`✅ Added: "${book.title}" by ${book.author}`);
    return true;
  } catch (err) {
    console.error(`❌ Unexpected error adding "${book.title}":`, err.message);
    return false;
  }
}

// Main migration function
async function migrateHardcodedBooks() {
  console.log('🚀 Starting migration of hardcoded books to database...');
  console.log('================================================');
  
  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < hardcodedBooks.length; i++) {
    const book = hardcodedBooks[i];
    console.log(`\n${i + 1}/${hardcodedBooks.length}: Processing "${book.title}" by ${book.author}`);
    
    // Check if book already exists
    const exists = await bookExists(book.title, book.author);
    
    if (exists) {
      console.log(`⏭️  Skipped: "${book.title}" - already exists in database`);
      skippedCount++;
      continue;
    }
    
    // Add the book
    const success = await addBook(book);
    
    if (success) {
      addedCount++;
    } else {
      errorCount++;
    }
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n================================================');
  console.log('🎉 Migration completed!');
  console.log(`📊 Summary:`);
  console.log(`   • Total books processed: ${hardcodedBooks.length}`);
  console.log(`   • ✅ Added: ${addedCount}`);
  console.log(`   • ⏭️  Skipped (already existed): ${skippedCount}`);
  console.log(`   • ❌ Errors: ${errorCount}`);
  
  // Check final book count
  const { data: finalBooks } = await supabase
    .from('book')
    .select('id');
  
  console.log(`\n📚 Total books now in database: ${finalBooks ? finalBooks.length : 'Unknown'}`);
  
  return {
    processed: hardcodedBooks.length,
    added: addedCount,
    skipped: skippedCount,
    errors: errorCount
  };
}

// Run the migration
if (require.main === module) {
  migrateHardcodedBooks()
    .then((result) => {
      if (result.errors > 0) {
        console.log('\n⚠️  Migration completed with some errors.');
        process.exit(1);
      } else {
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateHardcodedBooks }; 