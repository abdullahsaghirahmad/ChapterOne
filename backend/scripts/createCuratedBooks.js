/**
 * This script creates a small, curated set of high-quality book entries.
 * It deletes all existing books and adds 5 books per category with accurate metadata.
 */

const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });
const axios = require('axios');

// Database connection
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'chapterone'
});

// Book data with properly categorized information
const curatedBooks = [
  // Product Management Books
  {
    title: "Inspired: How to Create Tech Products Customers Love",
    author: "Marty Cagan",
    isbn: "9781119387503",
    publishedYear: "2017",
    description: "A comprehensive guide on creating successful tech products by understanding what customers really want.",
    coverImage: "https://m.media-amazon.com/images/I/41aw3SnAVYL._SY445_SX342_.jpg",
    pace: "Moderate",
    tone: ["Informative", "Practical", "Authoritative"],
    themes: ["Product Development", "Customer-Centric Design", "Innovation"],
    professions: ["Product Management", "Product Design", "Leadership"],
    bestFor: ["Product Managers", "Entrepreneurs", "Tech Leaders"]
  },
  {
    title: "Hooked: How to Build Habit-Forming Products",
    author: "Nir Eyal",
    isbn: "9781591847786",
    publishedYear: "2014",
    description: "A practical guide to building products that create user habits through a four-step process called the Hook Model.",
    coverImage: "https://m.media-amazon.com/images/I/41EbCR-n3HL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Practical", "Engaging", "Strategic"],
    themes: ["User Psychology", "Behavioral Design", "Product Strategy"],
    professions: ["Product Management", "UX/UI Design", "Marketing"],
    bestFor: ["Product Designers", "Startup Founders", "Digital Marketers"]
  },
  {
    title: "The Lean Product Playbook",
    author: "Dan Olsen",
    isbn: "9781118960875",
    publishedYear: "2015",
    description: "A practical guide to building products that succeed by creating the right product for the right target market.",
    coverImage: "https://m.media-amazon.com/images/I/51qeoRq37+L._SY445_SX342_.jpg",
    pace: "Moderate",
    tone: ["Methodical", "Practical", "Instructive"],
    themes: ["Lean Methodology", "Product-Market Fit", "Customer Development"],
    professions: ["Product Management", "Entrepreneurship", "Business Strategy"],
    bestFor: ["Product Managers", "Entrepreneurs", "Business Analysts"]
  },
  {
    title: "Escaping the Build Trap",
    author: "Melissa Perri",
    isbn: "9781491973790",
    publishedYear: "2018",
    description: "A guide to becoming a product-led organization that focuses on valuable outcomes instead of outputs.",
    coverImage: "https://m.media-amazon.com/images/I/41nvEPEmmwL._SY445_SX342_.jpg",
    pace: "Moderate",
    tone: ["Insightful", "Transformative", "Practical"],
    themes: ["Product Leadership", "Organizational Change", "Value Creation"],
    professions: ["Product Management", "Leadership", "Organizational Design"],
    bestFor: ["Product Leaders", "Executives", "Transformation Managers"]
  },
  {
    title: "Product Management in Practice",
    author: "Matt LeMay",
    isbn: "9781492024422",
    publishedYear: "2017",
    description: "A real-world guide to the core skills, mindsets, and challenges of product management.",
    coverImage: "https://m.media-amazon.com/images/I/41Qf+Q3O+kL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Practical", "Concise", "Actionable"],
    themes: ["Career Development", "Core Skills", "Cross-Functional Collaboration"],
    professions: ["Product Management", "Career Development", "Leadership"],
    bestFor: ["New Product Managers", "Aspiring PMs", "Product Teams"]
  },
  
  // UX/Design Books
  {
    title: "Don't Make Me Think, Revisited",
    author: "Steve Krug",
    isbn: "9780321965516",
    publishedYear: "2014",
    description: "A common sense approach to web and mobile usability that focuses on creating intuitive user experiences.",
    coverImage: "https://m.media-amazon.com/images/I/51WS36aA2BL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Conversational", "Humorous", "Practical"],
    themes: ["Web Usability", "User Experience", "Intuitive Design"],
    professions: ["UX/UI Design", "Web Development", "Digital Product Design"],
    bestFor: ["UX Designers", "Web Developers", "Product Managers"]
  },
  {
    title: "The Design of Everyday Things",
    author: "Don Norman",
    isbn: "9780465050659",
    publishedYear: "2013",
    description: "A powerful primer on how design serves as the communication between object and user.",
    coverImage: "https://m.media-amazon.com/images/I/416Hql52NCL._SY445_SX342_.jpg",
    pace: "Moderate",
    tone: ["Thoughtful", "Foundational", "Analytical"],
    themes: ["User-Centered Design", "Human Psychology", "Product Usability"],
    professions: ["UX/UI Design", "Product Design", "Cognitive Psychology"],
    bestFor: ["Designers", "Engineers", "Product Developers"]
  },
  {
    title: "Universal Principles of Design",
    author: "William Lidwell",
    isbn: "9781592535873",
    publishedYear: "2010",
    description: "A comprehensive reference of design concepts, principles, and techniques for designers of all kinds.",
    coverImage: "https://m.media-amazon.com/images/I/51Oq8JhKm3L._SY445_SX342_.jpg",
    pace: "Slow",
    tone: ["Educational", "Comprehensive", "Reference"],
    themes: ["Design Principles", "Visual Communication", "Psychology of Design"],
    professions: ["UX/UI Design", "Graphic Design", "Industrial Design"],
    bestFor: ["All Designers", "Design Students", "Creative Professionals"]
  },
  {
    title: "Lean UX",
    author: "Jeff Gothelf",
    isbn: "9781449311650",
    publishedYear: "2013",
    description: "Applying lean principles to improve user experience design using collaborative, cross-functional methods.",
    coverImage: "https://m.media-amazon.com/images/I/51mPq-A4pWL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Practical", "Actionable", "Collaborative"],
    themes: ["Lean Methods", "User Experience", "Agile Development"],
    professions: ["UX/UI Design", "Product Management", "Agile Development"],
    bestFor: ["UX Teams", "Agile Teams", "Startup Designers"]
  },
  {
    title: "About Face: The Essentials of Interaction Design",
    author: "Alan Cooper",
    isbn: "9781118766576",
    publishedYear: "2014",
    description: "The essential interaction design guide, fully revised and updated for the mobile age.",
    coverImage: "https://m.media-amazon.com/images/I/51cZh36yjwL._SY445_SX342_.jpg",
    pace: "Slow",
    tone: ["Comprehensive", "Authoritative", "Educational"],
    themes: ["Interaction Design", "Digital Interfaces", "User Behavior"],
    professions: ["UX/UI Design", "Interaction Design", "Digital Product Design"],
    bestFor: ["Professional Designers", "Interface Developers", "UX Specialists"]
  },
  
  // Leadership Books
  {
    title: "Leaders Eat Last",
    author: "Simon Sinek",
    isbn: "9781591845324",
    publishedYear: "2014",
    description: "Why some teams pull together and others don't, emphasizing how leaders can foster trust and cooperation.",
    coverImage: "https://m.media-amazon.com/images/I/418Y6A46SFL._SY445_SX342_.jpg",
    pace: "Moderate",
    tone: ["Inspirational", "Thought-provoking", "Narrative"],
    themes: ["Leadership", "Team Building", "Organizational Culture"],
    professions: ["Leadership", "Management", "Organizational Development"],
    bestFor: ["Team Leaders", "Executives", "Aspiring Managers"]
  },
  {
    title: "The Five Dysfunctions of a Team",
    author: "Patrick Lencioni",
    isbn: "9780787960759",
    publishedYear: "2002",
    description: "A leadership fable about the difficulties of all teams experience and how to overcome them.",
    coverImage: "https://m.media-amazon.com/images/I/51QANJAIiIL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Narrative", "Practical", "Accessible"],
    themes: ["Team Dynamics", "Trust Building", "Conflict Resolution"],
    professions: ["Leadership", "Team Management", "Organizational Psychology"],
    bestFor: ["Team Leaders", "Department Heads", "CEOs"]
  },
  {
    title: "Dare to Lead",
    author: "Brené Brown",
    isbn: "9780399592522",
    publishedYear: "2018",
    description: "A guide to brave leadership and courageous cultures through vulnerability, values, trust, and resilience.",
    coverImage: "https://m.media-amazon.com/images/I/41Lz0Ex7gmL._SY445_SX342_.jpg",
    pace: "Moderate",
    tone: ["Empowering", "Authentic", "Reflective"],
    themes: ["Courage", "Vulnerability", "Emotional Intelligence"],
    professions: ["Leadership", "Personal Development", "Organizational Culture"],
    bestFor: ["Leaders at All Levels", "HR Professionals", "Team Facilitators"]
  },
  {
    title: "Good to Great",
    author: "Jim Collins",
    isbn: "9780066620992",
    publishedYear: "2001",
    description: "Research-based findings on how good companies become exceptional, highlighting leadership, culture, and discipline.",
    coverImage: "https://m.media-amazon.com/images/I/41vIUW8KpRL._SY445_SX342_.jpg",
    pace: "Moderate",
    tone: ["Research-based", "Analytical", "Inspirational"],
    themes: ["Corporate Transformation", "Sustained Success", "Disciplined Culture"],
    professions: ["Leadership", "Business Strategy", "Organizational Development"],
    bestFor: ["CEOs", "Business Leaders", "Managers"]
  },
  {
    title: "Radical Candor",
    author: "Kim Scott",
    isbn: "9781250103505",
    publishedYear: "2017",
    description: "How to be a kick-ass boss without losing your humanity by caring personally while challenging directly.",
    coverImage: "https://m.media-amazon.com/images/I/51eUTe-U4jL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Direct", "Practical", "Relatable"],
    themes: ["Management", "Feedback", "Employee Development"],
    professions: ["Leadership", "People Management", "Human Resources"],
    bestFor: ["New Managers", "Team Leaders", "HR Directors"]
  },
  
  // Finance/Economics Books
  {
    title: "The Intelligent Investor",
    author: "Benjamin Graham",
    isbn: "9780060555665",
    publishedYear: "2006",
    description: "The definitive book on value investing, focusing on long-term strategies and emotional discipline.",
    coverImage: "https://m.media-amazon.com/images/I/41vQ4DGEmoL._SY445_SX342_.jpg",
    pace: "Slow",
    tone: ["Educational", "Analytical", "Methodical"],
    themes: ["Value Investing", "Financial Strategy", "Risk Management"],
    professions: ["Finance", "Investment", "Portfolio Management"],
    bestFor: ["Investors", "Financial Advisors", "Business Students"]
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    isbn: "9780374533557",
    publishedYear: "2013",
    description: "Explores the two systems that drive the way we think—the fast, intuitive system and the slow, rational one.",
    coverImage: "https://m.media-amazon.com/images/I/41shZGS-G+L._SY445_SX342_.jpg",
    pace: "Slow",
    tone: ["Insightful", "Research-based", "Thought-provoking"],
    themes: ["Behavioral Economics", "Decision Making", "Cognitive Biases"],
    professions: ["Economics", "Psychology", "Decision Science"],
    bestFor: ["Economists", "Psychologists", "Decision Makers"]
  },
  {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    isbn: "9780857197689",
    publishedYear: "2020",
    description: "Explores how people think about money and how their personal experiences shape their behavior more than financial education.",
    coverImage: "https://m.media-amazon.com/images/I/41vHm4krGFL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Conversational", "Insightful", "Relatable"],
    themes: ["Personal Finance", "Behavioral Economics", "Financial Independence"],
    professions: ["Finance", "Wealth Management", "Personal Development"],
    bestFor: ["Individuals", "Financial Advisors", "Young Professionals"]
  },
  {
    title: "Freakonomics",
    author: "Steven D. Levitt & Stephen J. Dubner",
    isbn: "9780061234002",
    publishedYear: "2009",
    description: "A rogue economist explores the hidden side of everything through entertaining and thought-provoking case studies.",
    coverImage: "https://m.media-amazon.com/images/I/51fB7K6a7HL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Entertaining", "Surprising", "Thought-provoking"],
    themes: ["Economics", "Data Analysis", "Social Science"],
    professions: ["Economics", "Data Science", "Public Policy"],
    bestFor: ["Curious Minds", "Economics Students", "Data Analysts"]
  },
  {
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    isbn: "9781612680194",
    publishedYear: "2017",
    description: "Personal finance classic that tells the story of learning about money through two father figures.",
    coverImage: "https://m.media-amazon.com/images/I/51AHZGhzZEL._SY445_SX342_.jpg",
    pace: "Fast",
    tone: ["Motivational", "Narrative", "Instructive"],
    themes: ["Personal Finance", "Financial Independence", "Investment"],
    professions: ["Finance", "Entrepreneurship", "Wealth Building"],
    bestFor: ["Beginners in Finance", "Entrepreneurs", "Young Adults"]
  }
];

// Add book to database
async function addBook(book) {
  const query = `
    INSERT INTO book(
      title, author, isbn, "publishedYear", "coverImage", description, pace, tone, themes, professions, "bestFor"
    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `;
  
  const values = [
    book.title,
    book.author,
    book.isbn,
    book.publishedYear,
    book.coverImage,
    book.description,
    book.pace,
    book.tone,
    book.themes,
    book.professions,
    book.bestFor
  ];
  
  try {
    const res = await client.query(query, values);
    console.log(`Book added: ${book.title}`);
    return res.rows[0].id;
  } catch (err) {
    console.error(`Error adding book ${book.title}:`, err.message);
    return null;
  }
}

// Create a thread for each profession
async function createThreads() {
  const threads = [
    {
      title: "Product Management Resources",
      description: "A collection of essential books for product managers and aspiring PMs.",
      tags: ["product", "management", "resources"]
    },
    {
      title: "UX Design Library",
      description: "Must-read books for UX designers at all levels.",
      tags: ["design", "ux", "ui", "resources"]
    },
    {
      title: "Leadership Fundamentals",
      description: "Building your leadership skills through these foundational books.",
      tags: ["leadership", "management", "team"]
    },
    {
      title: "Financial Literacy",
      description: "Essential reading for understanding finance and economics.",
      tags: ["finance", "economics", "investing"]
    }
  ];
  
  const threadIds = [];
  
  for (const thread of threads) {
    try {
      const res = await client.query(
        `INSERT INTO thread(title, description, tags, "upvotes", "comments") 
         VALUES($1, $2, $3, $4, $5) RETURNING id`,
        [thread.title, thread.description, thread.tags, 0, 0]
      );
      threadIds.push(res.rows[0].id);
      console.log(`Thread created: ${thread.title}`);
    } catch (err) {
      console.error(`Error creating thread ${thread.title}:`, err.message);
    }
  }
  
  return threadIds;
}

// Connect books to threads
async function linkBooksToThreads(bookIds, threadIds) {
  // Product Management books -> Product Management thread
  for (let i = 0; i < 5; i++) {
    try {
      await client.query(
        `INSERT INTO thread_books_book("threadId", "bookId") VALUES($1, $2)`,
        [threadIds[0], bookIds[i]]
      );
    } catch (err) {
      console.error(`Error linking book to thread:`, err.message);
    }
  }
  
  // UX/Design books -> UX Design thread
  for (let i = 5; i < 10; i++) {
    try {
      await client.query(
        `INSERT INTO thread_books_book("threadId", "bookId") VALUES($1, $2)`,
        [threadIds[1], bookIds[i]]
      );
    } catch (err) {
      console.error(`Error linking book to thread:`, err.message);
    }
  }
  
  // Leadership books -> Leadership thread
  for (let i = 10; i < 15; i++) {
    try {
      await client.query(
        `INSERT INTO thread_books_book("threadId", "bookId") VALUES($1, $2)`,
        [threadIds[2], bookIds[i]]
      );
    } catch (err) {
      console.error(`Error linking book to thread:`, err.message);
    }
  }
  
  // Finance books -> Finance thread
  for (let i = 15; i < 20; i++) {
    try {
      await client.query(
        `INSERT INTO thread_books_book("threadId", "bookId") VALUES($1, $2)`,
        [threadIds[3], bookIds[i]]
      );
    } catch (err) {
      console.error(`Error linking book to thread:`, err.message);
    }
  }
}

async function main() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Clear existing books and threads
    console.log('Clearing existing data...');
    await client.query('DELETE FROM thread_books_book');
    await client.query('DELETE FROM thread');
    await client.query('DELETE FROM book');
    
    // Add all books
    console.log('Adding curated books...');
    const bookIds = [];
    for (const book of curatedBooks) {
      const id = await addBook(book);
      if (id) bookIds.push(id);
    }
    
    // Create threads
    console.log('Creating threads...');
    const threadIds = await createThreads();
    
    // Link books to threads
    console.log('Linking books to threads...');
    await linkBooksToThreads(bookIds, threadIds);
    
    console.log('Database populated successfully with curated books and threads!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

main(); 