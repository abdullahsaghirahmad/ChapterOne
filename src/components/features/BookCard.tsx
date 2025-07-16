import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  HeartIcon, 
  BookmarkIcon, 
  CloudIcon, 
  BoltIcon,
  FireIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { Pace } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { LLMService } from '../../services/llm.service';

// UI filter themes that are available in the system
const UI_FILTER_THEMES = [
  'Love', 'Friendship', 'Family', 'Adventure', 'Mystery', 'Science Fiction',
  'Fantasy', 'Historical', 'Biography', 'Self-Help', 'Business', 'Health',
  'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'War', 'Politics',
  'Philosophy', 'Psychology', 'Technology', 'Nature', 'Travel', 'Food',
  'Art', 'Music', 'Sports', 'Religion', 'Education', 'Parenting'
];

// Mapping for common theme variations to standardized filter themes
const THEME_MAPPING: Record<string, string> = {
  // Science Fiction variations
  'science fiction': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  'scifi': 'Science Fiction',
  
  // Fantasy variations  
  'fantasy': 'Fantasy',
  
  // Romance variations
  'romance': 'Romance',
  'romantic': 'Romance',
  'love': 'Love',
  
  // Mystery variations
  'mystery': 'Mystery',
  'detective': 'Mystery',
  'crime': 'Mystery',
  
  // History variations
  'history': 'Historical',
  'historical': 'Historical',
  'historical fiction': 'Historical',
  
  // Biography variations
  'biography': 'Biography',
  'memoir': 'Biography',
  'autobiography': 'Biography',
  
  // Self-help variations
  'self-help': 'Self-Help',
  'self help': 'Self-Help',
  'personal development': 'Self-Help',
  
  // Business variations
  'business': 'Business',
  'entrepreneurship': 'Business',
  'management': 'Business',
  
  // Other mappings
  'thriller': 'Thriller',
  'horror': 'Horror',
  'comedy': 'Comedy',
  'drama': 'Drama',
  'war': 'War',
  'politics': 'Politics',
  'philosophy': 'Philosophy',
  'psychology': 'Psychology',
  'technology': 'Technology',
  'nature': 'Nature',
  'travel': 'Travel',
  'food': 'Food',
  'art': 'Art',
  'music': 'Music',
  'sports': 'Sports',
  'religion': 'Religion',
  'education': 'Education',
  'parenting': 'Parenting'
};

interface BookCardProps {
  title: string;
  author: string;
  coverImage?: string;
  pace?: Pace | { type: string; value: string };
  tone?: (string | { type: string; value: string })[];
  themes?: (string | { type: string; value: string })[];
  description?: string;
  bestFor?: string[];
  isExternal?: boolean;
  quote?: string;
  mostQuoted?: string;
}

// Helper function to safely get a value from an object or return the value itself
const extractValue = (item: any): string => {
  if (item === null || item === undefined) {
    return '';
  }
  if (typeof item === 'object' && 'value' in item) {
    return item.value;
  }
  return String(item);
};

export const BookCard = ({
  title,
  author,
  coverImage = 'https://via.placeholder.com/150x225?text=No+Cover',
  pace = 'Moderate',
  themes = [],
  description = 'No description available',
  quote,
  mostQuoted
}: BookCardProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [bookDescription, setBookDescription] = useState(description);
  const [truncatedDescription, setTruncatedDescription] = useState('');
  const [bookQuote, setBookQuote] = useState(quote || mostQuoted || '');
  const [llmService] = useState(() => new LLMService());

  // Process themes to handle both string and object formats
  const processedThemes = Array.isArray(themes) 
    ? themes.map(t => extractValue(t)).slice(0, 3) // Max 3 themes for clean design
    : [];

  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (!img.src.startsWith('data:image/svg+xml')) {
      setImgError(true);
    }
  };

  // Determine what image URL to use
  const getImageUrl = () => {
    const shouldUseFallback = imgError || !coverImage || coverImage.includes('placeholder') || coverImage.includes('no-cover');
    
    if (shouldUseFallback) {
      const color = stringToColor(`${title}${author}`);
      const truncatedTitle = title.substring(0, 20);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="225" viewBox="0 0 150 225">
        <rect width="150" height="225" fill="#${color}" />
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="white" dominant-baseline="middle">
          ${truncatedTitle.replace(/[<>&"']/g, (char) => {
            const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
            return entities[char as keyof typeof entities];
          })}
        </text>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    
    return coverImage;
  };

  // Generate a consistent color based on a string
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  };

  // Reset image error state when coverImage changes
  useEffect(() => {
    setImgError(false);
  }, [coverImage]);

  // Generate description and quote when component mounts
  useEffect(() => {
    const initializeContent = async () => {
      try {
        let fullDescription = description;
        
        // Generate description if missing or generic
        if (!description || description === 'No description available' || description.length < 50) {
          fullDescription = await llmService.generateDescription(title, author, description);
          setBookDescription(fullDescription);
        } else {
          setBookDescription(description);
        }

        // Create truncated version for collapsed state
        const truncated = processDescription(fullDescription);
        setTruncatedDescription(truncated);

        // Generate quote if missing
        if (!quote && !mostQuoted) {
          const generatedQuote = await llmService.generateQuote(title, author, fullDescription);
          setBookQuote(generatedQuote);
        }
      } catch (error) {
        console.error('Error generating content:', error);
        // Fallback to existing content
        if (description && description !== 'No description available') {
          setBookDescription(description);
          setTruncatedDescription(processDescription(description));
        }
      }
    };

    initializeContent();
  }, [title, author, description, quote, mostQuoted, llmService]);

  // Process description to ensure it's max 2 lines
  const processDescription = (desc: string): string => {
    if (!desc || desc === 'No description available') {
      return `A compelling story by ${author} exploring meaningful themes.`;
    }

    // Split into sentences and take first 2
    const sentences = desc.split('. ');
    if (sentences.length >= 2) {
      let result = sentences[0] + '. ' + sentences[1];
      if (!result.endsWith('.')) result += '.';
      
      // Ensure it's not too long (max 140 chars for 2 lines)
      if (result.length > 140) {
        result = result.substring(0, 137) + '...';
      }
      return result;
    } else if (desc.length > 140) {
      return desc.substring(0, 137) + '...';
    }
    
    return desc;
  };

  const getPaceIcon = () => {
    const paceValue = typeof pace === 'string' ? pace : pace.value;
    
    switch (paceValue) {
      case 'Slow':
        return <CloudIcon className="h-4 w-4 text-blue-500" />;
      case 'Fast':
        return <BoltIcon className="h-4 w-4 text-amber-500" />;
      case 'Very Fast':
        return <FireIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-indigo-500" />;
    }
  };

  const paceString = typeof pace === 'string' ? pace : pace.value;

  // Map theme to standardized filter theme for navigation
  const mapThemeForSearch = (themeValue: string): string => {
    const lowerTheme = themeValue.toLowerCase();
    
    // First check direct mapping
    if (THEME_MAPPING[lowerTheme]) {
      return THEME_MAPPING[lowerTheme];
    }
    
    // Check if it's already a valid UI filter theme
    const exactMatch = UI_FILTER_THEMES.find(
      filterTheme => filterTheme.toLowerCase() === lowerTheme
    );
    if (exactMatch) {
      return exactMatch;
    }
    
    // Check for partial matches
    const partialMatch = UI_FILTER_THEMES.find(
      filterTheme => 
        filterTheme.toLowerCase().includes(lowerTheme) || 
        lowerTheme.includes(filterTheme.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch;
    }
    
    // Fallback: return original theme
    return themeValue;
  };

  // Handle theme click navigation
  const handleThemeClick = (clickedTheme: string) => {
    const mappedTheme = mapThemeForSearch(clickedTheme);
    console.log(`Theme clicked: "${clickedTheme}" → mapped to: "${mappedTheme}"`);
    navigate(`/books?query=${encodeURIComponent(mappedTheme)}&type=theme`);
  };

  // Handle save action - will trigger signup for anonymous users
  const handleSave = () => {
    // TODO: Implement save logic / signup modal
    console.log('Save clicked for:', title);
  };

  return (
    <div className={`transition-all duration-300 hover:shadow-lg flex overflow-hidden rounded-lg ${
      theme === 'light'
        ? 'bg-white border border-gray-200 hover:border-primary-300'
        : theme === 'dark'
        ? 'bg-gray-800 border border-gray-700 hover:border-gray-600'
        : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200 hover:border-purple-300'
    }`}>
      {/* Book Cover */}
      <div className={`w-32 flex-shrink-0 ${
        theme === 'light'
          ? 'bg-gray-100'
          : theme === 'dark'
          ? 'bg-gray-700'
          : 'bg-gradient-to-br from-pink-100 to-purple-100'
      }`}>
        <img 
          src={getImageUrl()} 
          alt={`Cover of ${title}`} 
          className="object-cover w-full h-full"
          onError={handleImageError}
          loading="lazy"
        />
      </div>

      {/* Book Details */}
      <div className="flex-1 flex flex-col p-4">
        {/* Title and Save Button */}
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-semibold text-lg leading-tight ${
            theme === 'light'
              ? 'text-primary-900'
              : theme === 'dark'
              ? 'text-white'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
          }`}>
            {title}
          </h3>
          <button 
            onClick={handleSave}
            className={`ml-2 p-1 transition-all duration-300 hover:scale-110 ${
              theme === 'light'
                ? 'text-primary-400 hover:text-primary-700'
                : theme === 'dark'
                ? 'text-gray-500 hover:text-gray-300'
                : 'text-purple-400 hover:text-purple-600'
            }`}
          >
            <BookmarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Author */}
        <p className={`text-sm mb-2 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          {author}
        </p>

        {/* Pace */}
        <div className={`flex items-center mb-2 text-sm ${
          theme === 'light'
            ? 'text-primary-700'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-700'
        }`}>
          {getPaceIcon()}
          <span className="ml-1">{paceString} paced</span>
        </div>

        {/* Clickable Themes */}
        {processedThemes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {processedThemes.map((themeItem, index) => (
              <button
                key={`${themeItem}-${index}`}
                onClick={() => handleThemeClick(themeItem)}
                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 cursor-pointer ${
                  theme === 'light'
                    ? 'bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    : 'bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border border-purple-200 hover:from-pink-200 hover:to-purple-200'
                }`}
                title={`Search for ${mapThemeForSearch(themeItem)} books`}
              >
                {themeItem}
              </button>
            ))}
          </div>
        )}

        {/* Description - Truncated in collapsed state, full in expanded state */}
        <p className={`text-sm mb-3 leading-relaxed ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          {isExpanded ? bookDescription : truncatedDescription}
        </p>

        {/* Expanded Content */}
        {isExpanded && bookQuote && (
          <div className="mb-3 animate-fade-in">
            <div className={`pl-3 border-l-2 italic text-sm mb-3 ${
              theme === 'light'
                ? 'border-primary-300 text-primary-600'
                : theme === 'dark'
                ? 'border-gray-600 text-gray-300'
                : 'border-purple-300 text-purple-600'
            }`}>
              <p>"{bookQuote}"</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`self-start text-sm font-medium flex items-center transition-all duration-300 hover:scale-105 ${
            theme === 'light'
              ? 'text-primary-500 hover:text-primary-700'
              : theme === 'dark'
              ? 'text-blue-400 hover:text-blue-300'
              : 'text-purple-500 hover:text-purple-700'
          }`}
        >
          <BookOpenIcon className="h-4 w-4 mr-1" />
          {isExpanded ? 'Show less' : 'Read more'}
        </button>

        {/* Start Reading Button (only in expanded state) */}
        {isExpanded && (
          <div className="mt-3">
            <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-105 ${
              theme === 'light'
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
            }`}>
              📖 Start Reading
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 