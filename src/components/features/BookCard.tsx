import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  BookmarkIcon, 
  CloudIcon, 
  BoltIcon,
  FireIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { Pace, Book } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
// Note: LLMService removed - content now generated during book creation, not display
import { SavedBooksService } from '../../services/savedBooks.service';
import { useRewardTracking } from '../../services/rewardSignal.service';
import { PostSaveSurveyModal } from '../ui/PostSaveSurveyModal';
import { Toast } from '../ui/Toast';
import { useBookCardTracking } from '../../hooks/usePersonalization';

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
  id: string; // REQUIRED - no more optional IDs!
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
  
  // Content source tracking (from hybrid content system)
  description_source?: string;
  quote_source?: string;
  description_quality_score?: number;
  quote_quality_score?: number;
  ai_enhancement_needed?: boolean;
  
  // Color search props
  isColorSearchMode?: boolean;
  colorMatchPercentage?: number;
  selectedColor?: any;
  selectedColors?: any[]; // For multiple color blending
  
  // Save state and interaction props
  isSaved?: boolean;
  onInteraction?: (type: 'click' | 'save' | 'unsave' | 'dismiss') => void | Promise<void>;
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
  id,
  title,
  author,
  coverImage = 'https://via.placeholder.com/150x225?text=No+Cover',
  pace = 'Moderate',
  isSaved = false,
  themes = [],
  description = 'No description available',
  tone = [],
  bestFor = [],
  isExternal = false,
  
  // Content source tracking
  description_source,
  description_quality_score,
  ai_enhancement_needed,
  
  // Color search props
  isColorSearchMode = false,
  colorMatchPercentage,
  selectedColor,
  selectedColors = [],
  onInteraction
}: BookCardProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  const { recordAction } = useRewardTracking();
  const [isSaving, setIsSaving] = useState(false);
  // Optimistic state for instant UI updates
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  // Computed save state: use optimistic state when available, fallback to prop
  const currentSavedState = optimisticSaved !== null ? optimisticSaved : isSaved;
  // const [showSaveSurvey, setShowSaveSurvey] = useState(false); // DISABLED for better UX

  // Reset optimistic state when parent prop changes (important for state consistency)
  useEffect(() => {
    if (optimisticSaved !== null && optimisticSaved === isSaved) {
      setOptimisticSaved(null); // Parent state caught up, clear optimistic override
    }
  }, [isSaved, optimisticSaved]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastActions, setToastActions] = useState<Array<{label: string, onClick: () => void, variant?: 'primary' | 'secondary'}>>([]);
  const [imgError, setImgError] = useState(false);
  const [sessionId] = useState(() => 
    user?.id ? undefined : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );



  // Create a minimal book object for tracking
  const bookForTracking = {
    id,
    title,
    author
  };

  // Initialize personalization tracking
  const { onViewStart, onViewEnd, onBookClick, isTracking } = useBookCardTracking(
    bookForTracking as any,
    isColorSearchMode ? 'color_search' : 'search_result'
  );

  // Process themes to handle both string and object formats
  const processedThemes = Array.isArray(themes) 
    ? themes.map(t => extractValue(t)).slice(0, 3) // Max 3 themes for clean design
    : [];

  // Track card view when component mounts
  useEffect(() => {
    onViewStart();
    return () => onViewEnd();
  }, [onViewStart, onViewEnd]);

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

  // Since description is now AI-trimmed to perfect length, no processing needed



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
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card navigation
    
    // Prevent rapid clicks - exit early if already saving
    if (isSaving) {
      console.log('Save already in progress, ignoring click');
      return;
    }
    
    if (!user) {
      // Trigger signup for anonymous users
      showAuthModal('signup');
      return;
    }

    if (currentSavedState) {
      // If already saved, unsave it
      await handleUnsave();
      return;
    }

    // 🚀 OPTIMISTIC UPDATE: Set saved state immediately for instant UI feedback
    setOptimisticSaved(true);
    setIsSaving(true);

    // Show success toast immediately (optimistic) with Go to Library action
    setToastMessage(`"${title}" saved to library!`);
    setToastActions([{
      label: 'Go to Library',
      onClick: () => {
        window.location.href = '/profile';
      },
      variant: 'primary'
    }]);
    setShowToast(true);

    try {
      // Validate that we have a proper book ID
      if (!id) {
        throw new Error(`Book save failed: Missing book ID for "${title}" by ${author}`);
      }

      // Create book object from props
      const book: Book = {
        id,
        title,
        author,
        coverImage: coverImage || '',
        description: description || '',
        pace,
        tone: tone || [],
        themes: (themes || []).map(theme => 
          typeof theme === 'string' ? theme : (theme as any)?.value || String(theme)
        ),
        bestFor: bestFor || [],
        isExternal: isExternal || false,
        pageCount: 0, // Default - we don't have this in props
        categories: (themes || []).map(theme => 
          typeof theme === 'string' ? theme : (theme as any)?.value || String(theme)
        ),
      };

      // 🎯 CRITICAL: Database save (must complete for data consistency)
      await SavedBooksService.saveBook({
        bookId: book.id,
        bookData: book,
      });

      // 🤖 BACKGROUND: ML operations (truly non-blocking - fire and forget)
      setTimeout(() => {
        // Execute ML operations in background without affecting UI
        Promise.all([
          recordAction(
            book.id,
            'save',
            undefined, // No value for save action
            user?.id,
            sessionId
          ).catch(error => console.warn('Background reward tracking failed:', error)),
          
          onInteraction?.('save')?.catch?.(error => console.warn('Background bandit learning failed:', error))
        ]).catch(error => console.warn('Background ML operations failed:', error));
      }, 0); // Defer to next tick
      
      // Clear optimistic state - let parent state take over
      setOptimisticSaved(null);
      
      // DISABLED: Post-save survey modal for better UX
      // setTimeout(() => {
      //   setShowSaveSurvey(true);
      // }, 1000);
      
    } catch (error: any) {
      console.error('Error saving book:', error);
      
      // 🔄 ROLLBACK: Revert optimistic state on failure
      setOptimisticSaved(false);
      
      // Show error toast
      setToastMessage(`Failed to save "${title}". Please try again.`);
      setToastActions([]); // Clear any actions for error messages
      setShowToast(true);
      
      if (error.message.includes('already saved')) {
        // Note: UI state now managed by parent via props
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle unsave action
  const handleUnsave = async () => {
    if (!user) return;
    
    // Prevent rapid clicks - exit early if already saving
    if (isSaving) {
      console.log('Unsave already in progress, ignoring click');
      return;
    }

    // 🚀 OPTIMISTIC UPDATE: Set unsaved state immediately for instant UI feedback
    setOptimisticSaved(false);
    setIsSaving(true);

    // Show success toast immediately (optimistic) with Undo action
    setToastMessage(`"${title}" removed from library`);
    setToastActions([{
      label: 'Undo',
      onClick: async () => {
        try {
          // Re-save the book
          const book = {
            id,
            title,
            author,
            coverImage: coverImage || '',
            description: description || '',
            pace,
            tone: tone || [],
            themes: (themes || []).map(theme => 
              typeof theme === 'string' ? theme : (theme as any)?.value || String(theme)
            ),
            bestFor: bestFor || [],
            isExternal: isExternal || false,
            pageCount: 0,
            categories: (themes || []).map(theme => 
              typeof theme === 'string' ? theme : (theme as any)?.value || String(theme)
            ),
          };
          
          await SavedBooksService.saveBook({
            bookId: book.id,
            bookData: book,
          });
          
          // Update optimistic state back to saved
          setOptimisticSaved(true);
          
          // Show confirmation
          setToastMessage(`"${title}" restored to library!`);
          setToastActions([]);
          setShowToast(true);
          
        } catch (error) {
          console.error('Error undoing unsave:', error);
          setToastMessage(`Failed to restore "${title}". Please try again.`);
          setToastActions([]);
          setShowToast(true);
        }
      },
      variant: 'primary'
    }]);
    setShowToast(true);

    try {
      // 🎯 CRITICAL: Database unsave (must complete for data consistency)
      await SavedBooksService.unsaveBook(id);
      
      // 🤖 BACKGROUND: ML operations (truly non-blocking - fire and forget)
      setTimeout(() => {
        // Execute ML operations in background without affecting UI
        Promise.all([
          recordAction(
            id,
            'unsave',
            undefined,
            user?.id,
            sessionId
          ).catch(error => console.warn('Background reward tracking failed:', error)),
          
          onInteraction?.('unsave')?.catch?.(error => console.warn('Background bandit learning failed:', error))
        ]).catch(error => console.warn('Background ML operations failed:', error));
      }, 0); // Defer to next tick
      
      // Clear optimistic state - let parent state take over
      setOptimisticSaved(null);
    } catch (error: any) {
      console.error('Error unsaving book:', error);
      
      // 🔄 ROLLBACK: Revert optimistic state on failure
      setOptimisticSaved(true);
      
      // Show error toast
      setToastMessage(`Failed to remove "${title}". Please try again.`);
      setToastActions([]); // Clear any actions for error messages
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle card click navigation to book detail page
  const handleCardClick = async () => {
    onBookClick(); // Track click for analytics (instant)
    
    // 🚀 IMMEDIATE: Navigate first for instant UX
    navigate(`/books/${id}`);
    
    // 🤖 BACKGROUND: ML operations (non-blocking - fire and forget)
    setTimeout(() => {
      Promise.all([
        recordAction(
          id,
          'click',
          undefined,
          user?.id,
          sessionId
        ).catch(error => console.warn('Background reward tracking failed:', error)),
        
        onInteraction?.('click')?.catch?.(error => console.warn('Background bandit learning failed:', error))
      ]).catch(error => console.warn('Background ML operations failed:', error));
    }, 0); // Defer to next tick
  };

  // Color blending utilities
  const hexToRgbArray = (hex: string): [number, number, number] => {
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

  const blendColors = (colors: any[]): string => {
    if (colors.length === 0) return '#f3f4f6';
    
    let totalWeight = 0;
    let weightedR = 0, weightedG = 0, weightedB = 0;

    colors.forEach((colorData) => {
      const [r, g, b] = hexToRgbArray(colorData.value);
      const weight = colorData.intensity || 1;
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

  // Generate subtle glow styles for color search mode
  const getColorSearchStyles = () => {
    if (!isColorSearchMode || !colorMatchPercentage) {
      return {};
    }
    
    // Use blended color if multiple colors are selected, otherwise use single color
    const colorValue = selectedColors.length > 0 
      ? (selectedColors.length > 1 ? blendColors(selectedColors) : selectedColors[0]?.value)
      : selectedColor?.value || '#f3f4f6';
    
    const baseOpacity = Math.min(colorMatchPercentage / 100 * 0.25, 0.25); // Max 25% opacity (subtle)
    const borderOpacity = Math.min(colorMatchPercentage / 100 * 0.2, 0.2); // Max 20% border opacity
    
    const rgbValues = hexToRgb(colorValue);
    
    return {
      boxShadow: `0 0 20px rgba(${rgbValues}, ${baseOpacity})`,
      borderColor: `rgba(${rgbValues}, ${borderOpacity})`
    };
  };

  // Convert hex color to RGB string for rgba usage
  const hexToRgb = (hex: string): string => {
    const [r, g, b] = hexToRgbArray(hex);
    return `${r}, ${g}, ${b}`;
  };

  // External Book Badge Component - Apple-style bottom-right positioning
  const ExternalBookBadge = () => {
    if (!isExternal) return null;
    
    return (
      <div className={`absolute bottom-2 right-2 z-10 flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-lg transition-all duration-200 ${
        theme === 'light'
          ? 'bg-white/95 text-blue-700 border border-blue-200 backdrop-blur-sm'
          : theme === 'dark'
          ? 'bg-gray-900/95 text-blue-200 border border-blue-600/50 backdrop-blur-sm'
          : 'bg-white/95 text-blue-800 border border-blue-300 backdrop-blur-sm'
      }`}>
        <CloudIcon className="w-3 h-3 mr-1" />
        <span>External</span>
      </div>
    );
  };

  // Content Source Badge for Admin Users
  const ContentSourceBadge = () => {
    // Only show for admin users
    const isAdmin = user?.email === 'abdullahsaghirahmad@gmail.com';
    if (!isAdmin || !description_source) return null;
    
    const getSourceIcon = (source?: string) => {
      if (!source) return null;
      if (source.includes('ai_')) return '🤖';
      if (source === 'google_books') return '📚';
      if (source === 'open_library') return '📖';
      if (source === 'manual') return '✍️';
      return '❓';
    };

    const getSourceLabel = (source?: string) => {
      if (!source) return '';
      return source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getQualityColor = (score?: number) => {
      if (!score) return 'text-gray-500';
      if (score >= 4) return 'text-green-600';
      if (score >= 3) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className={`absolute top-2 left-2 z-10 flex flex-col space-y-1 max-w-[120px] ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        {description_source && (
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-sm transition-all duration-200 ${
            theme === 'light'
              ? 'bg-white/90 border border-gray-200 backdrop-blur-sm'
              : 'bg-gray-900/90 border border-gray-600 backdrop-blur-sm'
          }`}>
            <span className="mr-1">{getSourceIcon(description_source)}</span>
            <span className="truncate">{getSourceLabel(description_source)}</span>
            {description_quality_score && (
              <span className={`ml-1 font-bold ${getQualityColor(description_quality_score)}`}>
                {description_quality_score}
              </span>
            )}
          </div>
        )}
        {ai_enhancement_needed && (
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-sm transition-all duration-200 bg-orange-100 border border-orange-300 text-orange-800 ${
            theme === 'dark' ? 'bg-orange-900/90 border-orange-600 text-orange-200' : ''
          }`}>
            <span className="mr-1">⚠️</span>
            <span className="truncate">Needs AI</span>
          </div>
        )}
      </div>
    );
  };

  // Get card styling with subtle external book distinction
  const getCardStyling = () => {
    const baseClasses = `transition-all duration-300 hover:shadow-lg flex overflow-hidden rounded-lg`;
    
    if (isExternal) {
      // Subtle visual distinction for external books
      return `${baseClasses} ${
        theme === 'light'
          ? 'bg-white border-l-4 border-l-blue-300 border-r border-t border-b border-gray-200 hover:border-blue-400 hover:shadow-blue-100'
          : theme === 'dark'
          ? 'bg-gray-800 border-l-4 border-l-blue-500 border-r border-t border-b border-gray-700 hover:border-blue-400 hover:shadow-blue-900/20'
          : 'bg-gradient-to-br from-blue-50 to-purple-50 border-l-4 border-l-blue-400 border-r border-t border-b border-blue-200 hover:border-blue-300 hover:shadow-blue-200'
      }`;
    } else {
      // Original styling for local books
      return `${baseClasses} ${
        theme === 'light'
          ? 'bg-white border border-gray-200 hover:border-primary-300'
          : theme === 'dark'
          ? 'bg-gray-800 border border-gray-700 hover:border-gray-600'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200 hover:border-purple-300'
      }`;
    }
  };

  return (
    <div 
      className={`${getCardStyling()} cursor-pointer`}
      style={getColorSearchStyles()}
      onClick={handleCardClick}
    >
      {/* Book Cover */}
      <div className={`w-32 flex-shrink-0 relative ${
        theme === 'light'
          ? 'bg-gray-100'
          : theme === 'dark'
          ? 'bg-gray-700'
          : 'bg-gradient-to-br from-pink-100 to-purple-100'
      }`}>
        {/* External Book Badge - positioned on cover */}
        <ExternalBookBadge />
        
        {/* Content Source Badge - positioned on cover (admin only) */}
        <ContentSourceBadge />
        
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
          <h3 className={`font-semibold text-base sm:text-lg leading-tight ${
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
            disabled={isSaving}
            className={`ml-2 p-2 sm:p-1 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
              currentSavedState
                ? theme === 'light'
                  ? 'text-primary-600 hover:text-primary-700'
                  : theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-purple-600 hover:text-purple-700'
                : theme === 'light'
                ? 'text-primary-400 hover:text-primary-700'
                : theme === 'dark'
                ? 'text-gray-500 hover:text-gray-300'
                : 'text-purple-400 hover:text-purple-600'
            }`}
            title={currentSavedState ? 'Remove from library' : 'Save to library'}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : currentSavedState ? (
              <BookmarkIconSolid className="h-5 w-5" />
            ) : (
              <BookmarkIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Author */}
        <p className={`text-xs sm:text-sm mb-2 ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          {author}
        </p>

        {/* Pace and Color Match */}
        <div className={`flex items-center justify-between mb-2 text-xs sm:text-sm ${
          theme === 'light'
            ? 'text-primary-700'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-700'
        }`}>
          <div className="flex items-center">
            {getPaceIcon()}
            <span className="ml-1">{paceString} paced</span>
          </div>
          
          {/* Color Match Percentage - Only show in color search mode */}
          {isColorSearchMode && colorMatchPercentage && (
            <div className="flex items-center">
              <span 
                className="text-sm"
                style={{ 
                  color: selectedColors.length > 0 
                    ? (selectedColors.length > 1 ? blendColors(selectedColors) : selectedColors[0]?.value)
                    : selectedColor?.value || '#666666'
                }}
              >
                {colorMatchPercentage}% match
              </span>
            </div>
          )}

        </div>

        {/* Clickable Themes */}
        {processedThemes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {processedThemes.map((themeItem, index) => (
              <button
                key={`${themeItem}-${index}`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card navigation
                  handleThemeClick(themeItem);
                }}
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

        {/* Description - AI-trimmed to perfect 2-line length */}
        <div className={`text-xs sm:text-sm mb-3 leading-relaxed ${
          theme === 'light'
            ? 'text-primary-600'
            : theme === 'dark'
            ? 'text-gray-300'
            : 'text-purple-600'
        }`}>
          <p>{description}</p>
        </div>

        {/* Find Similar Books Button - Always visible */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation(); // Prevent card navigation
            // Navigate to search results for similar books
            navigate(`/books?query=${encodeURIComponent(`books like ${title}`)}&type=semantic`);
          }}
          className={`self-start text-xs sm:text-sm font-medium flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${
            theme === 'light'
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <RectangleStackIcon className="h-4 w-4" />
          <span>Find Similar Books</span>
        </motion.button>
      </div>
      
      {/* Post-Save Survey Modal - DISABLED for better UX */}
      <PostSaveSurveyModal
        isOpen={false}
        onClose={() => {}} // DISABLED
        bookTitle={title}
        bookId={id}
        onComplete={() => {
          console.log('Survey completed for:', title);
          // Could add analytics or user preference updates here
        }}
      />

      {/* Toast Notification */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type="success"
        actions={toastActions}
      />
    </div>
  );
};