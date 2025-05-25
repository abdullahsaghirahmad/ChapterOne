import React, { useState, useEffect } from 'react';
import { 
  BookOpenIcon, 
  ClockIcon, 
  HeartIcon, 
  BookmarkIcon, 
  CloudIcon, 
  BoltIcon,
  FireIcon,
  SparklesIcon,
  UserGroupIcon,
  HashtagIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { Pace } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

// Mapping of job titles to profession categories for search
const professionMapping: Record<string, string> = {
  'Product Managers': 'Product Management',
  'Product Manager': 'Product Management',
  'Product managers': 'Product Management',
  'product manager': 'Product Management',
  'product managers': 'Product Management',
  'Software Engineers': 'Software Engineering',
  'Software Engineer': 'Software Engineering',
  'software engineers': 'Software Engineering',
  'software engineer': 'Software Engineering',
  'Data Scientists': 'Data Science',
  'Data Scientist': 'Data Science',
  'data scientists': 'Data Science',
  'data scientist': 'Data Science',
  'UX Designers': 'UX Design',
  'UX Designer': 'UX Design',
  'ux designers': 'UX Design',
  'ux designer': 'UX Design',
  'Marketers': 'Marketing',
  'Marketer': 'Marketing',
  'marketers': 'Marketing',
  'marketer': 'Marketing',
  'Business Analysts': 'Business Analysis',
  'Business Analyst': 'Business Analysis',
  'business analysts': 'Business Analysis',
  'business analyst': 'Business Analysis',
  'Entrepreneurs': 'Entrepreneurship',
  'Entrepreneur': 'Entrepreneurship',
  'entrepreneurs': 'Entrepreneurship',
  'entrepreneur': 'Entrepreneurship',
  'Consultants': 'Consulting',
  'Consultant': 'Consulting',
  'consultants': 'Consulting',
  'consultant': 'Consulting',
  'Project Managers': 'Project Management',
  'Project Manager': 'Project Management',
  'project managers': 'Project Management',
  'project manager': 'Project Management',
  'Executives': 'Executive Leadership',
  'Executive': 'Executive Leadership',
  'executives': 'Executive Leadership',
  'executive': 'Executive Leadership',
  'HR Professionals': 'Human Resources',
  'HR Professional': 'Human Resources',
  'hr professionals': 'Human Resources',
  'hr professional': 'Human Resources',
  'Sales Representatives': 'Sales',
  'Sales Representative': 'Sales',
  'sales representatives': 'Sales',
  'sales representative': 'Sales',
  'Financial Analysts': 'Finance',
  'Financial Analyst': 'Finance',
  'financial analysts': 'Finance',
  'financial analyst': 'Finance',
  'Students': 'Education',
  'Student': 'Education',
  'students': 'Education',
  'student': 'Education',
  'Researchers': 'Research',
  'Researcher': 'Research',
  'researchers': 'Research',
  'researcher': 'Research',
  'Healthcare Professionals': 'Healthcare',
  'Healthcare Professional': 'Healthcare',
  'healthcare professionals': 'Healthcare',
  'healthcare professional': 'Healthcare',
  'Legal Professionals': 'Legal',
  'Legal Professional': 'Legal',
  'legal professionals': 'Legal',
  'legal professional': 'Legal'
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
  tone = [],
  themes = [],
  description = 'No description available',
  bestFor = [],
  isExternal = false,
  quote,
  mostQuoted
}: BookCardProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [bookQuote, setBookQuote] = useState('');
  const [readerFavorite, setReaderFavorite] = useState('');
  const [imgError, setImgError] = useState(false);
  
  // State to track expanded state for specific categories
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [showAllBestFor, setShowAllBestFor] = useState(false);
  const [showAllTone, setShowAllTone] = useState(false);

  // Maximum items to show in a row before adding "+X more"
  const MAX_VISIBLE_THEMES = 2;
  const MAX_VISIBLE_BESTFOR = 2;
  const MAX_VISIBLE_TONE = 3;

  // Process data to handle both string and object formats
  const processedTone = Array.isArray(tone) 
    ? tone.map(t => extractValue(t)) 
    : [];
    
  const processedThemes = Array.isArray(themes) 
    ? themes.map(t => extractValue(t)) 
    : [];

  // Ensure bestFor is always an array of strings
  const processedBestFor = Array.isArray(bestFor) 
    ? bestFor.map(b => extractValue(b)) 
    : [];

  // Handle image loading errors
  const handleImageError = () => {
    console.log(`Image failed to load for book: ${title}`);
    setImgError(true);
  };

  // Determine what image URL to use
  const getImageUrl = () => {
    if (imgError || !coverImage || coverImage.includes('placeholder') || coverImage.includes('no-cover')) {
      // Create a simple solid color with title as text, using data URI
      const color = stringToColor(`${title}${author}`);
      return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='225' viewBox='0 0 150 225'%3E%3Crect width='150' height='225' fill='%23${color}' /%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' text-anchor='middle' fill='white' dominant-baseline='middle'%3E${encodeURIComponent(title.substring(0, 20))}%3C/text%3E%3C/svg%3E`;
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

  useEffect(() => {
    // Simulate fetching book quotes from an external source
    // In a real implementation, this would call an API
    generateUniqueBookQuotes();
  }, [title, author]);

  const generateUniqueBookQuotes = () => {
    // This simulates NLP-processed quotes that would come from external APIs
    // In a real implementation, these would come from Goodreads, Reddit, etc.
    
    // Generate a hash from title and author to ensure different books get different quotes
    const bookHash = (title.length * 3 + author.length * 5) % 10;
    
    const notableQuotes = [
      `"The truth was a mirror in the hands of God. It fell and broke into pieces. Everybody took a piece of it, and they looked at it and thought they had the truth."`,
      `"Sometimes the heart sees what is invisible to the eye."`,
      `"Life is not a problem to be solved, but a reality to be experienced."`,
      `"Tell me and I forget, teach me and I may remember, involve me and I learn."`,
      `"The future belongs to those who believe in the beauty of their dreams."`,
      `"In the end, we will remember not the words of our enemies, but the silence of our friends."`,
      `"The greatest glory in living lies not in never falling, but in rising every time we fall."`,
      `"The journey of a thousand miles begins with one step."`,
      `"It is during our darkest moments that we must focus to see the light."`,
      `"Whoever fights monsters should see to it that in the process he does not become a monster."`
    ];
    
    const readerFavorites = [
      `The author's examination of human nature reveals profound truths about our collective consciousness.`,
      `The vivid imagery and meticulous world-building create an immersive experience unlike any other.`,
      `The way complex ideas are distilled into accessible wisdom is what makes this text timeless.`,
      `Readers consistently highlight the transformative power of the central metaphor.`,
      `The deftly crafted character development offers insights into our own personal growth journeys.`,
      `The elegant prose and rhythmic pacing create a reading experience that stays with you.`,
      `The surprising revelations in chapter three have become a cultural touchpoint for many readers.`,
      `The practical frameworks presented have influenced countless business leaders and thinkers.`,
      `The nuanced exploration of ethical dilemmas invites readers to examine their own moral compass.`,
      `The author's unique perspective challenges conventional thinking in ways that remain relevant today.`
    ];
    
    setBookQuote(notableQuotes[bookHash]);
    setReaderFavorite(readerFavorites[bookHash]);
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

  // Theme-aware CSS classes for pills
  const pillClass = "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors duration-300";
  
  const themePillClass = `${pillClass} ${
    theme === 'light'
      ? 'bg-primary-50 text-primary-600 border border-primary-200'
      : theme === 'dark'
      ? 'bg-gray-700 text-gray-300 border border-gray-600'
      : 'bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border border-purple-200'
  }`;
  
  const bestForPillClass = `${pillClass} ${
    theme === 'light'
      ? 'bg-primary-100 text-primary-700'
      : theme === 'dark'
      ? 'bg-gray-600 text-gray-200'
      : 'bg-gradient-to-r from-pink-200 to-purple-200 text-purple-800'
  }`;
  
  const bestForClickablePillClass = `${bestForPillClass} cursor-pointer transition-all duration-300 hover:scale-105 ${
    theme === 'light'
      ? 'hover:bg-primary-200'
      : theme === 'dark'
      ? 'hover:bg-gray-500'
      : 'hover:from-pink-300 hover:to-purple-300'
  }`;
  
  const morePillClass = `${bestForPillClass} cursor-pointer transition-all duration-300 hover:scale-105 ${
    theme === 'light'
      ? 'hover:bg-primary-200'
      : theme === 'dark'
      ? 'hover:bg-gray-500'
      : 'hover:from-pink-300 hover:to-purple-300'
  }`;

  // Toggle functions for expanding pill sections
  const toggleThemes = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllThemes(!showAllThemes);
  };

  const toggleBestFor = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllBestFor(!showAllBestFor);
  };

  const toggleTone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllTone(!showAllTone);
  };

  // Function to navigate to search page with profession filter
  const handleProfessionSearch = (profession: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Map the job title to a profession category if available
    const mappedProfession = professionMapping[profession] || profession;
    
    console.log(`Searching for profession: ${profession} -> ${mappedProfession}`);
    
    // Navigate to books page with search parameters
    if (mappedProfession) {
      navigate(`/books?query=${encodeURIComponent(mappedProfession)}&type=profession`);
    } else {
      // If no mapping exists, search with the original term
      navigate(`/books?query=${encodeURIComponent(profession)}&type=profession`);
    }
  };

  return (
    <div className={`transition-all duration-300 hover:shadow-lg flex flex-col md:flex-row overflow-hidden rounded-lg ${
      theme === 'light'
        ? 'bg-white border border-gray-200 hover:border-primary-300'
        : theme === 'dark'
        ? 'bg-gray-800 border border-gray-700 hover:border-gray-600'
        : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200 hover:border-purple-300'
    }`}>
      {/* Book Cover */}
      <div className={`w-full md:w-1/3 max-w-[150px] mx-auto md:mx-0 flex-shrink-0 ${
        theme === 'light'
          ? 'bg-gray-100'
          : theme === 'dark'
          ? 'bg-gray-700'
          : 'bg-gradient-to-br from-pink-100 to-purple-100'
      }`}>
        <img 
          src={getImageUrl()} 
          alt={`Cover of ${title}`} 
          className="object-cover w-full h-full rounded shadow-sm"
          onError={handleImageError}
          loading="lazy"
        />
      </div>

      {/* Book Details */}
      <div className="flex-1 flex flex-col p-4 md:pl-6">
        {/* Title and Bookmark/Like buttons */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className={`font-semibold text-lg transition-colors duration-300 ${
              theme === 'light'
                ? 'text-primary-900'
                : theme === 'dark'
                ? 'text-white'
                : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
            }`}>
              {title}
            </h3>
            <p className={`text-sm transition-colors duration-300 ${
              theme === 'light'
                ? 'text-primary-600'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-600'
            }`}>
              {author}
            </p>
          </div>
          <div className="flex space-x-2">
            <button className={`transition-all duration-300 hover:scale-110 ${
              theme === 'light'
                ? 'text-primary-400 hover:text-primary-700'
                : theme === 'dark'
                ? 'text-gray-500 hover:text-gray-300'
                : 'text-purple-400 hover:text-purple-600'
            }`}>
              <BookmarkIcon className="h-5 w-5" />
            </button>
            <button className={`transition-all duration-300 hover:scale-110 ${
              theme === 'light'
                ? 'text-primary-400 hover:text-primary-700'
                : theme === 'dark'
                ? 'text-gray-500 hover:text-gray-300'
                : 'text-purple-400 hover:text-purple-600'
            }`}>
              <HeartIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Reading Pace */}
        <div className={`flex items-center mt-3 transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-700'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-700'
        }`}>
          {getPaceIcon()}
          <span className="ml-1 text-sm">{paceString} paced</span>
        </div>

        {/* Themes - can show all when expanded */}
        {processedThemes.length > 0 && (
          <div className="mt-3 flex items-start">
            <div className="flex-shrink-0 pt-1" title="Book Themes">
              <HashtagIcon className={`h-4 w-4 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-500'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`} />
            </div>
            <div className={`flex flex-wrap gap-1 ml-2 ${!showAllThemes ? 'overflow-hidden h-7' : ''}`}>
              {(showAllThemes ? processedThemes : processedThemes.slice(0, MAX_VISIBLE_THEMES)).map((themeItem) => (
                <span key={themeItem} className={themePillClass}>
                  {themeItem}
                </span>
              ))}
              {!showAllThemes && processedThemes.length > MAX_VISIBLE_THEMES && (
                <span 
                  className={morePillClass}
                  onClick={toggleThemes}
                  role="button"
                  aria-label={`Show all ${processedThemes.length} themes`}
                >
                  +{processedThemes.length - MAX_VISIBLE_THEMES} more
                </span>
              )}
              {showAllThemes && processedThemes.length > MAX_VISIBLE_THEMES && (
                <span 
                  className={morePillClass}
                  onClick={toggleThemes}
                  role="button"
                  aria-label="Show fewer themes"
                >
                  Show less
                </span>
              )}
            </div>
          </div>
        )}

        {/* Target Audience / Best For - can show all when expanded */}
        {processedBestFor.length > 0 && (
          <div className="mt-2 flex items-start">
            <div className="flex-shrink-0 pt-1" title="Target Audience">
              <UserGroupIcon className={`h-4 w-4 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-500'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`} />
            </div>
            <div className={`flex flex-wrap gap-1 ml-2 ${!showAllBestFor ? 'overflow-hidden h-7' : ''}`}>
              {(showAllBestFor ? processedBestFor : processedBestFor.slice(0, MAX_VISIBLE_BESTFOR)).map((item) => (
                <span
                  key={item}
                  className={bestForClickablePillClass}
                  onClick={(e) => handleProfessionSearch(item, e)}
                  role="button"
                  aria-label={`Search for books for ${item}`}
                  title={`Search for books for ${item}`}
                >
                  {item}
                </span>
              ))}
              {!showAllBestFor && processedBestFor.length > MAX_VISIBLE_BESTFOR && (
                <span 
                  className={morePillClass}
                  onClick={toggleBestFor}
                  role="button"
                  aria-label={`Show all ${processedBestFor.length} audience categories`}
                >
                  +{processedBestFor.length - MAX_VISIBLE_BESTFOR} more
                </span>
              )}
              {showAllBestFor && processedBestFor.length > MAX_VISIBLE_BESTFOR && (
                <span 
                  className={morePillClass}
                  onClick={toggleBestFor}
                  role="button"
                  aria-label="Show fewer audience categories"
                >
                  Show less
                </span>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <p className={`mt-3 text-sm line-clamp-2 transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          {description}
        </p>

        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`self-start mt-2 text-sm font-medium flex items-center transition-all duration-300 hover:scale-105 ${
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

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 animate-slide-down">
            {/* Notable Quote */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <ChatBubbleLeftRightIcon className={`h-4 w-4 mr-1 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-primary-500'
                    : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-purple-500'
                }`} />
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-primary-700'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-700'
                }`}>
                  Notable Quote
                </span>
              </div>
              <div className={`pl-3 border-l-2 italic text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'border-primary-300 text-primary-600'
                  : theme === 'dark'
                  ? 'border-gray-600 text-gray-300'
                  : 'border-purple-300 text-purple-600'
              }`}>
                <p>{bookQuote}</p>
              </div>
            </div>

            {/* Reader Favorite */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <SparklesIcon className="h-4 w-4 text-amber-500 mr-1" />
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-primary-700'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-700'
                }`}>
                  Reader Favorite
                </span>
              </div>
              <div className={`pl-3 border-l-2 text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'border-amber-300 text-primary-600'
                  : theme === 'dark'
                  ? 'border-amber-600 text-gray-300'
                  : 'border-amber-400 text-purple-600'
              }`}>
                <p>{readerFavorite}</p>
              </div>
            </div>

            {/* Writing Style */}
            {processedTone.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center mb-1">
                  <ChatBubbleBottomCenterTextIcon className={`h-4 w-4 mr-1 transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-primary-500'
                      : theme === 'dark'
                      ? 'text-gray-400'
                      : 'text-purple-500'
                  }`} />
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-primary-700'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-700'
                  }`}>
                    Style
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(showAllTone ? processedTone : processedTone.slice(0, MAX_VISIBLE_TONE)).map((t) => (
                    <span key={t} className={bestForPillClass}>
                      {t}
                    </span>
                  ))}
                  {!showAllTone && processedTone.length > MAX_VISIBLE_TONE && (
                    <span 
                      className={morePillClass}
                      onClick={toggleTone}
                      role="button"
                      aria-label={`Show all ${processedTone.length} writing styles`}
                    >
                      +{processedTone.length - MAX_VISIBLE_TONE} more
                    </span>
                  )}
                  {showAllTone && processedTone.length > MAX_VISIBLE_TONE && (
                    <span 
                      className={morePillClass}
                      onClick={toggleTone}
                      role="button"
                      aria-label="Show fewer writing styles"
                    >
                      Show less
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Read Button */}
            <div className="mt-4 flex space-x-2">
              <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-105 ${
                theme === 'light'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
              }`}>
                📖 Read
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 