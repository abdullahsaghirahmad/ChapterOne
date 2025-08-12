import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  ChatBubbleLeftIcon, 
  BookmarkIcon,
  ShareIcon,
  StarIcon,
  ClockIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import api from '../../services/api.supabase';
import { SavedBooksService } from '../../services/savedBooks.service';
import { MLService } from '../../services/ml.service';
import { EnhancedThreadCreation } from '../ui/EnhancedThreadCreation';
import { PostSaveSurveyModal } from '../ui/PostSaveSurveyModal';
import { Toast } from '../ui/Toast';
import { BookCard } from './BookCard';
import { Book } from '../../types';
import { useFeatureFlags } from '../../services/featureFlag.service';

// UI filter themes (same as BookCard for consistency)
const UI_FILTER_THEMES = [
  'Love', 'Friendship', 'Family', 'Adventure', 'Mystery', 'Science Fiction',
  'Fantasy', 'Historical', 'Biography', 'Self-Help', 'Business', 'Health',
  'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'War', 'Politics',
  'Philosophy', 'Psychology', 'Technology', 'Nature', 'Travel', 'Food',
  'Art', 'Music', 'Sports', 'Religion', 'Education', 'Parenting'
];

// Theme mapping (same as BookCard for consistency)
const THEME_MAPPING: Record<string, string> = {
  'science fiction': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  'scifi': 'Science Fiction',
  'fantasy': 'Fantasy',
  'romance': 'Romance',
  'romantic': 'Romance',
  'love': 'Love',
  'mystery': 'Mystery',
  'detective': 'Mystery',
  'crime': 'Mystery',
  'history': 'Historical',
  'historical': 'Historical',
  'historical fiction': 'Historical',
};

interface BookDetailPageProps {}

export const BookDetailPage: React.FC<BookDetailPageProps> = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();
  
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThreadCreation, setShowThreadCreation] = useState(false);
  // const [showSaveSurvey, setShowSaveSurvey] = useState(false); // DISABLED for better UX
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastActions, setToastActions] = useState<Array<{label: string, onClick: () => void, variant?: 'primary' | 'secondary'}>>([]);
  
  // Similar books functionality
  const [showSimilarBooks, setShowSimilarBooks] = useState(false);
  const [similarBooks, setSimilarBooks] = useState<Book[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarBooksError, setSimilarBooksError] = useState<string | null>(null);
  
  // Social sharing functionality
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const bookData = await api.books.getById(id);
        
        if (!bookData) {
          setError('Book not found');
          return;
        }
        
        setBook(bookData);
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  // Check if book is saved when book loads or user changes
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!user || !book?.id) return;
      
      try {
        const saved = await SavedBooksService.isBookSaved(book.id);
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking if book is saved:', error);
      }
    };

    checkIfSaved();
  }, [user, book?.id]);

  const handleStartDiscussion = () => {
    setShowThreadCreation(true);
  };

  const handleBackToBooks = () => {
    navigate('/books');
  };

  const handleFindSimilarBooks = async () => {
    if (!book?.id) return;
    
    // Toggle the similar books section
    if (showSimilarBooks) {
      setShowSimilarBooks(false);
      return;
    }
    
    // If we already have similar books, just show them
    if (similarBooks.length > 0) {
      setShowSimilarBooks(true);
      return;
    }
    
    // Fetch similar books
    setLoadingSimilar(true);
    setSimilarBooksError(null);
    
    try {
      // Get all available books for comparison
      const allBooks = await api.books.getAll();
      
      // Use ML service to find similar books
      const similarities = await MLService.getSemanticSimilarRecommendations(
        book.id,
        allBooks,
        6 // Limit to 6 similar books
      );
      
      const similarBooksData = similarities
        .map(sim => sim.book)
        .filter((book): book is Book => book !== undefined);
      setSimilarBooks(similarBooksData);
      setShowSimilarBooks(true);
      
    } catch (error) {
      console.error('Error finding similar books:', error);
      setSimilarBooksError('Failed to find similar books. Please try again.');
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Map theme for search (same logic as BookCard)
  const mapThemeForSearch = (themeValue: string): string => {
    const cleanTheme = themeValue.toLowerCase().trim();
    
    // Check if it's already a UI filter theme
    const exactMatch = UI_FILTER_THEMES.find(uiTheme => 
      uiTheme.toLowerCase() === cleanTheme
    );
    if (exactMatch) return exactMatch;
    
    // Check theme mapping
    if (THEME_MAPPING[cleanTheme]) {
      return THEME_MAPPING[cleanTheme];
    }
    
    // Return original theme
    return themeValue;
  };

  // Handle theme click navigation (same as BookCard)
  const handleThemeClick = (clickedTheme: string) => {
    const mappedTheme = mapThemeForSearch(clickedTheme);
    console.log(`Theme clicked: "${clickedTheme}" → mapped to: "${mappedTheme}"`);
    navigate(`/books?query=${encodeURIComponent(mappedTheme)}&type=theme`);
  };

  // Handle tone click navigation (new functionality)
  const handleToneClick = (clickedTone: string) => {
    console.log(`Tone clicked: "${clickedTone}"`);
    navigate(`/books?query=${encodeURIComponent(clickedTone)}&type=tone`);
  };

  // Handle author click navigation (Apple-style contextual action)
  const handleAuthorClick = () => {
    navigate(`/books?query=${encodeURIComponent(book!.author)}&type=author`);
  };

  // Handle save book to library
  const handleSaveBook = async () => {
    // Prevent rapid clicks - exit early if already saving
    if (isSaving) {
      console.log('Save already in progress, ignoring click');
      return;
    }
    
    if (!user) {
      showAuthModal('signup');
      return;
    }

    if (!book) return;

    if (isSaved) {
      // If already saved, unsave it
      await handleUnsaveBook();
      return;
    }

    setIsSaving(true);

    try {
      await SavedBooksService.saveBook({
        bookId: book.id,
        bookData: book,
      });

      // Update UI state
      setIsSaved(true);

      // Show success toast with Go to Library action
      setToastMessage(`"${book.title}" saved to library!`);
      setToastActions([{
        label: 'Go to Library',
        onClick: () => {
          window.location.href = '/profile';
        },
        variant: 'primary'
      }]);
      setShowToast(true);

      // DISABLED: Post-save survey modal for better UX
      // setTimeout(() => {
      //   setShowSaveSurvey(true);
      // }, 1000);
      
    } catch (error: any) {
      console.error('Error saving book:', error);
      if (error.message.includes('already saved')) {
        setIsSaved(true); // Update state if it was already saved
      }
      
      // Show error toast
      setToastMessage(`Failed to save "${book.title}". Please try again.`);
      setToastActions([]); // Clear any actions for error messages
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle unsave book from library
  const handleUnsaveBook = async () => {
    // Prevent rapid clicks - exit early if already saving
    if (isSaving) {
      console.log('Unsave already in progress, ignoring click');
      return;
    }
    
    if (!user || !book) return;

    setIsSaving(true);

    try {
      await SavedBooksService.unsaveBook(book.id);
      setIsSaved(false);
      
      // Show success toast with Undo action
      setToastMessage(`"${book.title}" removed from library`);
      setToastActions([{
        label: 'Undo',
        onClick: async () => {
          try {
            // Re-save the book
            await SavedBooksService.saveBook({
              bookId: book.id,
              bookData: book,
            });
            
            // Update state back to saved
            setIsSaved(true);
            
            // Show confirmation
            setToastMessage(`"${book.title}" restored to library!`);
            setToastActions([]);
            setShowToast(true);
            
          } catch (error) {
            console.error('Error undoing unsave:', error);
            setToastMessage(`Failed to restore "${book.title}". Please try again.`);
            setToastActions([]);
            setShowToast(true);
          }
        },
        variant: 'primary'
      }]);
      setShowToast(true);
    } catch (error: any) {
      console.error('Error unsaving book:', error);
      
      // Show error toast
      setToastMessage(`Failed to remove "${book.title}". Please try again.`);
      setToastActions([]); // Clear any actions for error messages
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle social sharing
  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleShareOption = (platform: string) => {
    if (!book) return;
    
    const url = window.location.href;
    const title = `Check out "${book.title}" by ${book.author}`;
    const hashtags = 'ChapterOne,BookDiscovery,Reading';
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url).then(() => {
          setToastMessage('Link copied to clipboard!');
          setToastActions([]);
          setShowToast(true);
          setShowShareModal(false);
        });
        return;
      default:
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      setShowShareModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${
            theme === 'light'
              ? 'text-gray-600'
              : theme === 'dark'
              ? 'text-gray-300'
              : 'text-purple-600'
          }`}>
            Loading book details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className={`text-2xl font-bold mb-4 ${
            theme === 'light'
              ? 'text-gray-900'
              : theme === 'dark'
              ? 'text-white'
              : 'text-purple-900'
          }`}>
            {error || 'Book not found'}
          </h1>
          <button
            onClick={handleBackToBooks}
            className={`px-6 py-3 rounded-lg transition-colors ${
              theme === 'light'
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
            }`}
          >
            Back to Books
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={handleBackToBooks}
        className={`flex items-center gap-2 transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-600 hover:text-primary-800'
            : theme === 'dark'
            ? 'text-gray-300 hover:text-white'
            : 'text-purple-600 hover:text-purple-800'
        }`}
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Back to Books
      </button>

      {/* Book Hero Section */}
      <div className={`rounded-xl overflow-hidden ${
        theme === 'light'
          ? 'bg-white border border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
      }`}>
        <div className="p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              <img
                src={book.coverImage || '/api/placeholder/300/450'}
                alt={book.title}
                className="w-64 h-96 object-cover rounded-lg shadow-lg mx-auto lg:mx-0"
              />
            </div>

            {/* Book Details */}
            <div className="flex-1 space-y-6">
              {/* Title, Author and Action Icons */}
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                  <h1 className={`text-3xl font-bold mb-2 ${
                    theme === 'light'
                      ? 'text-gray-900'
                      : theme === 'dark'
                      ? 'text-white'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
                  }`}>
                    {book.title}
                  </h1>
                  <button
                    onClick={handleAuthorClick}
                    className={`text-xl transition-all duration-200 hover:scale-105 cursor-pointer text-left ${
                      theme === 'light'
                        ? 'text-primary-600 hover:text-primary-700'
                        : theme === 'dark'
                        ? 'text-blue-400 hover:text-blue-300'
                        : 'text-purple-600 hover:text-purple-700'
                    }`}
                    title={`View more books by ${book.author}`}
                  >
                    by {book.author}
                  </button>
                </div>
                
                {/* Top-right Action Icons */}
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={handleSaveBook}
                    disabled={isSaving}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSaved
                        ? theme === 'light'
                          ? 'text-primary-600 hover:bg-primary-50'
                          : theme === 'dark'
                          ? 'text-blue-400 hover:bg-blue-900/20'
                          : 'text-purple-600 hover:bg-purple-50'
                        : theme === 'light'
                        ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        : theme === 'dark'
                        ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                        : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                    title={isSaved ? 'Remove from library' : 'Save to library'}
                  >
                    {isSaving ? (
                      <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isSaved ? (
                      <BookmarkIconSolid className="w-6 h-6" />
                    ) : (
                      <BookmarkIcon className="w-6 h-6" />
                    )}
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                      theme === 'light'
                        ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        : theme === 'dark'
                        ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                        : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                    title="Share this book"
                  >
                    <ShareIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Rating and Stats */}
              <div className="flex items-center gap-6">
                {book.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(book.rating!)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`font-medium ${
                      theme === 'light'
                        ? 'text-gray-700'
                        : theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-purple-700'
                    }`}>
                      {book.rating}
                    </span>
                  </div>
                )}
                
                {book.publishedYear && (
                  <div className={`flex items-center gap-2 ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : theme === 'dark'
                      ? 'text-gray-400'
                      : 'text-purple-600'
                  }`}>
                    <ClockIcon className="w-5 h-5" />
                    <span>{book.publishedYear}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {book.description && (
                <div>
                  <h3 className={`text-lg font-semibold mb-2 ${
                    theme === 'light'
                      ? 'text-gray-900'
                      : theme === 'dark'
                      ? 'text-white'
                      : 'text-purple-900'
                  }`}>
                    About This Book
                  </h3>
                  <p className={`leading-relaxed ${
                    theme === 'light'
                      ? 'text-gray-700'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-700'
                  }`}>
                    {book.description}
                  </p>
                </div>
              )}

              {/* Unified Book Metadata - Apple Style */}
              <div className="space-y-6">
                {/* Reading Attributes */}
                {(book.pace || (book.tone && Array.isArray(book.tone) && book.tone.length > 0)) && (
                  <div>
                    <h4 className={`font-medium mb-3 ${
                      theme === 'light'
                        ? 'text-gray-900'
                        : theme === 'dark'
                        ? 'text-white'
                        : 'text-purple-900'
                    }`}>
                      Reading Experience
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {book.pace && (
                        <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                          theme === 'light'
                            ? 'bg-gray-100 text-gray-700 border border-gray-200'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 border border-gray-600'
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}>
                          <ClockIcon className="w-4 h-4 mr-2" />
                          {typeof book.pace === 'string' ? book.pace : book.pace?.value || 'Not specified'}
                        </div>
                      )}
                      {book.tone && Array.isArray(book.tone) && book.tone.slice(0, 3).map((t, index) => {
                        const toneValue = typeof t === 'string' ? t : (typeof t === 'object' && t?.value) ? t.value : String(t);
                        return (
                          <button
                            key={index}
                            onClick={() => handleToneClick(toneValue)}
                            className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 cursor-pointer ${
                              theme === 'light'
                                ? 'bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100'
                                : theme === 'dark'
                                ? 'bg-blue-900/50 text-blue-300 border border-blue-700 hover:bg-blue-800/50'
                                : 'bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border border-purple-200 hover:from-pink-200 hover:to-purple-200'
                            }`}
                            title={`Find books with ${toneValue} tone`}
                          >
                            {toneValue}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Themes & Genres */}
                {book.themes && Array.isArray(book.themes) && book.themes.length > 0 && (
                  <div>
                    <h4 className={`font-medium mb-3 ${
                      theme === 'light'
                        ? 'text-gray-900'
                        : theme === 'dark'
                        ? 'text-white'
                        : 'text-purple-900'
                    }`}>
                      Themes & Genres
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {book.themes.map((themeItem, index) => {
                        const themeValue = typeof themeItem === 'string' ? themeItem : (typeof themeItem === 'object' && themeItem?.value) ? themeItem.value : String(themeItem);
                        return (
                          <button
                            key={index}
                            onClick={() => handleThemeClick(themeValue)}
                            className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 cursor-pointer ${
                              theme === 'light'
                                ? 'bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100'
                                : theme === 'dark'
                                ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                                : 'bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border border-purple-200 hover:from-pink-200 hover:to-purple-200'
                            }`}
                            title={`Search for ${mapThemeForSearch(themeValue)} books`}
                          >
                            {themeValue}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Notable Quotes Section */}
              {(book.quote || book.mostQuoted) && (
                <div className="pt-6">
                  <h4 className={`font-medium mb-4 ${
                    theme === 'light'
                      ? 'text-gray-900'
                      : theme === 'dark'
                      ? 'text-white'
                      : 'text-purple-900'
                  }`}>
                    Notable Quotes
                  </h4>
                  <div className="space-y-4">
                    {book.quote && (
                      <blockquote className={`pl-4 border-l-4 italic text-lg leading-relaxed ${
                        theme === 'light'
                          ? 'border-primary-300 text-primary-700 bg-primary-50/50'
                          : theme === 'dark'
                          ? 'border-blue-400 text-blue-300 bg-blue-900/20'
                          : 'border-purple-400 text-purple-700 bg-purple-50/50'
                      } rounded-r-lg py-3 px-4`}>
                        "{book.quote}"
                      </blockquote>
                    )}
                    {book.mostQuoted && book.mostQuoted !== book.quote && (
                      <blockquote className={`pl-4 border-l-4 italic text-lg leading-relaxed ${
                        theme === 'light'
                          ? 'border-gray-300 text-gray-700 bg-gray-50/50'
                          : theme === 'dark'
                          ? 'border-gray-500 text-gray-300 bg-gray-800/50'
                          : 'border-pink-300 text-pink-700 bg-pink-50/50'
                      } rounded-r-lg py-3 px-4`}>
                        "{book.mostQuoted}"
                        <footer className={`text-sm mt-2 not-italic ${
                          theme === 'light'
                            ? 'text-gray-500'
                            : theme === 'dark'
                            ? 'text-gray-400'
                            : 'text-pink-600'
                        }`}>
                          — Most highlighted passage
                        </footer>
                      </blockquote>
                    )}
                  </div>
                  <p className={`text-xs mt-3 ${
                    theme === 'light'
                      ? 'text-gray-500'
                      : theme === 'dark'
                      ? 'text-gray-400'
                      : 'text-purple-500'
                  }`}>
                    Quotes powered by ChapterOne AI
                  </p>
                </div>
              )}

              {/* Primary Action - Find Similar Books */}
              <div className="pt-6">
                <button
                  onClick={handleFindSimilarBooks}
                  disabled={loadingSimilar}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'light'
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl'
                      : theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loadingSimilar ? (
                    <>
                      <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Finding Similar Books...
                    </>
                  ) : showSimilarBooks ? (
                    <>
                      <RectangleStackIcon className="w-6 h-6" />
                      Hide Similar Books
                    </>
                  ) : (
                    <>
                      <RectangleStackIcon className="w-6 h-6" />
                      Find Similar Books
                    </>
                  )}
                </button>
                
                {/* Error State */}
                {similarBooksError && (
                  <p className={`text-sm mt-2 ${
                    theme === 'light' ? 'text-red-600' : theme === 'dark' ? 'text-red-400' : 'text-red-500'
                  }`}>
                    {similarBooksError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Books Section */}
      {showSimilarBooks && (
        <div className={`rounded-xl p-6 ${
          theme === 'light'
            ? 'bg-white border border-gray-200'
            : theme === 'dark'
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
        }`}>
          <div className="mb-6">
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Because you're interested in {book?.title}
            </h2>
            <p className={`text-sm ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-600'
            }`}>
              Powered by ChapterOne AI
            </p>
          </div>
          
          {similarBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarBooks.map((similarBook) => (
                <BookCard
                  key={similarBook.id}
                  {...similarBook}
                  onInteraction={async () => {
                    // Handle any interactions if needed
                  }}
                />
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${
              theme === 'light'
                ? 'text-gray-500'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}>
              <RectangleStackIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No similar books found at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Book Discussions Section - hidden when feature flag is OFF */}
      {isEnabled('threads_feature_enabled') && (
        <div className={`rounded-xl p-6 ${
          theme === 'light'
            ? 'bg-white border border-gray-200'
            : theme === 'dark'
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
        }`}>
          <div className="mb-6">
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Discussions About This Book
            </h2>
            <p className={`text-sm ${
              theme === 'light'
                ? 'text-gray-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-600'
            }`}>
              Connect with other readers and share your thoughts
            </p>
          </div>
          
          <div className={`text-center py-8 ${
            theme === 'light'
              ? 'text-gray-600'
              : theme === 'dark'
              ? 'text-gray-400'
              : 'text-purple-600'
          }`}>
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Start the conversation
            </h3>
            <p className="mb-6 max-w-md mx-auto">
              Share your insights, ask questions, or discuss themes from "{book?.title}". 
              Your discussion will help other readers discover new perspectives.
            </p>
            <button
              onClick={handleStartDiscussion}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 mx-auto ${
                theme === 'light'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg'
                  : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg'
              }`}
            >
              <ChatBubbleLeftIcon className="w-5 h-5" />
              Start First Discussion
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Thread Creation Modal - hidden when feature flag is OFF */}
      {isEnabled('threads_feature_enabled') && (
        <EnhancedThreadCreation
          isOpen={showThreadCreation}
          onClose={() => setShowThreadCreation(false)}
          onSuccess={(threadId) => {
            console.log('Thread created:', threadId);
            navigate(`/threads/${threadId}`);
          }}
          prefilledBook={book}
          mode="modal"
        />
      )}

      {/* Post-Save Survey Modal - DISABLED for better UX */}
      {book && (
        <PostSaveSurveyModal
          isOpen={false}
          onClose={() => {}} // DISABLED
          bookTitle={book.title}
          bookId={book.id}
          onComplete={() => {
            console.log('Survey completed for:', book.title);
            // Could add analytics or user preference updates here
          }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`relative rounded-xl p-6 w-full max-w-md mx-4 ${
            theme === 'light'
              ? 'bg-white'
              : theme === 'dark'
              ? 'bg-gray-800'
              : 'bg-gradient-to-br from-pink-50 to-purple-50'
          }`}>
            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              className={`absolute top-4 right-4 p-1 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'hover:bg-gray-100 text-gray-500'
                  : theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-purple-100 text-purple-600'
              }`}
            >
              ✕
            </button>
            
            {/* Modal Header */}
            <h3 className={`text-xl font-semibold mb-4 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Share "{book?.title}"
            </h3>
            
            {/* Share Options */}
            <div className="space-y-3">
              {/* Twitter */}
              <button
                onClick={() => handleShareOption('twitter')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-900'
                    : theme === 'dark'
                    ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-300'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-900'
                }`}
              >
                <div className="w-6 h-6 bg-blue-500 rounded text-white flex items-center justify-center text-sm font-bold">
                  T
                </div>
                Share on Twitter
              </button>
              
              {/* Facebook */}
              <button
                onClick={() => handleShareOption('facebook')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-900'
                    : theme === 'dark'
                    ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-300'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-900'
                }`}
              >
                <div className="w-6 h-6 bg-blue-600 rounded text-white flex items-center justify-center text-sm font-bold">
                  f
                </div>
                Share on Facebook
              </button>
              
              {/* LinkedIn */}
              <button
                onClick={() => handleShareOption('linkedin')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-900'
                    : theme === 'dark'
                    ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-300'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-900'
                }`}
              >
                <div className="w-6 h-6 bg-blue-700 rounded text-white flex items-center justify-center text-sm font-bold">
                  in
                </div>
                Share on LinkedIn
              </button>
              
              {/* Copy Link */}
              <button
                onClick={() => handleShareOption('copy')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    : theme === 'dark'
                    ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-900'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold ${
                  theme === 'light'
                    ? 'bg-gray-500 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-600 text-white'
                    : 'bg-purple-500 text-white'
                }`}>
                  📋
                </div>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

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