import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { debounce } from 'lodash';
import api from '../../services/api.supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonalization } from '../../hooks/usePersonalization';

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
  onColorSearch?: (color: any) => void;
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

export const SearchBar = ({ onSearch, onMoodSelect, onColorSearch }: SearchBarProps) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { trackSearch } = usePersonalization();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [buttonPressed, setButtonPressed] = useState(false);
  
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
      // Apple-style: Instant search, no filter pills
      onMoodSelect?.(suggestion.title);
    } else {
      setSearchQuery(suggestion.title);
      onSearch(suggestion.title);
    }
    setShowSuggestions(false);
  };

  // Remove filter pill functionality - use instant search instead
  const handleFilterClick = async (filter: string, type: string = 'all') => {
    // Track search helper usage for analytics
    try {
      const startTime = Date.now();
      await trackSearch(
        filter,
        `search_helper_${type}`, // e.g., "search_helper_mood", "search_helper_theme"
        0, // Results count will be tracked by search results
        Date.now() - startTime
      );
      
      console.log(`[SEARCH_ANALYTICS] Helper used: ${type} -> "${filter}"`);
    } catch (error) {
      console.warn('[SEARCH_ANALYTICS] Failed to track helper usage:', error);
    }
    
    // Apple-style: Immediate search response
    onSearch(filter, type);
    setShowFiltersSidebar(false); // Close sidebar after selection
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    // Clear search results by showing all
    onSearch('');
  };

  // Remove the automatic search delay effect - we want instant responses

  const toggleFilterCategory = (categoryId: string) => {
    setFilterCategories(categories =>
      categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, isExpanded: !cat.isExpanded }
          : cat
      )
    );
  };

  const toggleFiltersSidebar = async () => {
    // Track inspiration panel usage
    try {
      await trackSearch(
        showFiltersSidebar ? 'close_inspiration_panel' : 'open_inspiration_panel',
        'inspiration_panel_toggle',
        0,
        0
      );
      
      console.log(`[SEARCH_ANALYTICS] Inspiration panel ${showFiltersSidebar ? 'closed' : 'opened'}`);
    } catch (error) {
      console.warn('[SEARCH_ANALYTICS] Failed to track panel toggle:', error);
    }
    
    // Apple-style button press feedback
    setButtonPressed(true);
    
    // Quick scale down, then spring back
    setTimeout(() => {
      setButtonPressed(false);
      setShowFiltersSidebar(!showFiltersSidebar);
    }, 100);
  };

  const handleColorClick = (color: typeof colors[0]) => {
    // Trigger color search mode instead of navigating
    if (onColorSearch) {
      onColorSearch(color);
    }
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

            <motion.button
              type="button"
              onClick={toggleFiltersSidebar}
              data-filters-toggle
              className={`group mr-3 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                showFiltersSidebar
                  ? theme === 'light'
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-white shadow-lg'
                    : 'bg-purple-100 text-purple-700 shadow-sm'
                  : theme === 'light'
                  ? 'text-primary-500 hover:bg-primary-50'
                  : theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-700'
                  : 'text-purple-500 hover:bg-purple-50'
              }`}
              animate={{
                scale: buttonPressed ? 0.95 : 1,
                y: buttonPressed ? 1 : 0
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
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
                Inspiration
              </span>
            </motion.button>
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

      {/* Apple-style: No filter pills - search results show immediately */}

      {/* Filters Sidebar - Apple-style Animation */}
      <AnimatePresence>
        {showFiltersSidebar && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/10 z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={toggleFiltersSidebar}
            />
            
            {/* Panel */}
            <motion.div
              ref={sidebarRef}
              className={`absolute right-0 top-full w-full max-w-4xl rounded-lg shadow-xl border z-30 ${
                theme === 'light'
                  ? 'bg-white border-primary-200'
                  : theme === 'dark'
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200'
              }`}
              initial={{ 
                opacity: 0,
                y: -20,
                scale: 0.95
              }}
              animate={{ 
                opacity: 1,
                y: 8,
                scale: 1
              }}
              exit={{ 
                opacity: 0,
                y: -10,
                scale: 0.98
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                duration: 0.4
              }}
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
                Search Inspiration
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
              {/* Search by mood - Wave 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: 0.1
                }}
              >
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
                        onClick={() => handleFilterClick(mood, 'mood')}
                        className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                          theme === 'light'
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
              </motion.div>
              
              {/* Search by theme - Wave 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: 0.15
                }}
              >
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
                      onClick={() => handleFilterClick(themeItem, 'theme')}
                      className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                        theme === 'light'
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
              </motion.div>

              {/* Search by reading style - Wave 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: 0.25
                }}
              >
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
                      onClick={() => handleFilterClick(style, 'reading_style')}
                      className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                        theme === 'light'
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
              </motion.div>

              {/* Search by profession - Wave 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: 0.3
                }}
              >
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
                      onClick={() => handleFilterClick(profession.label, 'profession')}
                      className={`text-left text-sm py-2 pr-2 pl-0 rounded-lg transition-all duration-200 ${
                        theme === 'light'
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
              </motion.div>

              {/* Search by color - Wave 3 (Experimental) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: 0.4
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-left text-sm font-medium transition-colors duration-300 ${
                      theme === 'light'
                        ? 'text-primary-900'
                        : theme === 'dark'
                        ? 'text-white'
                        : 'text-purple-900'
                    }`}>
                      Color
                    </h3>
                    {/* Experimental Feature Indicator - Apple Style */}
                    <div className="flex items-center space-x-1">
                      <div className={`w-4 h-4 ${
                        theme === 'light'
                          ? 'text-orange-500'
                          : theme === 'dark'
                          ? 'text-orange-400'
                          : 'text-orange-500'
                      }`}>
                        {/* Chemistry Flask Icon with gentle bubbling animation */}
                        <svg 
                          viewBox="0 0 16 16" 
                          fill="currentColor" 
                          className="w-4 h-4"
                        >
                          <path d="M6 3V2.5C6 1.67 6.67 1 7.5 1h1C9.33 1 10 1.67 10 2.5V3h1.5c.28 0 .5.22.5.5s-.22.5-.5.5H11v2.5l3.7 6.2c.2.33-.05.8-.45.8H1.75c-.4 0-.65-.47-.45-.8L5 6.5V4h-.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5H6zm1 1v2.5c0 .13-.05.26-.15.35L3.6 13.5h8.8l-3.25-5.65c-.1-.09-.15-.22-.15-.35V4H7z"/>
                                                     {/* Gentle bubbles animation - larger and more visible */}
                           <circle cx="8" cy="9.5" r="1.2" opacity="0" fill="currentColor">
                             <animate attributeName="opacity" values="0;0.4;0" dur="4s" repeatCount="indefinite"/>
                             <animate attributeName="r" values="0.8;1.2;0.8" dur="4s" repeatCount="indefinite"/>
                           </circle>
                           <circle cx="7" cy="11" r="1" opacity="0" fill="currentColor">
                             <animate attributeName="opacity" values="0;0.5;0" dur="3.5s" repeatCount="indefinite" begin="1s"/>
                             <animate attributeName="r" values="0.6;1;0.6" dur="3.5s" repeatCount="indefinite" begin="1s"/>
                           </circle>
                           <circle cx="9" cy="10.2" r="0.8" opacity="0" fill="currentColor">
                             <animate attributeName="opacity" values="0;0.6;0" dur="3s" repeatCount="indefinite" begin="2s"/>
                             <animate attributeName="r" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" begin="2s"/>
                           </circle>
                        </svg>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        theme === 'light'
                          ? 'bg-orange-100 text-orange-700'
                          : theme === 'dark'
                          ? 'bg-orange-900/30 text-orange-400'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        Beta
                      </span>
                    </div>
                  </div>
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
              </motion.div>
            </div>
          </div>
        </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}; 