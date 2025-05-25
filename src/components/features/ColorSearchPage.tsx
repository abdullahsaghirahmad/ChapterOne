import React, { useState, useEffect } from 'react';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  rating: number;
  keywords: string[];
  emotions: string[];
}

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

const SAMPLE_BOOKS: Book[] = [
  {
    id: 1,
    title: "The Midnight Library",
    author: "Matt Haig",
    description: "A magical library where you can explore alternate lives and find meaning.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.2,
    keywords: ['philosophy', 'meaning', 'choices', 'life'],
    emotions: ['overwhelmed', 'inspiration', 'serene']
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    description: "A practical guide to building good habits and breaking bad ones.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.7,
    keywords: ['success', 'motivation', 'growth', 'habits', 'self-improvement'],
    emotions: ['inspiration', 'learning']
  },
  {
    id: 3,
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    description: "An epic fantasy tale of magic, music, and adventure.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.5,
    keywords: ['fantasy', 'magic', 'adventure', 'music', 'storytelling'],
    emotions: ['escape', 'adventure', 'mysterious']
  },
  {
    id: 4,
    title: "The Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
    description: "A hilarious sci-fi comedy about space travel and the meaning of life.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.3,
    keywords: ['funny', 'comedy', 'science fiction', 'space', 'absurd'],
    emotions: ['humor', 'escape']
  },
  {
    id: 5,
    title: "Pride and Prejudice",
    author: "Jane Austen",
    description: "A timeless romance of wit, charm, and social commentary.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.4,
    keywords: ['romance', 'classic', 'wit', 'society', 'relationships'],
    emotions: ['romantic', 'sophisticated', 'nostalgic']
  },
  {
    id: 6,
    title: "The Girl with the Dragon Tattoo",
    author: "Stieg Larsson",
    description: "A gripping mystery thriller with complex characters.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.1,
    keywords: ['mystery', 'thriller', 'crime', 'investigation', 'suspense'],
    emotions: ['mysterious', 'adventure']
  },
  {
    id: 7,
    title: "Wild",
    author: "Cheryl Strayed",
    description: "A powerful memoir of healing and self-discovery through hiking.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.0,
    keywords: ['memoir', 'hiking', 'healing', 'nature', 'journey'],
    emotions: ['serene', 'inspiration', 'passionate']
  },
  {
    id: 8,
    title: "Educated",
    author: "Tara Westover",
    description: "A memoir about education, family, and the power of learning.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.6,
    keywords: ['memoir', 'education', 'family', 'transformation', 'knowledge'],
    emotions: ['learning', 'inspiration', 'passionate']
  },
  {
    id: 9,
    title: "The Alchemist",
    author: "Paulo Coelho",
    description: "A philosophical novel about following your dreams.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.2,
    keywords: ['philosophy', 'dreams', 'journey', 'wisdom', 'inspiration'],
    emotions: ['inspiration', 'serene', 'passionate']
  },
  {
    id: 10,
    title: "Gone Girl",
    author: "Gillian Flynn",
    description: "A psychological thriller about a marriage gone terribly wrong.",
    coverImage: "/api/placeholder/300/400",
    rating: 4.0,
    keywords: ['psychological', 'thriller', 'marriage', 'dark', 'twisted'],
    emotions: ['mysterious', 'passionate', 'adventure']
  }
];

interface SelectedColor {
  color: ColorInfo;
  weight: number;
}

export function ColorSearchPage() {
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([]);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [blendedColor, setBlendedColor] = useState<string>('#f3f4f6');

  const handleColorSelect = (color: ColorInfo) => {
    const existingIndex = selectedColors.findIndex(sc => sc.color.name === color.name);
    
    if (existingIndex !== -1) {
      // If color already selected, increase weight or remove if at max
      const existing = selectedColors[existingIndex];
      if (existing.weight >= 3) {
        setSelectedColors(selectedColors.filter(sc => sc.color.name !== color.name));
      } else {
        const updated = [...selectedColors];
        updated[existingIndex] = { ...existing, weight: existing.weight + 1 };
        setSelectedColors(updated);
      }
    } else {
      // Add new color with weight 1
      setSelectedColors([...selectedColors, { color, weight: 1 }]);
    }
  };

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

  const generateRecommendations = async (colors: SelectedColor[]) => {
    if (colors.length === 0) {
      setRecommendations([]);
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Calculate emotional resonance scores
    const scoredBooks = SAMPLE_BOOKS.map(book => {
      let score = 0;
      let emotionalMatch = 0;
      let keywordMatch = 0;

      colors.forEach(({ color, weight }) => {
        // Emotional resonance
        if (book.emotions.includes(color.emotion)) {
          emotionalMatch += weight * 3;
        }

        // Keyword matching
        color.keywords.forEach(keyword => {
          if (book.keywords.some(bookKeyword => 
            bookKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(bookKeyword.toLowerCase())
          )) {
            keywordMatch += weight * 2;
          }
        });
      });

      score = emotionalMatch + keywordMatch + (book.rating * 2);
      return { ...book, score };
    });

    // Sort by score and return top recommendations
    const topBooks = scoredBooks
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    setRecommendations(topBooks);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    const blended = blendColors(selectedColors);
    setBlendedColor(blended);
    generateRecommendations(selectedColors);
  }, [selectedColors]);

  const clearSelection = () => {
    setSelectedColors([]);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Color Psychology Book Search</h1>
              <p className="text-gray-600 mt-1">Find books that match your emotional state through color</p>
            </div>
            <a 
              href="/" 
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
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
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Choose Your Colors
              </h2>
              <p className="text-gray-600 mb-6">
                Select colors that resonate with your current mood. Click multiple times to increase intensity (1-3 dots).
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {COLORS.map((color) => {
                  const selected = selectedColors.find(sc => sc.color.name === color.name);
                  const weight = selected?.weight || 0;
                  
                  return (
                    <button
                      key={color.name}
                      onClick={() => handleColorSelect(color)}
                      className={`relative aspect-square rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200 ${
                        weight > 0 ? 'ring-4 ring-white shadow-lg' : 'shadow-md hover:shadow-lg'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={`${color.name}: ${color.description}`}
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
                    </button>
                  );
                })}
              </div>

              {selectedColors.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Your Color Blend</h3>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div 
                    className="w-full h-16 rounded-lg shadow-inner mb-4 transition-colors duration-500"
                    style={{ backgroundColor: blendedColor }}
                  />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">Emotional Analysis:</p>
                    <p className="text-sm text-gray-600">{getEmotionalSummary()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">How Color Psychology Works</h3>
              <div className="space-y-3 text-sm text-gray-700">
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
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Book Recommendations
                </h2>
                {selectedColors.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: blendedColor }} />
                    <span className="text-sm text-gray-600">Matched to your blend</span>
                  </div>
                )}
              </div>

              {selectedColors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Discover?</h3>
                  <p className="text-gray-600">Select colors that match your mood to get personalized book recommendations.</p>
                </div>
              ) : isAnalyzing ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <div className="w-full h-full rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Colors...</h3>
                  <p className="text-gray-600">Our AI is matching your emotional profile with perfect books.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((book) => (
                    <div key={book.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex space-x-4">
                        <div 
                          className="w-16 h-20 bg-gray-300 rounded flex-shrink-0 flex items-center justify-center text-gray-500 text-xs"
                        >
                          Book Cover
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                          <p className="text-sm text-gray-600 mb-1">by {book.author}</p>
                          <p className="text-sm text-gray-700 line-clamp-2 mb-2">{book.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                              </svg>
                              <span className="text-sm text-gray-600">{book.rating}</span>
                            </div>
                            <div className="text-xs text-purple-600 font-medium">
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