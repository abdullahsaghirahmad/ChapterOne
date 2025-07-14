import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Book } from '../../types';
import api from '../../services/api.supabase';

interface ColorInfo {
  name: string;
  value: string;
  emotion: string;
  description: string;
  keywords: string[];
}

const COLORS: ColorInfo[] = [
  {
    name: 'Overwhelmed',
    value: '#64748b', // slate
    emotion: 'overwhelmed',
    description: 'Feeling stressed, need calm and grounding',
    keywords: ['calm', 'peace', 'meditation', 'mindfulness', 'healing', 'self-help']
  },
  {
    name: 'Inspiration',
    value: '#f59e0b', // amber
    emotion: 'inspiration',
    description: 'Seeking motivation and personal growth',
    keywords: ['success', 'motivation', 'growth', 'habits', 'leadership', 'innovation']
  },
  {
    name: 'Escape',
    value: '#14b8a6', // teal
    emotion: 'escape',
    description: 'Want to get lost in another world',
    keywords: ['adventure', 'fantasy', 'magic', 'travel', 'journey', 'exploration']
  },
  {
    name: 'Adventure',
    value: '#dc2626', // red
    emotion: 'adventure',
    description: 'Craving excitement and thrills',
    keywords: ['action', 'thriller', 'adventure', 'danger', 'excitement', 'quest']
  },
  {
    name: 'Nostalgic',
    value: '#b45309', // amber-700
    emotion: 'nostalgic',
    description: 'Longing for the past, warmth, and comfort',
    keywords: ['family', 'memory', 'history', 'tradition', 'comfort', 'childhood']
  },
  {
    name: 'Learning',
    value: '#059669', // emerald
    emotion: 'learning',
    description: 'Eager to discover and understand',
    keywords: ['science', 'knowledge', 'education', 'discovery', 'facts', 'learning']
  },
  {
    name: 'Humor',
    value: '#eab308', // yellow
    emotion: 'humor',
    description: 'Need laughter and light-heartedness',
    keywords: ['funny', 'comedy', 'humor', 'wit', 'satire', 'entertaining']
  },
  {
    name: 'Romantic',
    value: '#ec4899', // pink
    emotion: 'romantic',
    description: 'Seeking love and emotional connection',
    keywords: ['love', 'romance', 'relationship', 'passion', 'heart', 'emotional']
  },
  {
    name: 'Mysterious',
    value: '#7c3aed', // purple
    emotion: 'mysterious',
    description: 'Drawn to secrets and the unknown',
    keywords: ['mystery', 'secret', 'detective', 'suspense', 'crime', 'puzzle']
  },
  {
    name: 'Serene',
    value: '#2563eb', // blue
    emotion: 'serene',
    description: 'Seeking peace and tranquility',
    keywords: ['nature', 'zen', 'spiritual', 'peaceful', 'calm', 'meditation']
  },
  {
    name: 'Passionate',
    value: '#ea580c', // orange
    emotion: 'passionate',
    description: 'Intense emotions and deep connections',
    keywords: ['intense', 'passion', 'drama', 'powerful', 'emotional', 'deep']
  },
  {
    name: 'Sophisticated',
    value: '#4338ca', // indigo
    emotion: 'sophisticated',
    description: 'Appreciating elegance and refinement',
    keywords: ['classic', 'literary', 'elegant', 'sophisticated', 'culture', 'art']
  }
];

interface SelectedColor {
  color: ColorInfo;
  weight: number;
}

export const ColorSearchPage = () => {
  const { theme } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([]);
  const [colorQuery, setColorQuery] = useState('');
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch books from database when component mounts
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const booksData = await api.books.getAll();
        setAllBooks(booksData);
        setBooks(booksData);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, []);

  // Map emotions to book themes/tones for better matching
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

  // Filter books based on color selection and emotions
  const filterBooksByColors = useCallback((selectedColors: SelectedColor[], allBooks: Book[]): Book[] => {
    if (selectedColors.length === 0) return allBooks;
    
    // Extract emotions from selected colors
    const emotions = selectedColors.map(sc => sc.color.emotion).filter(Boolean);
    const uniqueEmotions = Array.from(new Set(emotions));
    
    // Map emotions to book attributes
    const searchTerms = uniqueEmotions.flatMap(emotion => mapEmotionToBookAttributes(emotion));
    const uniqueSearchTerms = Array.from(new Set(searchTerms));
    
    if (uniqueSearchTerms.length === 0) return allBooks;
    
    return allBooks.filter(book => {
      // Check themes
      const themeMatch = book.themes && book.themes.some(theme => 
        uniqueSearchTerms.some(term => 
          String(theme).toLowerCase().includes(term.toLowerCase())
        )
      );
      
      // Check tone
      const toneMatch = book.tone && book.tone.some(tone => 
        uniqueSearchTerms.some(term => 
          String(tone).toLowerCase().includes(term.toLowerCase())
        )
      );
      
      // Check categories
      const categoryMatch = book.categories && book.categories.some(category => 
        uniqueSearchTerms.some(term => 
          String(category).toLowerCase().includes(term.toLowerCase())
        )
      );
      
      // Check description
      const descriptionMatch = book.description && uniqueSearchTerms.some(term => 
        book.description!.toLowerCase().includes(term.toLowerCase())
      );
      
      return themeMatch || toneMatch || categoryMatch || descriptionMatch;
    });
  }, []);

  // Handle color selection
  const handleColorSelect = (color: ColorInfo) => {
    setSelectedColors(prev => {
      const existing = prev.find(sc => sc.color.name === color.name);
      if (existing) {
        // Remove if already selected
        return prev.filter(sc => sc.color.name !== color.name);
      } else {
        // Add new selection
        return [...prev, { color, weight: 1 }];
      }
    });
  };

  // Update search results when colors change
  useEffect(() => {
    if (selectedColors.length > 0) {
      setIsSearching(true);
      const filtered = filterBooksByColors(selectedColors, allBooks);
      setSearchResults(filtered);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  }, [selectedColors, allBooks, filterBooksByColors]);

  // Handle text search
  const handleTextSearch = (query: string) => {
    setColorQuery(query);
    if (query.trim()) {
      const filtered = allBooks.filter(book => 
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase()) ||
        (book.themes && book.themes.some(theme => 
          String(theme).toLowerCase().includes(query.toLowerCase())
        )) ||
        (book.description && book.description.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading books...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

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

  const blendColors = (colors: SelectedColor[]): string => {
    if (colors.length === 0) return '#f3f4f6';
    
    let totalWeight = 0;
    let weightedR = 0, weightedG = 0, weightedB = 0;

    colors.forEach(({ color, weight }) => {
      const [r, g, b] = hexToRgb(color.value);
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

  const getEmotionalSummary = () => {
    if (selectedColors.length === 0) return "Select colors to discover your emotional reading profile";
    
    const emotions = selectedColors.map(sc => sc.color.emotion);
    const totalWeight = selectedColors.reduce((sum, sc) => sum + sc.weight, 0);
    
    if (selectedColors.length === 1) {
      return `You're feeling ${selectedColors[0].color.emotion} - ${selectedColors[0].color.description}`;
    }
    
    return `Complex emotional blend: ${emotions.slice(0, -1).join(', ')} and ${emotions.slice(-1)[0]} (${totalWeight} total intensity)`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'light'
        ? 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'
        : theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100'
    }`}>
      {/* Header */}
      <div className={`shadow-sm border-b transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-white border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-r from-pink-50 to-purple-50 border-purple-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
              }`}>
                Color Psychology Book Search
              </h1>
              <p className={`mt-1 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                Find books that match your emotional state through color
              </p>
            </div>
            <a 
              href="/" 
              className={`font-medium flex items-center transition-all duration-300 hover:scale-105 ${
                theme === 'light'
                  ? 'text-indigo-600 hover:text-indigo-800'
                  : theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-purple-600 hover:text-purple-800'
              }`}
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Color Picker */}
          <div className="space-y-6">
            <div className={`rounded-2xl shadow-lg p-6 transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-white'
                : theme === 'dark'
                ? 'bg-gray-800'
                : 'bg-gradient-to-br from-pink-50 to-purple-50'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                Choose Your Colors
              </h2>
              <p className={`mb-6 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                Select colors that resonate with your current mood. Click multiple times to increase intensity (1-3 dots).
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {COLORS.map((color) => {
                  const selected = selectedColors.find(sc => sc.color.name === color.name);
                  const weight = selected?.weight || 0;
                  
                  return (
                    <div key={color.name} className="relative">
                      <button
                        onClick={() => handleColorSelect(color)}
                        onMouseEnter={() => setHoveredColor(color.name)}
                        onMouseLeave={() => setHoveredColor(null)}
                        onTouchStart={() => setHoveredColor(color.name)}
                        onTouchEnd={() => setTimeout(() => setHoveredColor(null), 1500)}
                        aria-label={`Select ${color.emotion} mood - ${color.keywords.slice(0, 2).join(', ')}`}
                        className={`relative w-full aspect-square rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 cursor-pointer ${
                          weight > 0 
                            ? theme === 'light'
                              ? 'ring-4 ring-white shadow-lg scale-105'
                              : theme === 'dark'
                              ? 'ring-4 ring-gray-600 shadow-lg scale-105'
                              : 'ring-4 ring-purple-200 shadow-lg scale-105'
                            : 'shadow-md hover:shadow-lg'
                        } ${
                          theme === 'light'
                            ? 'focus:ring-blue-200'
                            : theme === 'dark'
                            ? 'focus:ring-blue-400'
                            : 'focus:ring-purple-200'
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {weight > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex space-x-1">
                              {[...Array(weight)].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-2 h-2 bg-white rounded-full shadow"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Instant hover tooltip */}
                        {hoveredColor === color.name && (
                          <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                            <div className={`text-sm px-3 py-2 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in duration-150 ${
                              theme === 'light'
                                ? 'bg-gray-900 text-white'
                                : theme === 'dark'
                                ? 'bg-gray-700 text-white'
                                : 'bg-purple-900 text-white'
                            }`}>
                              <div className="font-medium">{color.emotion}</div>
                              <div className={`text-xs mt-1 ${
                                theme === 'light'
                                  ? 'text-gray-300'
                                  : theme === 'dark'
                                  ? 'text-gray-300'
                                  : 'text-purple-200'
                              }`}>
                                {color.keywords.slice(0, 2).join(' • ')}
                              </div>
                              {/* Tooltip arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                <div className={`border-4 border-transparent ${
                                  theme === 'light'
                                    ? 'border-t-gray-900'
                                    : theme === 'dark'
                                    ? 'border-t-gray-700'
                                    : 'border-t-purple-900'
                                }`}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedColors.length > 0 && (
                <div className={`mt-8 pt-6 border-t transition-colors duration-300 ${
                  theme === 'light'
                    ? 'border-gray-200'
                    : theme === 'dark'
                    ? 'border-gray-600'
                    : 'border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold transition-colors duration-300 ${
                      theme === 'light'
                        ? 'text-gray-900'
                        : theme === 'dark'
                        ? 'text-white'
                        : 'text-purple-900'
                    }`}>
                      Your Color Blend
                    </h3>
                    <button
                      onClick={() => setSelectedColors([])}
                      className={`text-sm transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-500 hover:text-red-600'
                          : theme === 'dark'
                          ? 'text-gray-400 hover:text-red-400'
                          : 'text-purple-500 hover:text-red-500'
                      }`}
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div 
                    className="w-full h-16 rounded-lg shadow-inner mb-4 transition-colors duration-500"
                    style={{ backgroundColor: blendColors(selectedColors) }}
                  />
                  
                  <div className="space-y-2">
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      theme === 'light'
                        ? 'text-gray-900'
                        : theme === 'dark'
                        ? 'text-white'
                        : 'text-purple-900'
                    }`}>
                      Emotional Analysis:
                    </p>
                    <p className={`text-sm transition-colors duration-300 ${
                      theme === 'light'
                        ? 'text-gray-600'
                        : theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-purple-600'
                    }`}>
                      {getEmotionalSummary()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className={`rounded-2xl p-6 transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50'
                : theme === 'dark'
                ? 'bg-gradient-to-br from-gray-700 to-gray-800'
                : 'bg-gradient-to-br from-pink-100 to-purple-100'
            }`}>
              <h3 className={`font-semibold mb-3 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                How Color Psychology Works
              </h3>
              <div className={`space-y-3 text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                <p>
                  <span className="font-medium">Color Psychology:</span> Colors evoke specific emotions and mental states. Our algorithm matches these emotional signatures with book themes.
                </p>
                <p>
                  <span className="font-medium">Multiple Selection:</span> Combine colors to express complex emotional states. The weight (dots) indicates intensity.
                </p>
                <p>
                  <span className="font-medium">AI Matching:</span> Our system analyzes emotional resonance, thematic keywords, and reader ratings to provide personalized recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Recommendations */}
          <div className="space-y-6">
            <div className={`rounded-2xl shadow-lg p-6 transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-white'
                : theme === 'dark'
                ? 'bg-gray-800'
                : 'bg-gradient-to-br from-pink-50 to-purple-50'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  Book Recommendations
                </h2>
                {selectedColors.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: blendColors(selectedColors) }} />
                    <span className={`text-sm transition-colors duration-300 ${
                      theme === 'light'
                        ? 'text-gray-600'
                        : theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-purple-600'
                    }`}>
                      Matched to your blend
                    </span>
                  </div>
                )}
              </div>

              {selectedColors.length === 0 ? (
                <div className="text-center py-12">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    theme === 'light'
                      ? 'bg-gradient-to-r from-purple-400 to-pink-400'
                      : theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500'
                  }`}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                  </div>
                  <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-900'
                      : theme === 'dark'
                      ? 'text-white'
                      : 'text-purple-900'
                  }`}>
                    Ready to Discover?
                  </h3>
                  <p className={`transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-600'
                  }`}>
                    Select colors that match your mood to get personalized book recommendations.
                  </p>
                </div>
              ) : isSearching ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <div className={`w-full h-full rounded-full border-4 animate-spin ${
                      theme === 'light'
                        ? 'border-purple-200 border-t-purple-600'
                        : theme === 'dark'
                        ? 'border-gray-600 border-t-blue-400'
                        : 'border-purple-200 border-t-purple-600'
                    }`} />
                  </div>
                  <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-900'
                      : theme === 'dark'
                      ? 'text-white'
                      : 'text-purple-900'
                  }`}>
                    Analyzing Your Colors...
                  </h3>
                  <p className={`transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-600'
                  }`}>
                    Our AI is matching your emotional profile with perfect books.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((book) => (
                    <div key={book.id} className={`border rounded-lg p-4 transition-all duration-300 hover:shadow-md ${
                      theme === 'light'
                        ? 'border-gray-200 hover:border-primary-300'
                        : theme === 'dark'
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-purple-200 hover:border-purple-300'
                    }`}>
                      <div className="flex space-x-4">
                        <div className={`w-16 h-20 rounded flex-shrink-0 flex items-center justify-center text-xs transition-colors duration-300 ${
                          theme === 'light'
                            ? 'bg-gray-300 text-gray-500'
                            : theme === 'dark'
                            ? 'bg-gray-600 text-gray-400'
                            : 'bg-purple-200 text-purple-600'
                        }`}>
                          Book Cover
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-900'
                              : theme === 'dark'
                              ? 'text-white'
                              : 'text-purple-900'
                          }`}>
                            {book.title}
                          </h3>
                          <p className={`text-sm mb-1 transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : theme === 'dark'
                              ? 'text-gray-300'
                              : 'text-purple-600'
                          }`}>
                            by {book.author}
                          </p>
                          <p className={`text-sm line-clamp-2 mb-2 transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-700'
                              : theme === 'dark'
                              ? 'text-gray-300'
                              : 'text-purple-700'
                          }`}>
                            {book.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                              </svg>
                              <span className={`text-sm transition-colors duration-300 ${
                                theme === 'light'
                                  ? 'text-gray-600'
                                  : theme === 'dark'
                                  ? 'text-gray-300'
                                  : 'text-purple-600'
                              }`}>
                                {book.rating}
                              </span>
                            </div>
                            <div className={`text-xs font-medium transition-colors duration-300 ${
                              theme === 'light'
                                ? 'text-purple-600'
                                : theme === 'dark'
                                ? 'text-blue-400'
                                : 'text-purple-700'
                            }`}>
                              {((book as any).score || 0).toFixed(1)} match
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 