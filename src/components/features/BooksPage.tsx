import React, { useEffect, useState } from 'react';
import { BookCard } from './BookCard';
import { SearchBar } from './SearchBar';
import { Book, Pace } from '../../types';
import { Switch } from '../ui/Switch';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api.supabase';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]); // Store all books for filtering
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeExternal, setIncludeExternal] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  // Handle initial page load and external toggle
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all books from database
        const booksData = await api.books.getAll();
        setAllBooks(booksData);
        
        // Check if there's a search query in URL (for direct URL access)
        const queryParams = new URLSearchParams(location.search);
        const queryFromUrl = queryParams.get('query');
        const typeFromUrl = queryParams.get('type');
        
        if (queryFromUrl) {
          console.log('INITIAL_SEARCH: Performing search from URL on page load');
          // Perform initial search from URL
          try {
            const results = await api.books.search(queryFromUrl, { 
              searchType: typeFromUrl || 'all'
            });
            setBooks(results);
          } catch (err) {
            console.error('Initial URL search failed:', err);
            setBooks(booksData);
          }
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
  
  // Sync URL parameters with state (display only, no search)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryFromUrl = queryParams.get('query');
    const typeFromUrl = queryParams.get('type');
    
    // Just update state to match URL for display purposes
    setSearchQuery(queryFromUrl || '');
    setSearchType(typeFromUrl || 'all');
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

  const handleExternalToggle = () => {
    const newIncludeExternal = !includeExternal;
    setIncludeExternal(newIncludeExternal);
    
    // Note: External API functionality can be implemented later if needed
    // For now, we're working with database books only
    console.log('External toggle changed to:', newIncludeExternal);
  };

  const handleSearch = async (query: string, type?: string) => {
    setSearchQuery(query || '');
    setSearchType(type || 'all');
    setLoading(true);
    setError(null);
    
    try {
      if (!query) {
        // No query, show all books
        setBooks(allBooks);
      } else {
        console.log('SearchBar: Performing search with query:', query);
        // Use the API search which includes QueryRouterService
        const results = await api.books.search(query, { 
          searchType: type || 'all'
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
        />
        
        {/* External API Toggle */}
        <div className="flex items-center justify-end mt-4 space-x-2">
          <span className="text-sm text-gray-600">Include more books from external sources</span>
          <Switch
            checked={includeExternal}
            onChange={handleExternalToggle}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="text-center py-10">
          {searchQuery ? 
            `No books found matching "${searchQuery}"${searchType !== 'all' ? ` by ${searchType}` : ''}. Try a different search.` :
            'No books found. Try enabling external sources or check back later.'
          }
        </div>
      ) : (
        <div>
          {/* Search result info */}
          <div className="mb-4 text-sm text-gray-600">
            {searchQuery ? 
              `Found ${books.length} books for "${searchQuery}"${searchType !== 'all' ? ` by ${searchType}` : ''}` :
              `⏰ Updated at ${new Date().toLocaleTimeString()} - Showing all ${books.length} books from our collection ⏰`
            }
          </div>
          
          {/* Books grid */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {books.map((book) => (
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 