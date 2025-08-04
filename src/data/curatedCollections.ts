import { Book } from '../types';

export interface CuratedCollection {
  id: string;
  title: string;
  description: string;
  mood: string;
  icon: string;
  books: Book[];
}

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    id: 'motivation-boost',
    title: 'Need a Motivation Boost?',
    description: 'Books to ignite your drive and push through challenges',
    mood: 'motivated',
    icon: '💪',
    books: [
      {
        id: 'atomic-habits',
        title: 'Atomic Habits',
        author: 'James Clear',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1535115320i/40121378.jpg',
        description: 'Tiny changes, remarkable results. A proven framework for improving every day.',
        rating: 4.8,
        pace: 'Moderate',
        tone: ['Practical', 'Inspiring', 'Clear'],
        themes: ['Self-Improvement', 'Productivity', 'Psychology'],
        bestFor: ['Goal Achievers', 'Personal Growth Seekers'],
        isExternal: false,
        pageCount: 320,
        categories: ['Self-Help', 'Business']
      },
      {
        id: 'mindset-dweck',
        title: 'Mindset',
        author: 'Carol Dweck',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1436227012i/40745.jpg',
        description: 'The new psychology of success. How we can learn to fulfill our potential.',
        rating: 4.6,
        pace: 'Moderate',
        tone: ['Scientific', 'Empowering', 'Insightful'],
        themes: ['Psychology', 'Growth', 'Success'],
        bestFor: ['Students', 'Parents', 'Leaders'],
        isExternal: false,
        pageCount: 276,
        categories: ['Psychology', 'Self-Help']
      },
      {
        id: 'grit-duckworth',
        title: 'Grit',
        author: 'Angela Duckworth',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1457889762i/27213329.jpg',
        description: 'The power of passion and perseverance in achieving long-term goals.',
        rating: 4.5,
        pace: 'Moderate',
        tone: ['Research-Based', 'Motivational', 'Practical'],
        themes: ['Perseverance', 'Success', 'Psychology'],
        bestFor: ['Students', 'Professionals', 'Athletes'],
        isExternal: false,
        pageCount: 333,
        categories: ['Psychology', 'Self-Help']
      }
    ]
  },
  {
    id: 'escape-reality',
    title: 'Ready to Escape Reality?',
    description: 'Immersive worlds and captivating stories for pure escapism',
    mood: 'relaxed',
    icon: '🌙',
    books: [
      {
        id: 'hobbit-tolkien',
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1546071216i/5907.jpg',
        description: 'A timeless classic about adventure, friendship, and finding courage in unexpected places.',
        rating: 4.7,
        pace: 'Moderate',
        tone: ['Whimsical', 'Adventurous', 'Cozy'],
        themes: ['Adventure', 'Friendship', 'Journey'],
        bestFor: ['Fantasy Lovers', 'Adventure Seekers'],
        isExternal: false,
        pageCount: 366,
        categories: ['Fantasy', 'Adventure', 'Classic']
      },
      {
        id: 'harry-potter-stone',
        title: 'Harry Potter and the Philosopher\'s Stone',
        author: 'J.K. Rowling',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1550337333i/15868.jpg',
        description: 'The magical beginning of the boy who lived. Perfect for when you need wonder in your life.',
        rating: 4.8,
        pace: 'Fast',
        tone: ['Magical', 'Whimsical', 'Heartwarming'],
        themes: ['Magic', 'Friendship', 'Coming of Age'],
        bestFor: ['Fantasy Fans', 'Young Adults', 'Escapism Seekers'],
        isExternal: false,
        pageCount: 309,
        categories: ['Fantasy', 'Young Adult']
      },
      {
        id: 'priory-orange-tree',
        title: 'The Priory of the Orange Tree',
        author: 'Samantha Shannon',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1549307030i/40275288.jpg',
        description: 'Epic fantasy with dragons, magic, and strong female characters. Perfect for losing yourself.',
        rating: 4.4,
        pace: 'Slow',
        tone: ['Epic', 'Immersive', 'Complex'],
        themes: ['Dragons', 'Magic', 'Politics', 'LGBTQ+'],
        bestFor: ['Fantasy Enthusiasts', 'Epic Story Lovers'],
        isExternal: false,
        pageCount: 827,
        categories: ['Fantasy', 'Epic Fantasy']
      }
    ]
  },
  {
    id: 'curious-learning',
    title: 'Feeling Curious & Ready to Learn?',
    description: 'Fascinating non-fiction to expand your mind and satisfy your curiosity',
    mood: 'curious',
    icon: '🤔',
    books: [
      {
        id: 'sapiens-harari',
        title: 'Sapiens',
        author: 'Yuval Noah Harari',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1420585954i/23692271.jpg',
        description: 'A brief history of humankind. How we conquered the world and what it means for our future.',
        rating: 4.6,
        pace: 'Moderate',
        tone: ['Thought-Provoking', 'Comprehensive', 'Accessible'],
        themes: ['History', 'Anthropology', 'Evolution'],
        bestFor: ['History Buffs', 'Deep Thinkers', 'Curious Minds'],
        isExternal: false,
        pageCount: 443,
        categories: ['History', 'Science', 'Philosophy']
      },
      {
        id: 'thinking-fast-slow',
        title: 'Thinking, Fast and Slow',
        author: 'Daniel Kahneman',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg',
        description: 'How our minds make decisions. Fascinating insights into human psychology and behavior.',
        rating: 4.5,
        pace: 'Slow',
        tone: ['Scientific', 'Detailed', 'Insightful'],
        themes: ['Psychology', 'Decision Making', 'Behavioral Economics'],
        bestFor: ['Psychology Enthusiasts', 'Critical Thinkers'],
        isExternal: false,
        pageCount: 499,
        categories: ['Psychology', 'Science']
      },
      {
        id: 'educated-westover',
        title: 'Educated',
        author: 'Tara Westover',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg',
        description: 'A powerful memoir about education, family, and the transformative power of learning.',
        rating: 4.7,
        pace: 'Moderate',
        tone: ['Powerful', 'Emotional', 'Inspiring'],
        themes: ['Education', 'Family', 'Self-Discovery'],
        bestFor: ['Memoir Lovers', 'Education Advocates'],
        isExternal: false,
        pageCount: 334,
        categories: ['Memoir', 'Biography']
      }
    ]
  },
  {
    id: 'professional-growth',
    title: 'Level Up Your Career',
    description: 'Strategic insights and practical wisdom for professional advancement',
    mood: 'focused',
    icon: '🎯',
    books: [
      {
        id: 'lean-startup',
        title: 'The Lean Startup',
        author: 'Eric Ries',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1333576876i/10127019.jpg',
        description: 'How to build a sustainable business through continuous innovation and validated learning.',
        rating: 4.4,
        pace: 'Moderate',
        tone: ['Practical', 'Strategic', 'Innovative'],
        themes: ['Entrepreneurship', 'Innovation', 'Business Strategy'],
        bestFor: ['Entrepreneurs', 'Product Managers', 'Innovators'],
        isExternal: false,
        pageCount: 336,
        categories: ['Business', 'Entrepreneurship']
      },
      {
        id: 'deep-work',
        title: 'Deep Work',
        author: 'Cal Newport',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1447957962i/25744928.jpg',
        description: 'How to focus without distraction in a hyperconnected world. Essential for knowledge workers.',
        rating: 4.5,
        pace: 'Moderate',
        tone: ['Practical', 'Focused', 'Actionable'],
        themes: ['Productivity', 'Focus', 'Career Success'],
        bestFor: ['Knowledge Workers', 'Students', 'Professionals'],
        isExternal: false,
        pageCount: 296,
        categories: ['Business', 'Self-Help', 'Productivity']
      },
      {
        id: 'good-to-great',
        title: 'Good to Great',
        author: 'Jim Collins',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1298616842i/76865.jpg',
        description: 'Why some companies make the leap to exceptional performance and others don\'t.',
        rating: 4.3,
        pace: 'Moderate',
        tone: ['Research-Based', 'Strategic', 'Insightful'],
        themes: ['Leadership', 'Business Strategy', 'Excellence'],
        bestFor: ['Leaders', 'Managers', 'Business Students'],
        isExternal: false,
        pageCount: 300,
        categories: ['Business', 'Leadership']
      }
    ]
  },
  {
    id: 'adventure-seekers',
    title: 'Craving Adventure?',
    description: 'Thrilling journeys and epic quests to fuel your adventurous spirit',
    mood: 'adventurous',
    icon: '🗺️',
    books: [
      {
        id: 'born-to-run',
        title: 'Born to Run',
        author: 'Christopher McDougall',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1271251688i/6289283.jpg',
        description: 'The hidden tribe, the ultra-runners, and the greatest race the world has never seen.',
        rating: 4.6,
        pace: 'Fast',
        tone: ['Inspiring', 'Adventurous', 'Energetic'],
        themes: ['Running', 'Adventure', 'Human Potential'],
        bestFor: ['Athletes', 'Adventure Lovers', 'Runners'],
        isExternal: false,
        pageCount: 287,
        categories: ['Sports', 'Adventure', 'Health']
      },
      {
        id: 'into-wild',
        title: 'Into the Wild',
        author: 'Jon Krakauer',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1403173986i/1845.jpg',
        description: 'The true story of Christopher McCandless and his Alaskan odyssey.',
        rating: 4.4,
        pace: 'Moderate',
        tone: ['Haunting', 'Adventurous', 'Reflective'],
        themes: ['Adventure', 'Self-Discovery', 'Nature'],
        bestFor: ['Adventure Seekers', 'Nature Lovers'],
        isExternal: false,
        pageCount: 207,
        categories: ['Biography', 'Adventure', 'Nature']
      },
      {
        id: 'name-of-wind',
        title: 'The Name of the Wind',
        author: 'Patrick Rothfuss',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1270352123i/186074.jpg',
        description: 'A legendary tale of magic, music, and adventure from a master storyteller.',
        rating: 4.7,
        pace: 'Moderate',
        tone: ['Lyrical', 'Adventurous', 'Magical'],
        themes: ['Magic', 'Music', 'Adventure', 'Coming of Age'],
        bestFor: ['Fantasy Lovers', 'Adventure Enthusiasts'],
        isExternal: false,
        pageCount: 662,
        categories: ['Fantasy', 'Adventure']
      }
    ]
  },
  {
    id: 'inspiration-needed',
    title: 'Need Some Inspiration?',
    description: 'Uplifting stories and powerful memoirs to reignite your spark',
    mood: 'inspired',
    icon: '✨',
    books: [
      {
        id: 'becoming-obama',
        title: 'Becoming',
        author: 'Michelle Obama',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1528207996i/38746485.jpg',
        description: 'An intimate, powerful memoir by the former First Lady of the United States.',
        rating: 4.8,
        pace: 'Moderate',
        tone: ['Inspiring', 'Honest', 'Empowering'],
        themes: ['Politics', 'Family', 'Leadership', 'Identity'],
        bestFor: ['Biography Lovers', 'Leadership Students', 'Women'],
        isExternal: false,
        pageCount: 448,
        categories: ['Biography', 'Memoir', 'Politics']
      },
      {
        id: 'man-search-meaning',
        title: 'Man\'s Search for Meaning',
        author: 'Viktor Frankl',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1535419394i/4069.jpg',
        description: 'A Holocaust survivor\'s profound insights into finding purpose in the darkest circumstances.',
        rating: 4.7,
        pace: 'Moderate',
        tone: ['Profound', 'Moving', 'Philosophical'],
        themes: ['Philosophy', 'Psychology', 'Resilience', 'Meaning'],
        bestFor: ['Philosophy Students', 'Mental Health Advocates'],
        isExternal: false,
        pageCount: 165,
        categories: ['Philosophy', 'Psychology', 'Biography']
      },
      {
        id: 'alchemist',
        title: 'The Alchemist',
        author: 'Paulo Coelho',
        coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1466865542i/18144590.jpg',
        description: 'A timeless tale about following your dreams and listening to your heart.',
        rating: 4.5,
        pace: 'Fast',
        tone: ['Philosophical', 'Inspiring', 'Mystical'],
        themes: ['Dreams', 'Journey', 'Self-Discovery', 'Spirituality'],
        bestFor: ['Dream Chasers', 'Spiritual Seekers', 'Young Adults'],
        isExternal: false,
        pageCount: 163,
        categories: ['Fiction', 'Philosophy', 'Spirituality']
      }
    ]
  }
];

// Helper function to get collection by mood
export const getCollectionByMood = (mood: string): CuratedCollection | undefined => {
  return CURATED_COLLECTIONS.find(collection => collection.mood === mood);
};

// Helper function to get random collections
export const getRandomCollections = (count: number = 3): CuratedCollection[] => {
  const shuffled = [...CURATED_COLLECTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};