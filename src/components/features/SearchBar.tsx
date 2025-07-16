import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { debounce } from 'lodash';
import api from '../../services/api.supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

// Animated Beaker Component for Color Search
const AnimatedBeaker = ({ className }: { className?: string }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        className="transition-transform duration-300"
      >
        {/* Beaker */}
        <path
          d="M9 2v6.5L6 12v8a2 2 0 002 2h8a2 2 0 002-2v-8l-3-3.5V2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        />
        
        {/* First color drop */}
        <circle
          cx="10"
          cy="16"
          r="1.5"
          fill="#3B82F6"
          className={`transition-all duration-1000 ${
            isAnimating ? 'opacity-100 scale-100' : 'opacity-60 scale-75'
          }`}
        />
        
        {/* Second color drop */}
        <circle
          cx="14"
          cy="14"
          r="1"
          fill="#EF4444"
          className={`transition-all duration-1000 delay-500 ${
            isAnimating ? 'opacity-100 scale-110' : 'opacity-40 scale-50'
          }`}
        />
        
        {/* Mixing effect */}
        <circle
          cx="12"
          cy="18"
          r="2"
          fill="#8B5CF6"
          className={`transition-all duration-1000 delay-1000 ${
            isAnimating ? 'opacity-80 scale-100' : 'opacity-20 scale-75'
          }`}
        />
      </svg>
    </div>
  );
};

interface SearchBarProps {
  onSearch: (query: string, type?: string) => void;
  onMoodSelect?: (mood: string) => void;
}

interface Suggestion {
  id: string;
  title: string;
  type: 'book' | 'author' | 'theme' | 'mood' | 'pace' | 'profession';
}

interface FilterCategory {
  id: string;
  label: string;
  count: number;
  items: string[];
  isExpanded: boolean;
}

export const SearchBar = ({ onSearch, onMoodSelect }: SearchBarProps) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Refs for typing animation - won't cause re-renders
  const animationRef = useRef<{
    currentIndex: number;
    currentCharIndex: number;
    isComplete: boolean;
    timeoutId: NodeJS.Timeout | null;
  }>({
    currentIndex: 0,
    currentCharIndex: 0,
    isComplete: false,
    timeoutId: null
  });

  // Smart rotating placeholders
  const placeholderExamples = [
    "Search books, authors, moods, or themes...",
    "Try: 'feeling adventurous'",
    "Search by color: 'warm orange vibes'",
    "Find themes: 'coming of age stories'",
    "Explore: 'cozy mystery novels'"
  ];

  // Sample data - in real app, this would come from API
  const moods = [
    'Feeling overwhelmed', 'Need inspiration', 'Want to escape', 'Looking for adventure',
    'Feeling nostalgic', 'Want to learn', 'Need motivation', 'Seeking comfort',
    'Curious about life', 'Ready for change', 'Need guidance', 'Feeling creative'
  ];

  const themes = [
    'Love', 'Friendship', 'Family', 'Adventure', 'Mystery', 'Science Fiction',
    'Fantasy', 'Historical', 'Biography', 'Self-Help', 'Business', 'Health'
  ];

  const readingStyles = [
    'Quick Read', 'Deep Dive', 'Light Reading', 'Academic', 'Visual',
    'Interactive', 'Series', 'Standalone'
  ];

  const professions = [
    { id: 'tech', label: 'Technology' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'education', label: 'Education' },
    { id: 'business', label: 'Business' },
    { id: 'creative', label: 'Creative Arts' },
    { id: 'science', label: 'Science' }
  ];

  // Color definitions from ColorSearchPage  
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

  // Safe typing animation with single useEffect
  useEffect(() => {
    const animate = () => {
      const { currentIndex, currentCharIndex, isComplete } = animationRef.current;
      const currentText = placeholderExamples[currentIndex];
      
      if (!isComplete) {
        // Typing phase - 80ms → 50ms → 30ms
        const progress = currentCharIndex / currentText.length;
        const typingSpeed = Math.max(10, 50 - (progress * 60));
        
        if (currentCharIndex < currentText.length) {
          // Type next character
          const newText = currentText.slice(0, currentCharIndex + 1) + '|';
          setCurrentPlaceholder(newText);
          animationRef.current.currentCharIndex += 1;
          
          animationRef.current.timeoutId = setTimeout(animate, typingSpeed);
        } else {
          // Finished typing - show complete text with cursor for a moment
          setCurrentPlaceholder(currentText + '|');
          animationRef.current.isComplete = true;
          animationRef.current.timeoutId = setTimeout(animate, 640); // 20% faster
        }
      } else {
        // Pause phase - show text without cursor
        setCurrentPlaceholder(currentText);
        
        // After pause, move to next text
        animationRef.current.timeoutId = setTimeout(() => {
          animationRef.current.currentIndex = (currentIndex + 1) % placeholderExamples.length;
          animationRef.current.currentCharIndex = 0;
          animationRef.current.isComplete = false;
          animate();
        }, 1200); // 20% faster (1.2 second pause)
      }
    };

    // Start animation
    animate();
    
    // Cleanup function
    return () => {
      if (animationRef.current.timeoutId) {
        clearTimeout(animationRef.current.timeoutId);
        animationRef.current.timeoutId = null;
      }
    };
  }, []); // Empty dependency array - runs once only

  // Initialize filter categories
  useEffect(() => {
    setFilterCategories([
      {
        id: 'moods',
        label: 'Moods',
        count: moods.length,
        items: moods,
        isExpanded: true
      },
      {
        id: 'colors',
        label: 'Search by color',
        count: colors.length,
        items: colors.map(c => c.emotion),
        isExpanded: false
      },
      {
        id: 'themes',
        label: 'Themes & Genres',
        count: themes.length,
        items: themes,
        isExpanded: false
      },
      {
        id: 'reading-style',
        label: 'Reading Style',
        count: readingStyles.length,
        items: readingStyles,
        isExpanded: false
      },
      {
        id: 'professions',
        label: 'For Professionals',
        count: professions.length,
        items: professions.map(p => p.label),
        isExpanded: false
      }
    ]);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length > 0) {
        try {
          const results = await api.books.search(query);
          const searchSuggestions: Suggestion[] = [
            ...results.slice(0, 3).map((book: any) => ({
              id: book.id,
              title: book.title,
              type: 'book' as const
            })),
            ...getQuickSuggestions(query)
          ];
          setSuggestions(searchSuggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
          setSuggestions(getQuickSuggestions(query));
          setShowSuggestions(true);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    []
  );

  const getQuickSuggestions = (input: string): Suggestion[] => {
    const query = input.toLowerCase();
    const suggestions: Suggestion[] = [];

    // Add mood suggestions
    moods.forEach(mood => {
      if (mood.toLowerCase().includes(query)) {
        suggestions.push({
          id: `mood-${mood}`,
          title: mood,
          type: 'mood'
        });
      }
    });

    // Add theme suggestions
    themes.forEach(theme => {
      if (theme.toLowerCase().includes(query)) {
        suggestions.push({
          id: `theme-${theme}`,
          title: theme,
          type: 'theme'
        });
      }
    });

    return suggestions.slice(0, 5);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const performSearch = useCallback(() => {
    // Combine search query with active filters to create a comprehensive search
    let combinedQuery = searchQuery.trim();
    
    if (activeFilters.length > 0) {
      // Add filters to the search query
      const filterQuery = activeFilters.join(' ');
      combinedQuery = combinedQuery ? `${combinedQuery} ${filterQuery}` : filterQuery;
    }
    
    console.log('SearchBar: Performing search with query:', combinedQuery, 'filters:', activeFilters);
    
    if (combinedQuery) {
      onSearch(combinedQuery);
      setShowSuggestions(false);
    }
  }, [searchQuery, activeFilters, onSearch]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'mood') {
      addFilter(suggestion.title);
      onMoodSelect?.(suggestion.title);
    } else {
      setSearchQuery(suggestion.title);
      onSearch(suggestion.title);
    }
    setShowSuggestions(false);
  };

  const addFilter = (filter: string) => {
    if (!activeFilters.includes(filter)) {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  // Automatically search when filters change
  useEffect(() => {
    // Only trigger search if we have filters or a search query
    if (activeFilters.length > 0) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 300); // Debounce to avoid too many searches
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeFilters, performSearch]); // Watch for filter changes

  const toggleFilterCategory = (categoryId: string) => {
    setFilterCategories(categories =>
      categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, isExpanded: !cat.isExpanded }
          : cat
      )
    );
  };

  const toggleFiltersSidebar = () => {
    setShowFiltersSidebar(!showFiltersSidebar);
  };

  const handleColorClick = (color: typeof colors[0]) => {
    // Navigate to color search page with selected color
    navigate(`/color-search?color=${encodeURIComponent(color.emotion)}`);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-filters-toggle]')) {
          setShowFiltersSidebar(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Main Search Bar */}
      <div ref={searchRef} className="relative">
        <form onSubmit={handleSubmit} className="relative">
          <div className={`flex items-center rounded-lg border-2 transition-all duration-300 ${
            theme === 'light'
              ? 'bg-white border-primary-200 focus-within:border-primary-400 shadow-sm'
              : theme === 'dark'
              ? 'bg-gray-800 border-gray-600 focus-within:border-gray-400 shadow-lg'
              : 'bg-gradient-to-r from-pink-50 to-purple-50 border-purple-200 focus-within:border-purple-400 shadow-sm'
          }`}>
            <MagnifyingGlassIcon className={`w-5 h-5 ml-4 ${
              theme === 'light'
                ? 'text-primary-400'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-400'
            }`} />
            
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder={currentPlaceholder}
              className={`flex-1 px-4 py-3 bg-transparent border-none outline-none text-lg transition-all duration-300 ${
                theme === 'light'
                  ? 'text-gray-900 placeholder-gray-500'
                  : theme === 'dark'
                  ? 'text-white placeholder-gray-400'
                  : 'text-purple-900 placeholder-purple-500'
              }`}
              onFocus={() => searchQuery && setShowSuggestions(true)}
            />

            <button
              type="button"
              onClick={toggleFiltersSidebar}
              data-filters-toggle
              className={`group mr-3 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                showFiltersSidebar
                  ? theme === 'light'
                    ? 'bg-primary-100 text-primary-700'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-white'
                    : 'bg-purple-100 text-purple-700'
                  : theme === 'light'
                  ? 'text-primary-500 hover:bg-primary-50'
                  : theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-700'
                  : 'text-purple-500 hover:bg-purple-50'
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              <span className={`text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                showFiltersSidebar
                  ? theme === 'light'
                    ? 'text-primary-700'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-700'
                  : theme === 'light'
                  ? 'text-primary-500 group-hover:text-primary-700'
                  : theme === 'dark'
                  ? 'text-gray-400 group-hover:text-gray-300'
                  : 'text-purple-500 group-hover:text-purple-700'
              }`}>
                Advanced
              </span>
            </button>
          </div>
        </form>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className={`absolute z-20 mt-2 w-full rounded-lg shadow-lg border ${
            theme === 'light'
              ? 'bg-white border-primary-200'
              : theme === 'dark'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200'
          }`}>
            <ul className="py-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors duration-200 ${
                      theme === 'light'
                        ? 'hover:bg-primary-50 text-gray-900'
                        : theme === 'dark'
                        ? 'hover:bg-gray-700 text-white'
                        : 'hover:bg-purple-50 text-purple-900'
                    }`}
                  >
                    <span>{suggestion.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      suggestion.type === 'book'
                        ? 'bg-blue-100 text-blue-700'
                        : suggestion.type === 'mood'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {suggestion.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {activeFilters.map((filter) => (
            <span
              key={filter}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                theme === 'light'
                  ? 'bg-primary-100 text-primary-700'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gradient-to-r from-pink-200 to-purple-200 text-purple-800'
              }`}
            >
              {filter}
              <button
                onClick={() => removeFilter(filter)}
                className={`ml-2 transition-colors duration-200 ${
                  theme === 'light'
                    ? 'text-primary-500 hover:text-primary-700'
                    : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-purple-500 hover:text-purple-700'
                }`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={clearAllFilters}
              className={`text-sm px-3 py-1 rounded-full transition-colors duration-200 ${
                theme === 'light'
                  ? 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                  : theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
              }`}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Filters Sidebar - Original 4-Column Grid Layout */}
      {showFiltersSidebar && (
        <div
          ref={sidebarRef}
          className={`absolute right-0 top-full mt-2 w-full max-w-4xl rounded-lg shadow-xl border z-30 ${
            theme === 'light'
              ? 'bg-white border-primary-200'
              : theme === 'dark'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200'
          }`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                Advanced Filters
              </h3>
              <button
                onClick={toggleFiltersSidebar}
                className={`p-1 rounded-lg transition-colors duration-200 ${
                  theme === 'light'
                    ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                    : 'text-purple-500 hover:text-purple-700 hover:bg-purple-100'
                }`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* Search by mood - First Column */}
              <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                <h3 className={`text-left text-sm font-medium mb-2 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-primary-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  Mood
                </h3>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 mb-4">
                  {moods.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => addFilter(mood)}
                      className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                        activeFilters.includes(mood)
                          ? theme === 'light'
                            ? 'bg-primary-100 text-primary-700'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-white'
                            : 'bg-purple-100 text-purple-700'
                          : theme === 'light'
                          ? 'text-primary-700 hover:bg-primary-50'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Search by theme - Second Column */}
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h3 className={`text-left text-sm font-medium mb-2 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-primary-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  Theme
                </h3>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {themes.map((themeItem) => (
                    <button
                      key={themeItem}
                      onClick={() => addFilter(themeItem)}
                      className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                        activeFilters.includes(themeItem)
                          ? theme === 'light'
                            ? 'bg-primary-100 text-primary-700'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-white'
                            : 'bg-purple-100 text-purple-700'
                          : theme === 'light'
                          ? 'text-primary-700 hover:bg-primary-50'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      {themeItem}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search by reading style - Third Column */}
              <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                <h3 className={`text-left text-sm font-medium mb-2 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-primary-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  Reading Style
                </h3>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {readingStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => addFilter(style)}
                      className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                        activeFilters.includes(style)
                          ? theme === 'light'
                            ? 'bg-primary-100 text-primary-700'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-white'
                            : 'bg-purple-100 text-purple-700'
                          : theme === 'light'
                          ? 'text-primary-700 hover:bg-primary-50'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search by profession - Fourth Column */}
              <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                <h3 className={`text-left text-sm font-medium mb-2 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-primary-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  Profession
                </h3>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {professions.map((profession) => (
                    <button
                      key={profession.id}
                      onClick={() => addFilter(profession.label)}
                      className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                        activeFilters.includes(profession.label)
                          ? theme === 'light'
                            ? 'bg-primary-100 text-primary-700'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-white'
                            : 'bg-purple-100 text-purple-700'
                          : theme === 'light'
                          ? 'text-primary-700 hover:bg-primary-50'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      {profession.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search by color - Fifth Column (rightmost) */}
              <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                <div className={`group cursor-pointer transition-all duration-200 hover:scale-[1.01] relative overflow-hidden ${
                  theme === 'light'
                    ? 'hover:bg-primary-50'
                    : theme === 'dark'
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-purple-50'
                }`}>
                  <h3 className={`text-left text-sm font-medium mb-2 transition-colors duration-300 relative ${
                    theme === 'light'
                      ? 'text-primary-900'
                      : theme === 'dark'
                      ? 'text-white'
                      : 'text-purple-900'
                  }`}>
                    <span className="relative z-10 group-hover:opacity-0 transition-opacity duration-300">Color</span>
                    {/* Rainbow glittering text with sparkles */}
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
                        Color
                      </span>
                      {/* Sparkles */}
                      <span className="absolute -top-1 left-2 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-75"></span>
                      <span className="absolute -top-0.5 left-8 w-0.5 h-0.5 bg-pink-400 rounded-full animate-ping animation-delay-200 opacity-75"></span>
                      <span className="absolute top-0 left-14 w-1 h-1 bg-blue-400 rounded-full animate-ping animation-delay-400 opacity-75"></span>
                      <span className="absolute -bottom-1 left-4 w-0.5 h-0.5 bg-green-400 rounded-full animate-ping animation-delay-600 opacity-75"></span>
                      <span className="absolute -bottom-0.5 left-10 w-1 h-1 bg-purple-400 rounded-full animate-ping animation-delay-800 opacity-75"></span>
                      <span className="absolute top-0.5 right-8 w-0.5 h-0.5 bg-red-400 rounded-full animate-ping animation-delay-1000 opacity-75"></span>
                    </span>
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {colors.map((color) => (
                    <button
                      key={color.emotion}
                      onClick={() => handleColorClick(color)}
                      className="w-8 h-8 rounded-md border border-gray-200/50"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 