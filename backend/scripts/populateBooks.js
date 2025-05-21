// populateBooks.js
// Script to populate the database with book data
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection info - update these values to match your setup
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'chapterone',
  user: 'postgres',
  password: 'postgres',
});

// Function to generate UUIDs
function generateUUID() {
  // Use PostgreSQL's built-in UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Book themes, tones, and paces based on the app's categories
const themes = [
  'Love', 'Friendship', 'Family', 'Coming of Age', 'Identity',
  'Adventure', 'Mystery', 'Fantasy', 'Science Fiction', 'History',
  'Politics', 'Philosophy', 'Science', 'Nature', 'Self-Discovery',
  'Travel', 'War', 'Technology', 'Magic', 'Survival', 'Justice',
  'Redemption', 'Courage', 'Loss', 'Social Issues'
];

const tones = [
  'Humorous', 'Dark', 'Lighthearted', 'Serious', 'Emotional', 'Inspirational',
  'Romantic', 'Suspenseful', 'Mysterious', 'Thoughtful', 'Uplifting', 'Philosophical',
  'Dramatic', 'Intense', 'Comforting', 'Melancholic', 'Hopeful', 'Scientific'
];

const paces = ['Fast', 'Moderate', 'Slow'];

const audiences = [
  'Children', 'Young Adults', 'Adults', 'Casual Readers', 'Avid Readers'
];

// Mock book data - we'll generate 1000 books based on these templates
const bookTemplates = [
  // Classic literature
  {
    titlePrefix: 'The ',
    titleWords: ['Great', 'Adventures of', 'Secret', 'Mystery of', 'Chronicles of', 'Tale of', 'Legacy of'],
    titleSuffixes: ['Hope', 'Destiny', 'Time', 'Shadows', 'Dreams', 'the Forest', 'the Mountain'],
    authors: ['Jane Austen', 'Charles Dickens', 'Mark Twain', 'Leo Tolstoy', 'F. Scott Fitzgerald'],
    yearRange: [1800, 1950],
    avgRating: [4, 5],
    pageCountRange: [200, 800],
    themesCount: [2, 4],
    tonesCount: [1, 3],
    coverPrefix: 'https://covers.openlibrary.org/b/id/',
    coverIds: [10583800, 9255566, 12006618, 10222599, 10001639, 8231433, 10389354]
  },
  // Modern fiction
  {
    titlePrefix: '',
    titleWords: ['Invisible', 'Silent', 'Lost', 'Hidden', 'Eternal', 'Broken', 'Forgotten'],
    titleSuffixes: ['Light', 'Memories', 'Path', 'Connection', 'Journey', 'Sky', 'City'],
    authors: ['Haruki Murakami', 'Margaret Atwood', 'Chimamanda Ngozi Adichie', 'Zadie Smith', 'Colson Whitehead'],
    yearRange: [1980, 2023],
    avgRating: [3.5, 4.8],
    pageCountRange: [250, 500],
    themesCount: [2, 5],
    tonesCount: [1, 4],
    coverPrefix: 'https://covers.openlibrary.org/b/id/',
    coverIds: [10522156, 12749475, 12844943, 12790162, 12615304, 12657374, 13333054]
  },
  // Fantasy
  {
    titlePrefix: 'The ',
    titleWords: ['Dragon', 'Wizard', 'Kingdom of', 'Magic', 'Sword of', 'Quest for', 'Curse of'],
    titleSuffixes: ['Flames', 'Darkness', 'Light', 'the Ancients', 'Destiny', 'Power', 'Eternity'],
    authors: ['J.R.R. Tolkien', 'George R.R. Martin', 'Brandon Sanderson', 'N.K. Jemisin', 'Terry Pratchett'],
    yearRange: [1950, 2023],
    avgRating: [4, 4.9],
    pageCountRange: [300, 1000],
    themesCount: [3, 6],
    tonesCount: [2, 4],
    coverPrefix: 'https://covers.openlibrary.org/b/id/',
    coverIds: [10755922, 12578736, 12602911, 12047756, 12329349, 12735853, 13009536]
  },
  // Science Fiction
  {
    titlePrefix: '',
    titleWords: ['Galactic', 'Interstellar', 'Quantum', 'Digital', 'Virtual', 'Android', 'Cosmic'],
    titleSuffixes: ['Dreams', 'Colony', 'Protocol', 'Algorithm', 'Paradox', 'Genesis', 'Code'],
    authors: ['Isaac Asimov', 'Philip K. Dick', 'Ursula K. Le Guin', 'Ted Chiang', 'Liu Cixin'],
    yearRange: [1950, 2023],
    avgRating: [3.8, 4.7],
    pageCountRange: [200, 600],
    themesCount: [2, 5],
    tonesCount: [1, 3],
    coverPrefix: 'https://covers.openlibrary.org/b/id/',
    coverIds: [10637208, 12707030, 12753460, 12731471, 12765394, 12795822, 12808055]
  },
  // Non-fiction
  {
    titlePrefix: 'The ',
    titleWords: ['Art of', 'Science of', 'History of', 'Power of', 'Secret to', 'Guide to', 'Truth About'],
    titleSuffixes: ['Success', 'Happiness', 'Innovation', 'Leadership', 'Wellness', 'Learning', 'Freedom'],
    authors: ['Yuval Noah Harari', 'Malcolm Gladwell', 'Susan Cain', 'Daniel Kahneman', 'Oliver Sacks'],
    yearRange: [1980, 2023],
    avgRating: [3.7, 4.6],
    pageCountRange: [200, 500],
    themesCount: [1, 4],
    tonesCount: [1, 3],
    coverPrefix: 'https://covers.openlibrary.org/b/id/',
    coverIds: [10710101, 12729593, 12599919, 12665156, 12705048, 12714435, 12743832]
  }
];

// Helper functions
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function getRandomSubset(arr, min, max) {
  const count = getRandomInt(min, max);
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Generate a book based on templates
function generateBook() {
  const template = getRandomElement(bookTemplates);
  
  const title = template.titlePrefix + 
               getRandomElement(template.titleWords) + ' ' + 
               getRandomElement(template.titleSuffixes);
  
  const author = getRandomElement(template.authors);
  const publishedYear = getRandomInt(template.yearRange[0], template.yearRange[1]);
  const rating = getRandomFloat(template.avgRating[0], template.avgRating[1]);
  const pageCount = getRandomInt(template.pageCountRange[0], template.pageCountRange[1]);
  const selectedThemes = getRandomSubset(themes, template.themesCount[0], template.themesCount[1]);
  const selectedTones = getRandomSubset(tones, template.tonesCount[0], template.tonesCount[1]);
  const pace = getRandomElement(paces);
  const bestFor = getRandomSubset(audiences, 1, 3);
  
  // Generate a random ISBN-13
  const isbn = '978' + Array.from({length: 10}, () => Math.floor(Math.random() * 10)).join('');
  
  // Get a cover image from Open Library
  const coverId = getRandomElement(template.coverIds);
  const coverImage = `${template.coverPrefix}${coverId}-L.jpg`;
  
  // Generate a description based on themes and tones
  const descriptionStart = [
    'A captivating story about',
    'An insightful exploration of',
    'A powerful narrative examining',
    'A thought-provoking journey through',
    'An enthralling tale featuring'
  ];
  
  const descriptionMiddle = [
    'the complexities of',
    'the struggle between',
    'the search for',
    'the mystery behind',
    'the relationship between'
  ];
  
  const descriptionEnd = [
    'in a world that challenges our understanding of humanity.',
    'that will change the way you see the world.',
    'that resonates with readers of all backgrounds.',
    'set against the backdrop of extraordinary circumstances.',
    'that explores the depths of human experience.'
  ];
  
  const description = `${getRandomElement(descriptionStart)} ${getRandomElement(descriptionMiddle)} ${selectedThemes.slice(0, 2).join(' and ')} ${getRandomElement(descriptionEnd)}`;
  
  return {
    id: generateUUID(),
    title,
    author,
    isbn,
    publishedYear: publishedYear.toString(),
    coverImage,
    rating,
    description,
    pace,
    tone: selectedTones,
    themes: selectedThemes,
    bestFor,
    pageCount,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Generate books and threads data
async function generateData() {
  console.log('Connecting to database...');
  await client.connect();
  
  try {
    console.log('Generating 1000 books...');
    const books = [];
    for (let i = 1; i <= 1000; i++) {
      books.push(generateBook());
    }
    
    // Insert books into the database
    console.log('Inserting books into the database...');
    for (const book of books) {
      await client.query(`
        INSERT INTO book (
          id, title, author, isbn, "publishedYear", "coverImage", rating, description, 
          pace, tone, themes, "bestFor", "pageCount", "createdAt", "updatedAt"
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE 
        SET title = $2, author = $3, isbn = $4, "publishedYear" = $5, "coverImage" = $6, 
            rating = $7, description = $8, pace = $9, tone = $10, themes = $11, 
            "bestFor" = $12, "pageCount" = $13, "updatedAt" = $15
      `, [
        book.id, 
        book.title, 
        book.author, 
        book.isbn, 
        book.publishedYear, 
        book.coverImage, 
        book.rating, 
        book.description, 
        book.pace, 
        book.tone, 
        book.themes, 
        book.bestFor, 
        book.pageCount, 
        book.createdAt, 
        book.updatedAt
      ]);
    }
    
    // Generate and insert threads
    console.log('Generating and inserting 50 threads...');
    for (let i = 1; i <= 50; i++) {
      // Select 1-3 random books for this thread
      const threadBooks = getRandomSubset(books, 1, 3);
      const bookThemes = threadBooks.flatMap(book => book.themes);
      
      // Generate thread title based on books or themes
      const threadTitleFormats = [
        `Discussion: ${threadBooks[0].title} by ${threadBooks[0].author}`,
        `What did you think about ${threadBooks[0].title}?`,
        `Books similar to ${threadBooks[0].title}`,
        `Looking for more ${getRandomElement(bookThemes)} books`,
        `Best ${getRandomElement(bookThemes)} reads of the year`
      ];
      
      const threadTitle = getRandomElement(threadTitleFormats);
      
      // Generate thread description
      const threadDescriptionFormats = [
        `I just finished reading ${threadBooks[0].title} and I'd love to discuss it with fellow readers.`,
        `Can anyone recommend books similar to ${threadBooks[0].title}? I really enjoyed the ${getRandomElement(bookThemes)} theme.`,
        `What are your thoughts on how ${threadBooks[0].author} handled the theme of ${getRandomElement(bookThemes)} in their work?`,
        `I'm looking for books that explore ${getRandomElement(bookThemes)} in a ${getRandomElement(tones)} way.`,
        `Let's discuss some great books about ${getRandomElement(bookThemes)} that you've read recently.`
      ];
      
      const threadDescription = getRandomElement(threadDescriptionFormats);
      
      // Random upvotes and comments
      const upvotes = getRandomInt(0, 120);
      const comments = getRandomInt(0, 30);
      
      // Generate tags from themes
      const tags = getRandomSubset(bookThemes, 1, 3);
      
      // Insert thread
      const threadResult = await client.query(`
        INSERT INTO thread (
          id, title, description, upvotes, comments, tags, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        generateUUID(),
        threadTitle,
        threadDescription,
        upvotes,
        comments,
        tags,
        new Date(),
        new Date()
      ]);
      
      const threadId = threadResult.rows[0].id;
      
      // Associate books with thread
      for (const book of threadBooks) {
        await client.query(`
          INSERT INTO thread_books_book ("threadId", "bookId")
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [threadId, book.id]);
      }
    }
    
    console.log('Data generation complete!');
    
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    await client.end();
  }
}

// Run the data generation
generateData().catch(console.error); 