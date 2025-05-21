import React, { useState } from 'react';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string, type?: string) => void;
  onMoodSelect?: (mood: string) => void;
}

export const SearchBar = ({ onSearch, onMoodSelect }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState('all');

  // Define search types
  const searchTypes = [
    { id: 'all', label: 'All' },
    { id: 'title', label: 'Book Titles' },
    { id: 'author', label: 'Authors' },
    { id: 'mood', label: 'Moods' },
    { id: 'theme', label: 'Themes' },
    { id: 'pace', label: 'Reading Style' }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, searchType);
  };
  
  const handleMoodSelect = (mood: string) => {
    setQuery(mood);
    setSearchType('mood');
    setShowFilters(false);
    onSearch(mood, 'mood');
    onMoodSelect?.(mood);
  };
  
  const handleThemeSelect = (theme: string) => {
    setQuery(theme);
    setSearchType('theme');
    setShowFilters(false);
    onSearch(theme, 'theme');
  };
  
  const handleReadingStyleSelect = (style: string) => {
    setQuery(style);
    setSearchType('pace');
    setShowFilters(false);
    onSearch(style, 'pace');
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex">
          <div className="flex-grow">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for books, authors, or moods..."
              className="input pl-10 pr-10 w-full"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-primary-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="ml-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="input py-2 px-3"
            >
              {searchTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="ml-2 p-2 rounded-lg border border-primary-200 hover:bg-primary-50 text-primary-500 hover:text-primary-700"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-primary-200">
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Moods Section */}
              <div>
                <h3 className="text-sm font-medium text-primary-900 mb-2">Search by mood</h3>
                <div className="flex flex-col gap-2">
                  {moods.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => handleMoodSelect(mood)}
                      className="text-left text-sm text-primary-700 hover:bg-primary-50 p-2 rounded-lg"
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Themes Section */}
              <div>
                <h3 className="text-sm font-medium text-primary-900 mb-2">Search by theme</h3>
                <div className="flex flex-col gap-2">
                  {themes.map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleThemeSelect(theme)}
                      className="text-left text-sm text-primary-700 hover:bg-primary-50 p-2 rounded-lg"
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Reading Style Section */}
              <div>
                <h3 className="text-sm font-medium text-primary-900 mb-2">Search by reading style</h3>
                <div className="flex flex-col gap-2">
                  {readingStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleReadingStyleSelect(style.id)}
                      className="text-left text-sm text-primary-700 hover:bg-primary-50 p-2 rounded-lg"
                    >
                      {style.label}
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