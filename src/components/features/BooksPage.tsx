import React, { useEffect, useState, useRef } from 'react';
import { BookCard } from './BookCard';
import { SearchBar } from './SearchBar';
import { Book, Pace } from '../../types';
import { Switch } from '../ui/Switch';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api.supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

// Interface for Pace objects that might be returned from API
interface PaceObject {
  type?: string;
  value?: string;
}

// Helper function to safely extract value from an object or return the value itself
const extractValue = (item: any): string => {
  if (typeof item === 'object' && item !== null && 'value' in item) {
    return item.value;
  }
  return item?.toString() || '';
};

// Add more books for each theme (5 for each major category)
const featuredBooks: Book[] = [
  // Science Fiction
  {
    id: "sf-dune-1",
    title: "Dune",
    author: "Frank Herbert",
    publishedYear: 1965,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg",
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the \"spice\" melange, a drug capable of extending life and enhancing consciousness.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Epic", "Philosophical", "Political", "Atmospheric", "Complex"],
    themes: ["Power", "Religion", "Ecology", "Politics", "Destiny", "Survival"],
    bestFor: ["Science Fiction Fans", "Political Theorists", "Philosophers", "Environmental Scientists"],
    professions: ["Political Scientists", "Ecologists", "Futurists", "Philosophers"],
    isExternal: false,
    pageCount: 658,
    categories: ["Science Fiction", "Classic", "Space Opera"]
  },
  {
    id: "sf-neuromancer-1",
    title: "Neuromancer",
    author: "William Gibson",
    publishedYear: 1984,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1554437249i/6088007.jpg",
    description: "The Matrix is a world within the world, a global consensus-hallucination, the representation of every byte of data in cyberspace.",
    rating: 4.5,
    pace: "Fast",
    tone: ["Gritty", "Dystopian", "Cyberpunk", "Edgy", "Prophetic"],
    themes: ["Technology", "Artificial Intelligence", "Identity", "Cyberspace", "Corporate Power"],
    bestFor: ["Technology Enthusiasts", "Cyberpunk Fans", "Futurists", "Programmers"],
    professions: ["Software Engineers", "Data Scientists", "Tech Entrepreneurs", "Futurists"],
    isExternal: false,
    pageCount: 271,
    categories: ["Science Fiction", "Cyberpunk", "Classic"]
  },
  {
    id: "sf-hyperion-1",
    title: "Hyperion",
    author: "Dan Simmons",
    publishedYear: 1989,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1405546838i/77566.jpg",
    description: "On the world called Hyperion, beyond the reach of galactic law, waits a creature called the Shrike. There are those who worship it. There are those who fear it. And there are those who have vowed to destroy it.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Literary", "Complex", "Philosophical", "Mysterious", "Epic"],
    themes: ["Time", "Religion", "Artificial Intelligence", "Sacrifice", "Humanity"],
    bestFor: ["Science Fiction Enthusiasts", "Literary Fiction Readers", "Philosophers"],
    professions: ["Writers", "Philosophers", "Religious Scholars", "Scientists"],
    isExternal: false,
    pageCount: 482,
    categories: ["Science Fiction", "Space Opera"]
  },
  {
    id: "sf-foundation-1",
    title: "Foundation",
    author: "Isaac Asimov",
    publishedYear: 1951,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1417900846i/29579.jpg",
    description: "For twelve thousand years the Galactic Empire has ruled supreme. Now it is dying. But only Hari Seldon, creator of the revolutionary science of psychohistory, can see into the future.",
    rating: 4.4,
    pace: "Moderate",
    tone: ["Intellectual", "Visionary", "Political", "Classic"],
    themes: ["Society", "History", "Mathematics", "Power", "Civilization"],
    bestFor: ["Science Fiction Fans", "Mathematicians", "Historians", "Political Scientists"],
    professions: ["Mathematicians", "Social Scientists", "Historians", "Policy Makers"],
    isExternal: false,
    pageCount: 244,
    categories: ["Science Fiction", "Classic"]
  },
  {
    id: "sf-enders-game-1",
    title: "Ender's Game",
    author: "Orson Scott Card",
    publishedYear: 1985,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1408303130i/375802.jpg",
    description: "In order to develop a secure defense against a hostile alien race's next attack, government agencies breed child geniuses and train them as soldiers.",
    rating: 4.5,
    pace: "Fast",
    tone: ["Suspenseful", "Military", "Coming-of-age", "Thought-provoking"],
    themes: ["War", "Leadership", "Ethics", "Childhood", "Manipulation"],
    bestFor: ["Young Adults", "Strategy Enthusiasts", "Military Fiction Fans"],
    professions: ["Military Strategists", "Teachers", "Game Designers", "Psychologists"],
    isExternal: false,
    pageCount: 324,
    categories: ["Science Fiction", "Military Science Fiction"]
  },
  
  // Fantasy
  {
    id: "fantasy-lotr-1",
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    publishedYear: 1954,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1566425108i/33.jpg",
    description: "One Ring to rule them all, One Ring to find them, One Ring to bring them all and in the darkness bind them.",
    rating: 4.8,
    pace: "Slow",
    tone: ["Epic", "Descriptive", "Mythic", "Poetic", "Adventure"],
    themes: ["Good vs Evil", "Fellowship", "Heroism", "Power", "Sacrifice", "Journey"],
    bestFor: ["Fantasy Lovers", "Literary Scholars", "Historians", "Linguists"],
    professions: ["Writers", "Linguists", "Mythologists", "Historians"],
    isExternal: false,
    pageCount: 1178,
    categories: ["Fantasy", "Classic", "Epic"]
  },
  {
    id: "fantasy-name-of-the-wind-1",
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    publishedYear: 2007,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1270352123i/186074.jpg",
    description: "The intimate narrative of how a young man becomes the most notorious wizard his world has ever seen.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Immersive", "Lyrical", "Character-driven", "Coming-of-age"],
    themes: ["Music", "Knowledge", "Identity", "Love", "Revenge"],
    bestFor: ["Fantasy Enthusiasts", "Musicians", "Writers", "Students"],
    professions: ["Musicians", "Writers", "Academics", "Educators"],
    isExternal: false,
    pageCount: 662,
    categories: ["Fantasy", "Epic Fantasy"]
  },
  {
    id: "fantasy-mistborn-1",
    title: "Mistborn: The Final Empire",
    author: "Brandon Sanderson",
    publishedYear: 2006,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1617768316i/68428.jpg",
    description: "In a world where ash falls from the sky and mist dominates the night, an evil cloaks the land. The Dark Lord has reigned with absolute power for a thousand years.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Detailed", "Suspenseful", "Epic", "Dark", "Revolutionary"],
    themes: ["Revolution", "Magic Systems", "Social Classes", "Friendship", "Identity"],
    bestFor: ["Fantasy Readers", "Magic System Enthusiasts", "Revolution Storytelling"],
    professions: ["Writers", "Game Designers", "Political Scientists", "Philosophers"],
    isExternal: false,
    pageCount: 541,
    categories: ["Fantasy", "High Fantasy"]
  },
  {
    id: "fantasy-american-gods-1",
    title: "American Gods",
    author: "Neil Gaiman",
    publishedYear: 2001,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1462924585i/30165203.jpg",
    description: "A blend of Americana, fantasy, and mythology, telling the story of a war brewing between old and new gods.",
    rating: 4.5,
    pace: "Slow",
    tone: ["Dark", "Mythic", "Surreal", "Atmospheric", "Road Trip"],
    themes: ["Religion", "Identity", "America", "Belief", "Immigration"],
    bestFor: ["Mythology Enthusiasts", "Cultural Anthropologists", "American Culture Students"],
    professions: ["Anthropologists", "Religious Scholars", "Cultural Critics", "Writers"],
    isExternal: false,
    pageCount: 635,
    categories: ["Fantasy", "Mythology", "Urban Fantasy"]
  },
  {
    id: "fantasy-game-of-thrones-1",
    title: "A Game of Thrones",
    author: "George R.R. Martin",
    publishedYear: 1996,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1562726234i/13496.jpg",
    description: "Summers span decades. Winter can last a lifetime. And the struggle for the Iron Throne has begun.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Gritty", "Political", "Realistic", "Complex", "Brutal"],
    themes: ["Power", "Politics", "War", "Family", "Loyalty", "Betrayal"],
    bestFor: ["Political Strategy Fans", "Medieval History Buffs", "Complex Character Enthusiasts"],
    professions: ["Political Scientists", "Historians", "Strategic Planners", "Diplomats"],
    isExternal: false,
    pageCount: 835,
    categories: ["Fantasy", "Epic Fantasy", "Political Fantasy"]
  },
  
  // Romance
  {
    id: "romance-pride-1",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publishedYear: 1813,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1320399351i/1885.jpg",
    description: "Since its immediate success in 1813, Pride and Prejudice has remained one of the most popular novels in the English language.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Witty", "Ironic", "Romantic", "Satirical", "Elegant"],
    themes: ["Social Class", "Marriage", "Pride", "Prejudice", "Love", "Self-discovery"],
    bestFor: ["Romance Readers", "Literary Critics", "Sociologists", "Feminists"],
    professions: ["English Professors", "Sociologists", "Journalists", "Writers"],
    isExternal: false,
    pageCount: 279,
    categories: ["Romance", "Classic", "Literary Fiction"]
  },
  {
    id: "romance-jane-eyre-1",
    title: "Jane Eyre",
    author: "Charlotte Brontë",
    publishedYear: 1847,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1557343311i/10210.jpg",
    description: "Jane Eyre follows the emotions and experiences of its title character, as she grows from an orphan into a governess, and falls in love with the master of the house.",
    rating: 4.5,
    pace: "Moderate",
    tone: ["Gothic", "Romantic", "Passionate", "Mysterious", "Feminist"],
    themes: ["Love", "Independence", "Social Class", "Gender", "Morality"],
    bestFor: ["Romance Readers", "Gothic Literature Fans", "Feminist Studies"],
    professions: ["Teachers", "Writers", "Psychologists", "Social Workers"],
    isExternal: false,
    pageCount: 532,
    categories: ["Romance", "Classic", "Gothic"]
  },
  {
    id: "romance-outlander-1",
    title: "Outlander",
    author: "Diana Gabaldon",
    publishedYear: 1991,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1529065012i/10964.jpg",
    description: "The year is 1945. Claire Randall, a former combat nurse, is just back from the war and reunited with her husband on a second honeymoon when she walks through a standing stone in one of the ancient circles that dot the British Isles.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Historical", "Romantic", "Adventure", "Detailed", "Time-travel"],
    themes: ["Love", "Time Travel", "History", "Survival", "Identity"],
    bestFor: ["Historical Fiction Fans", "Romance Readers", "Adventure Enthusiasts"],
    professions: ["Historians", "Nurses", "Archaeologists", "Writers"],
    isExternal: false,
    pageCount: 850,
    categories: ["Romance", "Historical Fiction", "Fantasy"]
  },
  {
    id: "romance-notebook-1",
    title: "The Notebook",
    author: "Nicholas Sparks",
    publishedYear: 1996,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1483183484i/33648131.jpg",
    description: "A story of miracles and emotions that make us laugh, cry, and hope.",
    rating: 4.4,
    pace: "Fast",
    tone: ["Emotional", "Nostalgic", "Sentimental", "Heartwarming"],
    themes: ["Love", "Memory", "Aging", "Devotion", "Sacrifice"],
    bestFor: ["Romance Enthusiasts", "Emotional Story Lovers", "Relationship Studies"],
    professions: ["Healthcare Workers", "Elderly Care Specialists", "Therapists", "Writers"],
    isExternal: false,
    pageCount: 214,
    categories: ["Romance", "Contemporary", "Fiction"]
  },
  {
    id: "romance-normal-people-1",
    title: "Normal People",
    author: "Sally Rooney",
    publishedYear: 2018,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1571423190i/41057294.jpg",
    description: "Follows the complex friendship and relationship between two teenagers who pretend not to know each other at school but forge a connection that changes their lives.",
    rating: 4.3,
    pace: "Moderate",
    tone: ["Contemporary", "Intimate", "Realistic", "Melancholic", "Character-driven"],
    themes: ["Love", "Class", "Communication", "Mental Health", "Identity"],
    bestFor: ["Contemporary Fiction Readers", "Young Adults", "Social Dynamics Students"],
    professions: ["Psychologists", "Sociologists", "Educators", "Social Workers"],
    isExternal: false,
    pageCount: 273,
    categories: ["Romance", "Contemporary", "Literary Fiction"]
  },
  
  // Non-fiction
  {
    id: "nonfiction-thinking-1",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    publishedYear: 2011,
    coverImage: "https://m.media-amazon.com/images/I/41shZGS-G+L._SY445_SX342_.jpg",
    description: "The renowned psychologist and winner of the Nobel Prize in Economics takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think.",
    rating: 4.5,
    pace: "Slow",
    tone: ["Academic", "Insightful", "Analytical", "Accessible", "Thought-provoking"],
    themes: ["Psychology", "Decision Making", "Behavioral Economics", "Cognitive Biases", "Rationality"],
    bestFor: ["Business Leaders", "Product Managers", "Decision Makers", "Psychology Enthusiasts"],
    professions: ["Psychologists", "Economists", "Product Managers", "Executives", "Data Scientists"],
    isExternal: false,
    pageCount: 499,
    categories: ["Psychology", "Non-fiction", "Economics", "Science"]
  },
  {
    id: "nonfiction-sapiens-1",
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    publishedYear: 2011,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1595674533i/23692271.jpg",
    description: "Explores the ways in which biology and history have defined us and enhanced our understanding of what it means to be human.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Accessible", "Thought-provoking", "Engaging", "Provocative", "Big-picture"],
    themes: ["Human Evolution", "History", "Anthropology", "Society", "Culture"],
    bestFor: ["History Enthusiasts", "Science Readers", "Anthropology Students", "Big Picture Thinkers"],
    professions: ["Anthropologists", "Historians", "Social Scientists", "Educators", "Futurists"],
    isExternal: false,
    pageCount: 443,
    categories: ["History", "Non-fiction", "Science", "Anthropology"]
  },
  {
    id: "nonfiction-atomic-habits-1",
    title: "Atomic Habits",
    author: "James Clear",
    publishedYear: 2018,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1535115320i/40121378.jpg",
    description: "Tiny Changes, Remarkable Results: An Easy & Proven Way to Build Good Habits & Break Bad Ones.",
    rating: 4.8,
    pace: "Fast",
    tone: ["Practical", "Actionable", "Inspiring", "Clear", "Methodical"],
    themes: ["Habit Formation", "Self-Improvement", "Psychology", "Productivity", "Behavior Change"],
    bestFor: ["Self-Help Enthusiasts", "Productivity Seekers", "Coaches", "Managers"],
    professions: ["Coaches", "Managers", "Entrepreneurs", "Teachers", "Healthcare Professionals"],
    isExternal: false,
    pageCount: 320,
    categories: ["Self-Help", "Non-fiction", "Psychology", "Personal Development"]
  },
  {
    id: "nonfiction-educated-1",
    title: "Educated",
    author: "Tara Westover",
    publishedYear: 2018,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg",
    description: "A memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.",
    rating: 4.7,
    pace: "Moderate",
    tone: ["Compelling", "Inspiring", "Raw", "Personal", "Moving"],
    themes: ["Education", "Family", "Identity", "Resilience", "Self-Determination"],
    bestFor: ["Memoir Readers", "Educators", "Social Workers", "Psychology Students"],
    professions: ["Educators", "Psychologists", "Social Workers", "Counselors"],
    isExternal: false,
    pageCount: 334,
    categories: ["Memoir", "Non-fiction", "Biography", "Education"]
  },
  {
    id: "nonfiction-becoming-1",
    title: "Becoming",
    author: "Michelle Obama",
    publishedYear: 2018,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1528206996i/38746485.jpg",
    description: "In her memoir, Michelle Obama invites readers into her world, chronicling the experiences that have shaped her.",
    rating: 4.6,
    pace: "Moderate",
    tone: ["Intimate", "Inspiring", "Reflective", "Authentic", "Eloquent"],
    themes: ["Identity", "Politics", "Race", "Family", "Leadership"],
    bestFor: ["Memoir Readers", "Political Science Students", "Women Studies", "Leadership Development"],
    professions: ["Public Servants", "Lawyers", "Community Organizers", "Educators", "Leaders"],
    isExternal: false,
    pageCount: 426,
    categories: ["Memoir", "Non-fiction", "Biography", "Politics"]
  }
];

export const BooksPage = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]); // Store all books for filtering
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [externalLoading, setExternalLoading] = useState(false);
  const [includeExternal, setIncludeExternal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [isColorSearchMode, setIsColorSearchMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedColors, setSelectedColors] = useState<any[]>([]);
  const [colorIntensity, setColorIntensity] = useState(1);
  
  // Track processed URLs to prevent duplicate processing
  const processedUrlRef = useRef<string>('');

  // Color definitions (from SearchBar)
  const colors = [
    { name: 'Overwhelmed', value: '#64748b', emotion: 'overwhelmed' },
    { name: 'Inspiration', value: '#f59e0b', emotion: 'inspiration' },
    { name: 'Escape', value: '#14b8a6', emotion: 'escape' },
    { name: 'Adventure', value: '#dc2626', emotion: 'adventure' },
    { name: 'Nostalgic', value: '#b45309', emotion: 'nostalgic' },
    { name: 'Learning', value: '#059669', emotion: 'learning' },
    { name: 'Humor', value: '#eab308', emotion: 'humor' },
    { name: 'Romantic', value: '#ec4899', emotion: 'romantic' },
    { name: 'Mysterious', value: '#7c3aed', emotion: 'mysterious' },
    { name: 'Serene', value: '#2563eb', emotion: 'serene' },
    { name: 'Passionate', value: '#ea580c', emotion: 'passionate' },
    { name: 'Sophisticated', value: '#4338ca', emotion: 'sophisticated' }
  ];

  // Handle initial page load and external toggle
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all books from database
        const booksData = await api.books.getAll({
          includeExternal: includeExternal
        });
        setAllBooks(booksData);
        
        // Check if there's a search query in URL (for direct URL access)
        const queryParams = new URLSearchParams(location.search);
        const queryFromUrl = queryParams.get('query');
        const typeFromUrl = queryParams.get('type');
        const colorFromUrl = queryParams.get('color');
        
        if (queryFromUrl) {
          console.log('INITIAL_SEARCH: Performing search from URL on page load');
          // Perform initial search from URL
          try {
            const results = await api.books.search(queryFromUrl, { 
              searchType: typeFromUrl || 'all',
              includeExternal: includeExternal
            });
            setBooks(results);
          } catch (err) {
            console.error('Initial URL search failed:', err);
            setBooks(booksData);
          }
        } else if (colorFromUrl) {
          console.log('FETCH: Color search detected, skipping initial setBooks to avoid override');
          // Don't set books here - let the color search useEffect handle it
        } else {
          console.log('FETCH: Using all books from database');
          setBooks(booksData);
        }
        
      } catch (err) {
        console.error('Error fetching books:', err);
        setError(err instanceof Error ? err.message : 'Failed to load books. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [includeExternal]); // Only depends on includeExternal, not location.search
  
  // Handle color search from URL when books are loaded
  useEffect(() => {
    if (allBooks.length === 0) return; // Wait for books to load
    
    const queryParams = new URLSearchParams(location.search);
    const colorFromUrl = queryParams.get('color');
    const currentUrl = location.search;
    
    // Only process if we have a color URL and haven't processed this exact URL yet
    if (colorFromUrl && currentUrl !== processedUrlRef.current) {
      const matchedColor = colors.find(color => 
        color.emotion.toLowerCase() === colorFromUrl.toLowerCase()
      );
      
      if (matchedColor) {
        processedUrlRef.current = currentUrl; // Mark this URL as processed
        
        setIsColorSearchMode(true);
        setSelectedColor(matchedColor);
        setSelectedColors([{ ...matchedColor, intensity: 1 }]);
        setLoading(true);
        
        try {
          const filteredBooks = filterBooksByColor(matchedColor, allBooks);
          setBooks(filteredBooks);
          setSearchQuery(`Color: ${matchedColor.name}`);
          setSearchType('color');
        } catch (err) {
          console.error('Color search failed:', err);
          setBooks(allBooks);
        } finally {
          setLoading(false);
        }
      }
    }
  }, [allBooks, location.search]); // Remove isColorSearchMode from dependencies
  
  // Sync other URL parameters with state (non-color searches)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryFromUrl = queryParams.get('query');
    const typeFromUrl = queryParams.get('type');
    const colorFromUrl = queryParams.get('color');
    
    // Only handle non-color URL parameters
    if (!colorFromUrl) {
      setSearchQuery(queryFromUrl || '');
      setSearchType(typeFromUrl || 'all');
    }
  }, [location.search]);

  // Function to filter books based on search query and type
  const filterBooks = (allBooks: Book[], query: string, searchType: string): Book[] => {
    if (!query) return allBooks;
    
    const lowerQuery = query.toLowerCase();
    
    return allBooks.filter(book => {
      switch (searchType) {
        case 'title':
          return book.title.toLowerCase().includes(lowerQuery);
        case 'author':
          return book.author.toLowerCase().includes(lowerQuery);
        case 'mood':
        case 'tone':
          return book.tone && book.tone.some(tone => 
            String(tone).toLowerCase().includes(lowerQuery)
          );
        case 'theme':
          return book.themes && book.themes.some(theme => 
            String(theme).toLowerCase().includes(lowerQuery)
          );
        case 'profession':
          return book.professions && book.professions.some(profession => 
            String(profession).toLowerCase().includes(lowerQuery)
          );
        case 'category':
          return book.categories && book.categories.some(category => 
            String(category).toLowerCase().includes(lowerQuery)
          );
        case 'pace':
          return book.pace && String(book.pace).toLowerCase().includes(lowerQuery);
        case 'all':
        default:
          // Search all fields
          return book.title.toLowerCase().includes(lowerQuery) ||
                 book.author.toLowerCase().includes(lowerQuery) ||
                 (book.themes && book.themes.some(theme => String(theme).toLowerCase().includes(lowerQuery))) ||
                 (book.tone && book.tone.some(tone => String(tone).toLowerCase().includes(lowerQuery))) ||
                 (book.professions && book.professions.some(profession => String(profession).toLowerCase().includes(lowerQuery))) ||
                 (book.bestFor && book.bestFor.some(bestFor => String(bestFor).toLowerCase().includes(lowerQuery))) ||
                 (book.categories && book.categories.some(category => String(category).toLowerCase().includes(lowerQuery))) ||
                 (book.description && book.description.toLowerCase().includes(lowerQuery));
      }
    });
  };

  const handleExternalToggle = async () => {
    const newIncludeExternal = !includeExternal;
    setIncludeExternal(newIncludeExternal);
    
    console.log('External toggle changed to:', newIncludeExternal);
    
    // If turning on external sources and there's an active search, re-run it
    if (newIncludeExternal && searchQuery) {
      setExternalLoading(true);
      try {
        console.log('Re-running search with external sources enabled');
        const results = await api.books.search(searchQuery, { 
          searchType: searchType || 'all',
          includeExternal: newIncludeExternal
        });
        setBooks(results);
      } catch (err) {
        console.error('External search failed:', err);
        setError('Failed to fetch external sources. Please try again.');
      } finally {
        setExternalLoading(false);
      }
    }
  };

  const handleSearch = async (query: string, type?: string) => {
    // Reset color search mode when doing regular search
    setIsColorSearchMode(false);
    setSelectedColor(null);
    setSelectedColors([]);
    
    setSearchQuery(query || '');
    setSearchType(type || 'all');
    setLoading(true);
    setError(null);
    
    // Set external loading if external sources are enabled and we have a query
    if (includeExternal && query) {
      setExternalLoading(true);
    }
    
    try {
      if (!query) {
        // No query, show all books
        setBooks(allBooks);
      } else {
        console.log('SearchBar: Performing search with query:', query);
        // Use the API search which includes QueryRouterService
        const results = await api.books.search(query, { 
          searchType: type || 'all',
          includeExternal: includeExternal
        });
        console.log('SearchBar: Search completed, found', results.length, 'books');
        setBooks(results);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
      // Fallback to local filtering if API search fails
      const filteredBooks = filterBooks(allBooks, query || '', type || 'all');
      setBooks(filteredBooks);
    } finally {
      setLoading(false);
      setExternalLoading(false);
    }
    
    // Update URL to reflect the search
    const searchParams = new URLSearchParams();
    if (query) {
      searchParams.set('query', query);
      if (type && type !== 'all') {
        searchParams.set('type', type);
      }
      navigate(`/books?${searchParams.toString()}`);
    } else {
      navigate('/books');
    }
  };

  const handleMoodSelect = (mood: string) => {
    handleSearch(mood, 'mood');
  };

  // Map emotions to book themes/tones for better matching (from ColorSearchPage)
  const mapEmotionToBookAttributes = (emotion: string): string[] => {
    const emotionMap: { [key: string]: string[] } = {
      'overwhelmed': ['Self-Help', 'Psychology', 'Meditation', 'Mindfulness'],
      'inspiration': ['Self-Help', 'Biography', 'Motivation', 'Personal Development'],
      'serene': ['Philosophy', 'Meditation', 'Nature', 'Spiritual'],
      'learning': ['Education', 'Science', 'History', 'Academic'],
      'escape': ['Fiction', 'Fantasy', 'Adventure', 'Science Fiction'],
      'adventure': ['Adventure', 'Travel', 'Action', 'Exploration'],
      'mysterious': ['Mystery', 'Thriller', 'Crime', 'Suspense'],
      'humor': ['Comedy', 'Humor', 'Satirical', 'Funny'],
      'romantic': ['Romance', 'Love', 'Relationships'],
      'sophisticated': ['Literary Fiction', 'Classic', 'Philosophy'],
      'nostalgic': ['Historical Fiction', 'Classic', 'Memory'],
      'passionate': ['Romance', 'Biography', 'Intense'],
    };
    
    return emotionMap[emotion] || [];
  };

  // Filter and score books based on color selection and emotions (from ColorSearchPage)
  const filterBooksByColor = (color: any, allBooks: Book[]): Book[] => {
    // Map emotion to book attributes
    const searchTerms = mapEmotionToBookAttributes(color.emotion);
    
    if (searchTerms.length === 0) return allBooks;
    
    const booksWithScores = allBooks.map(book => {
      let score = 0;
      let matches = 0;
      
      // Check themes (weight: 3)
      if (book.themes) {
        const themeMatches = book.themes.filter(theme => 
          searchTerms.some(term => 
            String(theme).toLowerCase().includes(term.toLowerCase())
          )
        ).length;
        score += themeMatches * 3;
        matches += themeMatches;
      }
      
      // Check tone (weight: 2)
      if (book.tone) {
        const toneMatches = book.tone.filter(tone => 
          searchTerms.some(term => 
            String(tone).toLowerCase().includes(term.toLowerCase())
          )
        ).length;
        score += toneMatches * 2;
        matches += toneMatches;
      }
      
      // Check categories (weight: 2)
      if (book.categories) {
        const categoryMatches = book.categories.filter(category => 
          searchTerms.some(term => 
            String(category).toLowerCase().includes(term.toLowerCase())
          )
        ).length;
        score += categoryMatches * 2;
        matches += categoryMatches;
      }
      
      // Check description (weight: 1)
      if (book.description) {
        const descriptionMatches = searchTerms.filter(term => 
          book.description!.toLowerCase().includes(term.toLowerCase())
        ).length;
        score += descriptionMatches * 1;
        matches += descriptionMatches;
      }
      
      // Calculate percentage (80-99 range for good matches, 0 for no matches)
      const matchPercentage = matches > 0 ? Math.min(80 + (score * 3), 99) : 0;
      
      return {
        ...book,
        colorScore: score,
        colorMatchPercentage: matchPercentage
      };
    })
    .filter(book => book.colorScore > 0)
    .sort((a, b) => b.colorMatchPercentage - a.colorMatchPercentage); // Sort by match % descending
    
    return booksWithScores;
  };

  // Color blending utilities
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
  };

  const blendColors = (selectedColors: any[]): string => {
    if (selectedColors.length === 0) return '#f3f4f6';
    
    let totalWeight = 0;
    let weightedR = 0, weightedG = 0, weightedB = 0;

    selectedColors.forEach((colorData) => {
      const [r, g, b] = hexToRgb(colorData.value);
      const weight = colorData.intensity || 1;
      weightedR += r * weight;
      weightedG += g * weight;
      weightedB += b * weight;
      totalWeight += weight;
    });

    const blendedR = weightedR / totalWeight;
    const blendedG = weightedG / totalWeight;
    const blendedB = weightedB / totalWeight;

    return rgbToHex(blendedR, blendedG, blendedB);
  };

  const handleColorSearch = async (color: any) => {
    setIsColorSearchMode(true);
    setSelectedColor(color);
    // Initialize with single color selection
    setSelectedColors([{ ...color, intensity: 1 }]);
    setLoading(true);
    setError(null);
    
    try {
      console.log('Color search triggered with:', color.emotion);
      console.log('Mapping to attributes:', mapEmotionToBookAttributes(color.emotion));
      
      // Use proper color psychology matching instead of API search
      const filteredBooks = filterBooksByColor(color, allBooks);
      
      console.log('Color search completed, found', filteredBooks.length, 'books');
      setBooks(filteredBooks);
      setSearchQuery(`Color: ${color.name}`);
      setSearchType('color');
    } catch (err) {
      console.error('Color search failed:', err);
      setError('Color search failed. Please try again.');
      // Fallback to all books
      setBooks(allBooks);
    } finally {
      setLoading(false);
    }
    
    // Update URL to reflect color search
    navigate(`/books?color=${encodeURIComponent(color.emotion)}`);
  };

  const handleColorAdd = (color: any) => {
    const existing = selectedColors.find(sc => sc.emotion === color.emotion);
    let newSelectedColors: any[];
    
    if (existing) {
      // Increase intensity (max 3)
      const newIntensity = Math.min(existing.intensity + 1, 3);
      newSelectedColors = selectedColors.map(sc => 
        sc.emotion === color.emotion 
          ? { ...sc, intensity: newIntensity }
          : sc
      );
    } else {
      // Add new color
      newSelectedColors = [...selectedColors, { ...color, intensity: 1 }];
    }
    
    setSelectedColors(newSelectedColors);
    // Refresh search with updated colors
    setTimeout(() => refreshColorSearchWithColors(newSelectedColors), 100);
  };

  const handleColorRemove = (colorEmotion: string) => {
    const newSelectedColors = selectedColors.filter(sc => sc.emotion !== colorEmotion);
    setSelectedColors(newSelectedColors);
    setTimeout(() => refreshColorSearchWithColors(newSelectedColors), 100);
  };

  const refreshColorSearchWithColors = (colors: any[]) => {
    if (colors.length === 0) {
      setBooks(allBooks);
      return;
    }
    
    setLoading(true);
    try {
      // Combine all selected colors for matching
      const allEmotions = colors.map(sc => sc.emotion);
      const allSearchTerms = allEmotions.flatMap(emotion => mapEmotionToBookAttributes(emotion));
      const uniqueSearchTerms = Array.from(new Set(allSearchTerms));
      
      const booksWithScores = allBooks.map(book => {
        let score = 0;
        let matches = 0;
        
        // Check themes (weight: 3)
        if (book.themes) {
          const themeMatches = book.themes.filter(theme => 
            uniqueSearchTerms.some(term => 
              String(theme).toLowerCase().includes(term.toLowerCase())
            )
          ).length;
          score += themeMatches * 3;
          matches += themeMatches;
        }
        
        // Check tone (weight: 2)
        if (book.tone) {
          const toneMatches = book.tone.filter(tone => 
            uniqueSearchTerms.some(term => 
              String(tone).toLowerCase().includes(term.toLowerCase())
            )
          ).length;
          score += toneMatches * 2;
          matches += toneMatches;
        }
        
        // Check categories (weight: 2)
        if (book.categories) {
          const categoryMatches = book.categories.filter(category => 
            uniqueSearchTerms.some(term => 
              String(category).toLowerCase().includes(term.toLowerCase())
            )
          ).length;
          score += categoryMatches * 2;
          matches += categoryMatches;
        }
        
        // Check description (weight: 1)
        if (book.description) {
          const descriptionMatches = uniqueSearchTerms.filter(term => 
            book.description!.toLowerCase().includes(term.toLowerCase())
          ).length;
          score += descriptionMatches * 1;
          matches += descriptionMatches;
        }
        
        // Calculate percentage with intensity bonus
        const totalIntensity = colors.reduce((sum, c) => sum + (c.intensity || 1), 0);
        const intensityBonus = Math.min(totalIntensity * 2, 10); // Max 10 bonus points
        const matchPercentage = matches > 0 ? Math.min(80 + (score * 3) + intensityBonus, 99) : 0;
        
        return {
          ...book,
          colorScore: score,
          colorMatchPercentage: matchPercentage
        };
      })
      .filter(book => book.colorScore > 0)
      .sort((a, b) => b.colorMatchPercentage - a.colorMatchPercentage);
      
      setBooks(booksWithScores);
    } finally {
      setLoading(false);
    }
  };

  const refreshColorSearch = () => {
    if (selectedColors.length === 0) return;
    
    setLoading(true);
    try {
      // Combine all selected colors for matching
      const allEmotions = selectedColors.map(sc => sc.emotion);
      const allSearchTerms = allEmotions.flatMap(emotion => mapEmotionToBookAttributes(emotion));
      const uniqueSearchTerms = Array.from(new Set(allSearchTerms));
      
      const filteredBooks = allBooks.filter(book => {
        const themeMatch = book.themes && book.themes.some(theme => 
          uniqueSearchTerms.some(term => 
            String(theme).toLowerCase().includes(term.toLowerCase())
          )
        );
        
        const toneMatch = book.tone && book.tone.some(tone => 
          uniqueSearchTerms.some(term => 
            String(tone).toLowerCase().includes(term.toLowerCase())
          )
        );
        
        const categoryMatch = book.categories && book.categories.some(category => 
          uniqueSearchTerms.some(term => 
            String(category).toLowerCase().includes(term.toLowerCase())
          )
        );
        
        const descriptionMatch = book.description && uniqueSearchTerms.some(term => 
          book.description!.toLowerCase().includes(term.toLowerCase())
        );
        
        return themeMatch || toneMatch || categoryMatch || descriptionMatch;
      });
      
      setBooks(filteredBooks);
    } finally {
      setLoading(false);
    }
  };



  // Debug information for rendering
  useEffect(() => {
    console.log('RENDER DEBUG - Books length:', books.length);
    console.log('RENDER DEBUG - Search query:', searchQuery);
    console.log('RENDER DEBUG - Search type:', searchType);
  }, [books.length, searchQuery, searchType]);

  if (loading) {
    return <div className="text-center py-10">Loading books...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-primary-900">Book Recommendations</h1>
        <p className="text-lg text-primary-600">
          Discover books that match your interests and reading style
        </p>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto">
        <SearchBar 
          onSearch={handleSearch}
          onMoodSelect={handleMoodSelect}
          onColorSearch={handleColorSearch}
        />
        
        {/* External API Toggle */}
        <div className="flex items-center justify-end mt-4 space-x-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Include more books from external sources</span>
            {externalLoading && (
              <div className="flex items-center space-x-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-500"></div>
                <span className="text-xs text-green-600 font-medium">Fetching...</span>
              </div>
            )}
          </div>
          <Switch
            checked={includeExternal}
            onChange={externalLoading ? () => {} : handleExternalToggle}
            className={`data-[state=checked]:bg-green-500 ${externalLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {/* Books Grid with Color Sidebar */}
      {books.length === 0 && !externalLoading ? (
        <div className="text-center py-10">
          {searchQuery ? (
            <div className="space-y-2">
              <p>{`No books found matching "${searchQuery}"${searchType !== 'all' ? ` by ${searchType}` : ''}.`}</p>
              {!includeExternal && (
                <p className="text-sm text-gray-500">
                  Try enabling "Include more books from external sources" for more results.
                </p>
              )}
            </div>
          ) : (
            'No books found. Try enabling external sources or check back later.'
          )}
        </div>
      ) : externalLoading && books.length === 0 ? (
        <div className="text-center py-10">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            <span className="text-lg text-gray-600">Searching external sources...</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
        </div>
      ) : (
        <div className={isColorSearchMode ? "flex gap-8 items-start" : ""}>
          {/* Main Content */}
          <div className={isColorSearchMode ? "flex-1" : ""}>
            {/* Search result info - Only show for actual searches */}
            {!isColorSearchMode && searchQuery && (
              <div className="mb-4 text-sm text-gray-600">
                Found {books.length} books for "{searchQuery}"{searchType !== 'all' ? ` by ${searchType}` : ''}
              </div>
            )}
            
            {/* External loading indicator when books are already shown */}
            {externalLoading && books.length > 0 && (
              <div className="mb-4 flex items-center justify-center space-x-2 py-3 bg-green-50 rounded-lg border border-green-200">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                <span className="text-sm text-green-700 font-medium">Adding books from external sources...</span>
              </div>
            )}
            
                        {/* Books grid with Apple-style transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${searchQuery}-${searchType}-${selectedColor?.emotion || ''}-${loading}`}
                className="grid gap-6 grid-cols-1 lg:grid-cols-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0.0, 0.2, 1] // Apple's standard easing
                }}
              >
                {books.map((book, index) => (
                  <BookCard
                    key={book.id || `${book.title}-${book.author}`}
                    title={book.title}
                    author={book.author}
                    coverImage={book.coverImage}
                    pace={book.pace as Pace}
                    tone={book.tone}
                    themes={book.themes}
                    description={book.description || "No description available"}
                    bestFor={book.bestFor}
                    isExternal={book.isExternal || false}
                    isColorSearchMode={isColorSearchMode}
                    colorMatchPercentage={isColorSearchMode ? (book as any).colorMatchPercentage : undefined}
                    selectedColor={selectedColor}
                    selectedColors={selectedColors}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Color Sidebar - Only show in color search mode */}
          {isColorSearchMode && (
            <div className="w-[275px] flex-shrink-0">
              <div className={`rounded-lg shadow-lg p-6 sticky top-4 transition-colors duration-300 border ${
                theme === 'light'
                  ? 'bg-white border-gray-200'
                  : theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  Color Mood Blending
                </h3>
                
                {/* Selected Colors */}
                {selectedColors.length > 0 && (
                  <div className="mb-6">
                                         <h4 className={`text-sm font-medium mb-3 transition-colors duration-300 ${
                       theme === 'light'
                         ? 'text-gray-700'
                         : theme === 'dark'
                         ? 'text-gray-300'
                         : 'text-purple-700'
                     }`}>Active Colors</h4>
                    <div className="space-y-2">
                      {selectedColors.map((color) => (
                        <div key={color.emotion} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                                                         <div 
                               className={`w-6 h-6 rounded-md border transition-colors duration-300 ${
                                 theme === 'light'
                                   ? 'border-gray-200'
                                   : theme === 'dark'
                                   ? 'border-gray-600'
                                   : 'border-purple-200'
                               }`}
                               style={{ backgroundColor: color.value }}
                             />
                                                         <span className={`text-sm font-medium transition-colors duration-300 ${
                               theme === 'light'
                                 ? 'text-gray-900'
                                 : theme === 'dark'
                                 ? 'text-white'
                                 : 'text-purple-900'
                             }`}>{color.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Intensity dots */}
                            <div className="flex space-x-1">
                              {[1, 2, 3].map((dot) => (
                                <div
                                  key={dot}
                                                                     className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                     dot <= color.intensity 
                                       ? theme === 'light'
                                         ? 'bg-gray-800'
                                         : theme === 'dark'
                                         ? 'bg-white'
                                         : 'bg-purple-800'
                                       : theme === 'light'
                                       ? 'bg-gray-300'
                                       : theme === 'dark'
                                       ? 'bg-gray-600'
                                       : 'bg-purple-300'
                                   }`}
                                />
                              ))}
                            </div>
                            <button
                              onClick={() => handleColorRemove(color.emotion)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Blend Visualization */}
                {selectedColors.length > 1 && (
                  <div className="mb-6">
                                         <h4 className={`text-sm font-medium mb-3 transition-colors duration-300 ${
                       theme === 'light'
                         ? 'text-gray-700'
                         : theme === 'dark'
                         ? 'text-gray-300'
                         : 'text-purple-700'
                     }`}>Your Emotional Blend</h4>
                                         <div 
                       className={`w-full h-16 rounded-lg border transition-colors duration-300 ${
                         theme === 'light'
                           ? 'border-gray-200'
                           : theme === 'dark'
                           ? 'border-gray-600'
                           : 'border-purple-200'
                       }`}
                       style={{ backgroundColor: blendColors(selectedColors) }}
                     />
                                         <p className={`text-xs mt-2 transition-colors duration-300 ${
                       theme === 'light'
                         ? 'text-gray-600'
                         : theme === 'dark'
                         ? 'text-gray-400'
                         : 'text-purple-600'
                     }`}>
                       Blending {selectedColors.map(c => c.name).join(' + ')}
                     </p>
                  </div>
                )}

                {/* Add More Colors */}
                <div className="mb-4">
                                     <h4 className={`text-sm font-medium mb-3 transition-colors duration-300 ${
                     theme === 'light'
                       ? 'text-gray-700'
                       : theme === 'dark'
                       ? 'text-gray-300'
                       : 'text-purple-700'
                   }`}>Add More Colors</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.emotion}
                        onClick={() => handleColorAdd(color)}
                                                 className={`w-8 h-8 rounded-md border hover:scale-105 transition-all duration-300 ${
                           theme === 'light'
                             ? 'border-gray-200'
                             : theme === 'dark'
                             ? 'border-gray-600'
                             : 'border-purple-200'
                         }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Clear All and Exit Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedColors([]);
                      // Stay in color mode, but reset to all books
                      setBooks(allBooks);
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors duration-300 ${
                      theme === 'light'
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                    }`}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => {
                      setSelectedColors([]);
                      setIsColorSearchMode(false);
                      setBooks(allBooks);
                      navigate('/books');
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                      theme === 'light'
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
                    }`}
                  >
                    Exit Mode
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 