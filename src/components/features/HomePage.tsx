import React, { useEffect, useState } from 'react';
import { SearchBar } from './SearchBar';
import { ThreadCard } from './ThreadCard';
import { BookCard } from './BookCard';
import { Book, Thread, Pace } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { normalizeTag } from './ThreadPage'; // Import the normalizeTag function
import { useTheme } from '../../contexts/ThemeContext';

// Add interface for pace object
interface PaceObject {
  type: string;
  value: Pace;
}

// Featured books for homepage display
const featuredBooks: Book[] = [
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
    id: "fantasy-lotr-1",
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    publishedYear: 1954,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1566425108i/33.jpg",
    description: "One Ring to rule them all, One Ring to find them, One Ring to bring them all and in the darkness bind them. In ancient times the Rings of Power were crafted by the Elven-smiths, and Sauron, the Dark Lord, forged the One Ring, filling it with his own power so that he could rule all others.",
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
    id: "romance-pride-1",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publishedYear: 1813,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1320399351i/1885.jpg",
    description: "Since its immediate success in 1813, Pride and Prejudice has remained one of the most popular novels in the English language. Jane Austen called this brilliant work \"her own darling child\" and its vivacious heroine, Elizabeth Bennet, \"as delightful a creature as ever appeared in print.\"",
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
    id: "nonfiction-thinking-1",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    publishedYear: 2011,
    coverImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg",
    description: "In the international bestseller, Thinking, Fast and Slow, Daniel Kahneman, the renowned psychologist and winner of the Nobel Prize in Economics, takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think.",
    rating: 4.5,
    pace: "Slow",
    tone: ["Academic", "Insightful", "Analytical", "Accessible", "Thought-provoking"],
    themes: ["Psychology", "Decision Making", "Behavioral Economics", "Cognitive Biases", "Rationality"],
    bestFor: ["Business Leaders", "Product Managers", "Decision Makers", "Psychology Enthusiasts"],
    professions: ["Psychologists", "Economists", "Product Managers", "Executives", "Data Scientists"],
    isExternal: false,
    pageCount: 499,
    categories: ["Psychology", "Non-fiction", "Economics", "Science"]
  }
];

export const HomePage = () => {
  const { theme } = useTheme();
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleBooks, setVisibleBooks] = useState(4); // Show 4 books initially
  const [visibleThreads, setVisibleThreads] = useState(4); // Show 4 threads initially

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Use our featured books instead of fetching from API
        const threadsData = await api.getThreads();
        
        // Process threads to match ThreadCard component props
        const processedThreads = threadsData.map(thread => {
          // Process tags to ensure they're properly formatted
          let processedTags = thread.tags;
          
          // If tags is a string that looks like a stringified array, parse it
          if (typeof thread.tags === 'string') {
            try {
              processedTags = JSON.parse(thread.tags as any);
            } catch {
              // If parsing fails, split by comma
              processedTags = (thread.tags as any).split(',').map((t: string) => t.trim());
            }
          }
          
          // Normalize each tag to extract clean string values
          if (Array.isArray(processedTags)) {
            processedTags = processedTags.map(normalizeTag);
          } else if (processedTags) {
            // If somehow not an array, make it a single-item array
            processedTags = [normalizeTag(processedTags)];
          } else {
            // Default to empty array if tags is null/undefined
            processedTags = [];
          }
          
          return {
            ...thread,
            tags: processedTags,
            timestamp: new Date(thread.createdAt).toLocaleDateString()
          };
        });
        
        // Set our featured books directly - using only the top 4 featured books
        // We'll take the first book from each category
        const topFeaturedBooks = [
          featuredBooks.find(book => book.id === "sf-dune-1"), // Science Fiction
          featuredBooks.find(book => book.id === "fantasy-lotr-1"), // Fantasy
          featuredBooks.find(book => book.id === "romance-pride-1"), // Romance
          featuredBooks.find(book => book.id === "nonfiction-thinking-1") // Non-fiction
        ].filter(Boolean) as Book[]; // Remove any undefined values and cast to Book[]
        
        setTrendingBooks(topFeaturedBooks);
        setThreads(processedThreads);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = async (query: string, searchType: string = 'all') => {
    // When searching, redirect to the Books page instead of filtering the featured books
    window.location.href = `/books?query=${encodeURIComponent(query)}&type=${searchType}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className={`text-4xl font-bold transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-900'
            : theme === 'dark'
            ? 'text-white'
            : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
        }`}>
          Discover Your Next Great Read
        </h1>
        <p className={`text-xl max-w-2xl mx-auto transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          Get personalized book recommendations based on your mood, interests, and reading style
        </p>
        <div className="max-w-3xl mx-auto">
          <SearchBar 
            onSearch={handleSearch}
            onMoodSelect={(mood) => handleSearch(mood, 'mood')}
          />
        </div>
        
        {/* Search error message */}
        {error && (
          <div className={`mt-4 transition-colors duration-300 ${
            theme === 'light'
              ? 'text-red-500'
              : theme === 'dark'
              ? 'text-red-400'
              : 'text-pink-600'
          }`}>
            {error}
          </div>
        )}
      </section>

      {/* Featured Books */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${
            theme === 'light'
              ? 'text-primary-900'
              : theme === 'dark'
              ? 'text-white'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
          }`}>
            Featured Books
          </h2>
          <Link 
            to="/books" 
            className={`flex items-center space-x-1 transition-all duration-300 hover:scale-105 ${
              theme === 'light'
                ? 'text-primary-600 hover:text-primary-800'
                : theme === 'dark'
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-purple-600 hover:text-purple-800'
            }`}
          >
            <span>View All Books</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {trendingBooks.map((book) => (
            <BookCard key={book.id} {...book} />
          ))}
        </div>
      </section>

      {/* Popular Threads */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${
            theme === 'light'
              ? 'text-primary-900'
              : theme === 'dark'
              ? 'text-white'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
          }`}>
            Popular Threads
          </h2>
          {threads.length > visibleThreads && (
            <Link 
              to="/threads" 
              className={`flex items-center space-x-1 transition-all duration-300 hover:scale-105 ${
                theme === 'light'
                  ? 'text-primary-600 hover:text-primary-800'
                  : theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-purple-600 hover:text-purple-800'
              }`}
            >
              <span>View All</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {threads.slice(0, visibleThreads).map((thread) => (
            <ThreadCard
              key={thread.id}
              id={thread.id}
              title={thread.title}
              description={thread.description}
              upvotes={thread.upvotes}
              comments={thread.comments}
              timestamp={thread.timestamp || new Date(thread.createdAt).toLocaleDateString()}
              tags={thread.tags}
            />
          ))}
        </div>
        {threads.length > visibleThreads && (
          <div className="text-center mt-6">
            <button
              onClick={() => setVisibleThreads(prev => Math.min(prev + 4, threads.length))}
              className="btn btn-secondary"
            >
              Show More Threads
            </button>
          </div>
        )}
      </section>
    </div>
  );
}; 