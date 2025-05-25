import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { debounce } from 'lodash';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface SearchBarProps {
  onSearch: (query: string, type?: string) => void;
  onMoodSelect?: (mood: string) => void;
}

interface Suggestion {
  id: string;
  title: string;
  type: 'book' | 'author' | 'theme' | 'mood' | 'pace' | 'profession';
}

type DebouncedFunction = {
  (searchQuery: string, type: string): Promise<void>;
  cancel: () => void;
};

export const SearchBar = ({ onSearch, onMoodSelect }: SearchBarProps) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState('all');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isDismissing, setIsDismissing] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  // Track if the click originated from the filter button to prevent immediate closing
  const filterButtonClickedRef = useRef(false);
  const typeDropdownClickedRef = useRef(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Click outside handlers - One handler for document-wide events
  useEffect(() => {
    // Handler for document clicks
    const handleOutsideInteraction = (event: MouseEvent) => {
      // Skip if click originated from filter button or type dropdown button
      if (filterButtonClickedRef.current || typeDropdownClickedRef.current) {
        return;
      }

      // Check if the click was outside the search container
      // This is the key to detecting outside clicks reliably
      if (!(searchContainerRef.current && searchContainerRef.current.contains(event.target as Node))) {
        // Close any open dropdowns with animation
        if (showSuggestions || showFilters || showTypeDropdown) {
          setIsDismissing(true);
          setTimeout(() => {
            setShowSuggestions(false);
            setShowFilters(false);
            setShowTypeDropdown(false);
            setIsDismissing(false);
          }, 150);
        }
      }
    };

    // Use the capture phase for more reliable detection
    document.addEventListener('click', handleOutsideInteraction, true);
    
    // Cleanup
    return () => {
      document.removeEventListener('click', handleOutsideInteraction, true);
    };
  }, [showSuggestions, showFilters, showTypeDropdown]);
  
  // Close suggestions when search type changes
  useEffect(() => {
    setShowSuggestions(false);
  }, [searchType]);

  // Separate handler for filter button
  const handleFilterButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Set ref to indicate this click came from the filter button
    filterButtonClickedRef.current = true;
    
    // If type dropdown is open, close it
    if (showTypeDropdown) {
      setIsDismissing(true);
      setTimeout(() => {
        setShowTypeDropdown(false);
        setIsDismissing(false);
      }, 150);
    }
    
    // If suggestions are open, close them
    if (showSuggestions) {
      setShowSuggestions(false);
    }

    // Toggle the filter dropdown state
    if (showFilters) {
      setIsDismissing(true);
      setTimeout(() => {
        setShowFilters(false);
        setIsDismissing(false);
        // Reset flag after closing
        filterButtonClickedRef.current = false;
      }, 150);
    } else {
      setShowFilters(true);
      // Reset flag after a short delay to prevent document click from closing immediately
      setTimeout(() => {
        filterButtonClickedRef.current = false;
      }, 0);
    }
  };

  // Separate handler for type dropdown button
  const handleTypeDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Set ref to indicate this click came from the type dropdown button
    typeDropdownClickedRef.current = true;
    
    // Close filters if open
    if (showFilters) {
      setIsDismissing(true);
      setTimeout(() => {
        setShowFilters(false);
        setIsDismissing(false);
      }, 150);
    }
    
    // Close suggestions if open
    if (showSuggestions) {
      setShowSuggestions(false);
    }
    
    // Toggle type dropdown
    if (showTypeDropdown) {
      setIsDismissing(true);
      setTimeout(() => {
        setShowTypeDropdown(false);
        setIsDismissing(false);
        // Reset flag after closing
        typeDropdownClickedRef.current = false;
      }, 150);
    } else {
      setShowTypeDropdown(true);
      // Reset flag after a short delay
      setTimeout(() => {
        typeDropdownClickedRef.current = false;
      }, 0);
    }
  };

  // Modified handleSubmit to also close suggestion dropdown
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setShowFilters(false);
    onSearch(query, searchType);
  };

  // Get quick suggestions based on search type and input
  const getQuickSuggestions = (input: string): Suggestion[] => {
    const searchText = input.toLowerCase();
    
    switch (searchType) {
      case 'mood':
        return moods
          .filter(mood => mood.toLowerCase().includes(searchText))
          .map(mood => ({
            id: `mood-${mood}`,
            title: mood,
            type: 'mood' as const
          }));
      case 'theme':
        return themes
          .filter(theme => theme.toLowerCase().includes(searchText))
          .map(theme => ({
            id: `theme-${theme}`,
            title: theme,
            type: 'theme' as const
          }));
      case 'pace':
        return readingStyles
          .filter(style => style.label.toLowerCase().includes(searchText))
          .map(style => ({
            id: `pace-${style.id}`,
            title: style.label,
            type: 'pace' as const
          }));
      case 'profession':
        return professions
          .filter(prof => prof.label.toLowerCase().includes(searchText))
          .map(prof => ({
            id: `profession-${prof.id}`,
            title: prof.label,
            type: 'profession' as const
          }));
      default:
        return [];
    }
  };

  // Modify the existing debouncedFetchSuggestions
  const debouncedFetchSuggestions = useCallback(
    debounce(async (searchQuery: string, type: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        // First, get quick suggestions based on search type
        const quickSuggestions = getQuickSuggestions(searchQuery);
        
        // If we have quick suggestions and the search type is mood/theme/pace,
        // use those instead of API call
        if (quickSuggestions.length > 0 && ['mood', 'theme', 'pace'].includes(type)) {
          setSuggestions(quickSuggestions);
          setIsLoading(false);
          return;
        }

        // Otherwise, get suggestions from API
        const results = await api.searchBooks(searchQuery, type, false);
        
        // Process results into suggestions
        const newSuggestions: Suggestion[] = results.slice(0, 5).map(book => ({
          id: book.id,
          title: book.title,
          type: 'book' as const
        }));

        // Add author suggestions if searching all or authors
        if (type === 'all' || type === 'author') {
          const authorSuggestions = results
            .slice(0, 3)
            .filter(book => book.author)
            .map(book => ({
              id: `author-${book.id}`,
              title: book.author,
              type: 'author' as const
            }));
          newSuggestions.push(...authorSuggestions);
        }

        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [searchType] // Add searchType as dependency since we're using it in the callback
  ) as DebouncedFunction;

  useEffect(() => {
    debouncedFetchSuggestions(query, searchType);
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [query, searchType, debouncedFetchSuggestions]);

  // Modified handleSuggestionClick to handle event propagation
  const handleSuggestionClick = (suggestion: Suggestion, e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation();
    }
    
    setQuery(suggestion.title);
    setShowSuggestions(false);
    setShowFilters(false);
    
    switch (suggestion.type) {
      case 'mood':
        handleMoodSelect(suggestion.title);
        break;
      case 'theme':
        handleThemeSelect(suggestion.title);
        break;
      case 'pace':
        const style = readingStyles.find(s => s.label === suggestion.title);
        if (style) {
          handleReadingStyleSelect(style.id);
        }
        break;
      case 'profession':
        const prof = professions.find(p => p.label === suggestion.title);
        if (prof) {
          handleProfessionSelect(prof.id, prof.label);
        }
        break;
      case 'author':
        onSearch(suggestion.title, 'author');
        break;
      default:
        onSearch(suggestion.title, 'title');
    }
  };

  // Update clearSearch to be consistent with other handlers
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    
    // Close dropdowns with animation if any are open
    if (showSuggestions || showFilters || showTypeDropdown) {
      setIsDismissing(true);
      setTimeout(() => {
        setShowSuggestions(false);
        setShowFilters(false);
        setShowTypeDropdown(false);
        setIsDismissing(false);
      }, 150);
    }
    
    setActiveFilters([]);
    setSearchType('all');
    onSearch('', 'all');
    
    // Focus the input after clearing
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(filters => filters.filter(f => f !== filter));
    if (query === filter) {
      setQuery('');
      onSearch('', 'all');
    }
  };

  // Define search types
  const searchTypes = [
    { id: 'all', label: 'All' },
    { id: 'title', label: 'Book Titles' },
    { id: 'author', label: 'Authors' },
    { id: 'mood', label: 'Moods' },
    { id: 'theme', label: 'Themes' },
    { id: 'pace', label: 'Reading Style' },
    { id: 'profession', label: 'Profession' },
    { id: 'color', label: '🎨 Search by Color', isSpecial: true }
  ];
  
  // Define moods and reading preferences
  const moods = [
    'Feeling overwhelmed',
    'Need inspiration',
    'Want to escape',
    'Looking for adventure',
    'Feeling nostalgic',
    'Want to learn',
    'Need a laugh',
    'Feeling romantic',
  ];
  
  const themes = [
    'Love',
    'Adventure',
    'Mystery',
    'Fantasy',
    'Science Fiction',
    'History',
    'Philosophy',
    'Science',
    'Coming of Age',
    'Family',
    'Friendship',
    'Identity',
  ];
  
  const readingStyles = [
    { id: 'Fast', label: 'Fast-paced reads' },
    { id: 'Moderate', label: 'Balanced pacing' },
    { id: 'Slow', label: 'Slow, thoughtful reads' }
  ];

  const professions = [
    { id: 'product-management', label: 'Product Management' },
    { id: 'design', label: 'UX/UI Design' },
    { id: 'sales', label: 'Sales' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'engineering', label: 'Software Engineering' },
    { id: 'data-science', label: 'Data Science' },
    { id: 'leadership', label: 'Leadership' },
    { id: 'project-management', label: 'Project Management' },
    { id: 'finance', label: 'Finance' },
    { id: 'human-resources', label: 'Human Resources' },
    { id: 'entrepreneurship', label: 'Entrepreneurship' },
    { id: 'consulting', label: 'Consulting' }
  ];

  const handleMoodSelect = (mood: string) => {
    setQuery(mood);
    setSearchType('mood');
    
    // Apply animation before closing
    setIsDismissing(true);
    setTimeout(() => {
      setShowFilters(false);
      setShowSuggestions(false);
      setIsDismissing(false);
    }, 150);
    
    setActiveFilters(prev => [...prev.filter(f => f !== mood), mood]);
    onSearch(mood, 'mood');
    onMoodSelect?.(mood);
  };
  
  const handleThemeSelect = (theme: string) => {
    setQuery(theme);
    setSearchType('theme');
    
    // Apply animation before closing
    setIsDismissing(true);
    setTimeout(() => {
      setShowFilters(false);
      setShowSuggestions(false);
      setIsDismissing(false);
    }, 150);
    
    setActiveFilters(prev => [...prev.filter(f => f !== theme), theme]);
    onSearch(theme, 'theme');
  };
  
  const handleReadingStyleSelect = (style: string) => {
    setQuery(style);
    setSearchType('pace');
    
    // Apply animation before closing
    setIsDismissing(true);
    setTimeout(() => {
      setShowFilters(false);
      setShowSuggestions(false);
      setIsDismissing(false);
    }, 150);
    
    setActiveFilters(prev => [...prev.filter(f => f !== style), style]);
    onSearch(style, 'pace');
  };

  const handleProfessionSelect = (professionId: string, label: string) => {
    setQuery(label);
    setSearchType('profession');
    
    // Apply animation before closing
    setIsDismissing(true);
    setTimeout(() => {
      setShowFilters(false);
      setShowSuggestions(false);
      setIsDismissing(false);
    }, 150);
    
    setActiveFilters(prev => [...prev.filter(f => f !== label), label]);
    onSearch(professionId, 'profession');
  };

  // Update input focus handler to use animation and be consistent with other handlers
  const handleInputFocus = () => {
    // If filters are shown, hide them with animation
    if (showFilters) {
      setIsDismissing(true);
      setTimeout(() => {
        setShowFilters(false);
        setIsDismissing(false);
      }, 150);
    }
    
    // If type dropdown is shown, hide it with animation
    if (showTypeDropdown) {
      setIsDismissing(true);
      setTimeout(() => {
        setShowTypeDropdown(false);
        setIsDismissing(false);
      }, 150);
    }
    
    // Only show suggestions if we have a query
    if (query.trim()) {
      setShowSuggestions(true);
    }
  };

  // Create custom dropdown component to replace the select element
  // Close type dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideTypeDropdown = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideTypeDropdown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTypeDropdown);
    };
  }, []);

  const handleTypeSelect = (typeId: string, e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation();
    }
    
    // Special handling for color search
    if (typeId === 'color') {
      // Redirect to color search page
      window.location.href = '/color-search';
      return;
    }
    
    setSearchType(typeId);
    
    // Apply animation before closing
    setIsDismissing(true);
    setTimeout(() => {
      setShowTypeDropdown(false);
      setIsDismissing(false);
      // Focus search input after selecting type
      inputRef.current?.focus();
    }, 150);
  };

  return (
    <div className="w-full relative space-y-3" ref={searchContainerRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex">
          <div className="flex-grow relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim()) {
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={handleInputFocus}
              placeholder={
                searchType === 'mood' ? "Type to search moods..." :
                searchType === 'theme' ? "Type to search themes..." :
                searchType === 'pace' ? "Type to search reading styles..." :
                searchType === 'profession' ? "Search books by profession..." :
                "Search for books, authors, or moods..."
              }
              className={`w-full pl-10 pr-24 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 ${
                theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-primary-200'
                  : theme === 'dark'
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-200'
                  : 'bg-gradient-to-r from-pink-50 to-purple-50 border-purple-300 text-purple-900 placeholder-purple-500 focus:border-purple-500 focus:ring-purple-200'
              }`}
            />
            <MagnifyingGlassIcon className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
              theme === 'light'
                ? 'text-primary-500'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isLoading && (
                <div className={`animate-spin rounded-full h-5 w-5 border-b-2 transition-opacity duration-200 animate-fade-in ${
                  theme === 'light'
                    ? 'border-primary-600'
                    : theme === 'dark'
                    ? 'border-blue-400'
                    : 'border-purple-600'
                }`}></div>
              )}
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className={`p-1 rounded-full transition-all duration-300 hover:scale-110 animate-fade-in ${
                    theme === 'light'
                      ? 'hover:bg-primary-50 text-primary-400 hover:text-primary-600'
                      : theme === 'dark'
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                      : 'hover:bg-purple-100 text-purple-400 hover:text-purple-600'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Custom dropdown to replace select */}
          <div className="ml-2 relative" ref={typeDropdownRef}>
            <button
              type="button"
              onClick={handleTypeDropdownClick}
              className={`px-3 py-2 rounded-lg border transition-all duration-300 transform hover:scale-105 flex items-center justify-between min-w-[120px] ${
                theme === 'light'
                  ? `border-primary-200 text-primary-500 hover:text-primary-700 ${showTypeDropdown ? 'bg-primary-50 scale-105' : 'hover:bg-primary-50'}`
                  : theme === 'dark'
                  ? `border-gray-600 text-gray-300 hover:text-white ${showTypeDropdown ? 'bg-gray-700 scale-105' : 'hover:bg-gray-700'}`
                  : `border-purple-300 text-purple-500 hover:text-purple-700 ${showTypeDropdown ? 'bg-purple-100 scale-105' : 'hover:bg-purple-100'}`
              }`}
            >
              <span>{searchTypes.find(type => type.id === searchType)?.label || 'All'}</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 ml-2 transition-transform duration-200 ${showTypeDropdown ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTypeDropdown && (
              <div className={`absolute z-30 mt-1 w-full rounded-lg shadow-lg border ${isDismissing ? 'animate-fade-out' : 'animate-slide-down'} ${
                theme === 'light'
                  ? 'bg-white border-primary-200'
                  : theme === 'dark'
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200'
              }`}>
                <ul className="py-1">
                  {searchTypes.map(type => (
                    <li key={type.id}>
                      <button
                        type="button"
                        onClick={(e) => handleTypeSelect(type.id, e)}
                        className={`w-full text-left px-4 py-2 transition-colors duration-200 ${
                          searchType === type.id 
                            ? theme === 'light'
                              ? 'bg-primary-100 text-primary-700'
                              : theme === 'dark'
                              ? 'bg-gray-700 text-white'
                              : 'bg-purple-100 text-purple-700'
                            : theme === 'light'
                            ? 'text-primary-600 hover:bg-primary-50'
                            : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <button
            type="button"
            ref={filterButtonRef}
            onClick={handleFilterButtonClick}
            className={`ml-2 p-2 rounded-lg border transition-all duration-300 transform hover:scale-105 ${
              theme === 'light'
                ? `border-primary-200 text-primary-500 hover:text-primary-700 ${showFilters ? 'bg-primary-50 scale-105' : 'hover:bg-primary-50'}`
                : theme === 'dark'
                ? `border-gray-600 text-gray-300 hover:text-white ${showFilters ? 'bg-gray-700 scale-105' : 'hover:bg-gray-700'}`
                : `border-purple-300 text-purple-500 hover:text-purple-700 ${showFilters ? 'bg-purple-100 scale-105' : 'hover:bg-purple-100'}`
            }`}
            aria-label="Toggle filters"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 animate-slide-up">
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700 animate-scale-in"
              >
                {filter}
                <button
                  onClick={() => removeFilter(filter)}
                  className="ml-2 text-primary-500 hover:text-primary-700 transition-colors duration-200"
                  aria-label={`Remove ${filter} filter`}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            ))}
            {activeFilters.length > 1 && (
              <button
                onClick={clearSearch}
                className="text-sm text-primary-600 hover:text-primary-800 transition-colors duration-200"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className={`absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-primary-200 ${isDismissing ? 'animate-fade-out' : 'animate-slide-down'}`}>
            <ul className="py-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={(e) => handleSuggestionClick(suggestion, e)}
                    className="w-full text-left px-4 py-2 hover:bg-primary-50 flex items-center transition-colors duration-200"
                  >
                    <span className="flex-grow">{suggestion.title}</span>
                    <span className="text-sm text-primary-400 ml-2">
                      {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {/* Advanced Filters */}
      {showFilters && (
        <div className={`absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-primary-200 ${isDismissing ? 'animate-fade-out' : 'animate-slide-down'}`}>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Moods Section - Now with simple text list and color search link */}
              <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: '50ms' }}>
                <h3 className="text-sm font-medium text-primary-900 mb-2">Search by mood</h3>
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                  {moods.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => handleMoodSelect(mood)}
                      className={`text-left text-sm p-2 rounded-lg transition-all duration-200 ${
                        activeFilters.includes(mood)
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-primary-700 hover:bg-primary-50'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
                
                {/* Color Search Link */}
                <div className="mt-4 pt-4 border-t border-primary-200">
                  <Link
                    to="/color-search"
                    className="flex items-center justify-center w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <span className="mr-2">🎨</span>
                    Try Color Search
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>
              
              {/* Themes Section */}
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h3 className="text-sm font-medium text-primary-900 mb-2">Search by theme</h3>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {themes.map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleThemeSelect(theme)}
                      className={`text-left text-sm p-2 rounded-lg transition-all duration-200 ${
                        activeFilters.includes(theme)
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-primary-700 hover:bg-primary-50'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Combined Reading Style and Professions Section */}
              <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                {/* Reading Style Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-primary-900 mb-2">Search by reading style</h3>
                  <div className="flex flex-col gap-2">
                    {readingStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => handleReadingStyleSelect(style.id)}
                        className={`text-left text-sm p-2 rounded-lg transition-all duration-200 ${
                          activeFilters.includes(style.id)
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-primary-700 hover:bg-primary-50'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Professions Section */}
                <div>
                  <h3 className="text-sm font-medium text-primary-900 mb-2">Search by profession</h3>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {professions.map((profession) => (
                      <button
                        key={profession.id}
                        onClick={() => handleProfessionSelect(profession.id, profession.label)}
                        className={`text-left text-sm p-2 rounded-lg transition-all duration-200 ${
                          activeFilters.includes(profession.label)
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-primary-700 hover:bg-primary-50'
                        }`}
                      >
                        {profession.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 