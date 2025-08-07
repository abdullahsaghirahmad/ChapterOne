import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  ChatBubbleLeftIcon, 
  BookmarkIcon,
  ShareIcon,
  StarIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import api from '../../services/api.supabase';
import { SavedBooksService } from '../../services/savedBooks.service';
import { EnhancedThreadCreation } from '../ui/EnhancedThreadCreation';
import { PostSaveSurveyModal } from '../ui/PostSaveSurveyModal';
import { Toast } from '../ui/Toast';
import { Book } from '../../types';

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
  
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThreadCreation, setShowThreadCreation] = useState(false);
  const [showSaveSurvey, setShowSaveSurvey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

      // Show success toast
      setToastMessage(`"${book.title}" saved to library!`);
      setShowToast(true);

      // Show post-save survey modal (with slight delay for better UX)
      setTimeout(() => {
        setShowSaveSurvey(true);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error saving book:', error);
      if (error.message.includes('already saved')) {
        setIsSaved(true); // Update state if it was already saved
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle unsave book from library
  const handleUnsaveBook = async () => {
    if (!user || !book) return;

    setIsSaving(true);

    try {
      await SavedBooksService.unsaveBook(book.id);
      setIsSaved(false);
      
      // Show success toast
      setToastMessage(`"${book.title}" removed from library`);
      setShowToast(true);
    } catch (error: any) {
      console.error('Error unsaving book:', error);
    } finally {
      setIsSaving(false);
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
              {/* Title and Author */}
              <div>
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

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={handleStartDiscussion}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                    theme === 'light'
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg'
                      : theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg'
                  }`}
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  Start Discussion
                </button>

                <button
                  onClick={handleSaveBook}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSaved
                      ? theme === 'light'
                        ? 'bg-primary-100 hover:bg-primary-200 text-primary-700 border border-primary-300'
                        : theme === 'dark'
                        ? 'bg-blue-900 hover:bg-blue-800 text-blue-300 border border-blue-600'
                        : 'bg-purple-200 hover:bg-purple-300 text-purple-800 border border-purple-400'
                      : theme === 'light'
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                  title={isSaved ? 'Remove from library' : 'Save to library'}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isSaved ? (
                    <BookmarkIconSolid className="w-5 h-5" />
                  ) : (
                    <BookmarkIcon className="w-5 h-5" />
                  )}
                  {isSaved ? 'Saved to Library' : 'Save to Library'}
                </button>

                <button
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                    theme === 'light'
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                >
                  <ShareIcon className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Discussions Section */}
      <div className={`rounded-xl p-6 ${
        theme === 'light'
          ? 'bg-white border border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${
            theme === 'light'
              ? 'text-gray-900'
              : theme === 'dark'
              ? 'text-white'
              : 'text-purple-900'
          }`}>
            Discussions About This Book
          </h2>
          <span className={`text-sm ${
            theme === 'light'
              ? 'text-gray-600'
              : theme === 'dark'
              ? 'text-gray-400'
              : 'text-purple-600'
          }`}>
            Coming soon
          </span>
        </div>
        
        <div className={`text-center py-8 ${
          theme === 'light'
            ? 'text-gray-600'
            : theme === 'dark'
            ? 'text-gray-400'
            : 'text-purple-600'
        }`}>
          <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No discussions yet for this book</p>
          <button
            onClick={handleStartDiscussion}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'light'
                ? 'bg-primary-100 hover:bg-primary-200 text-primary-700'
                : theme === 'dark'
                ? 'bg-blue-900/50 hover:bg-blue-900/70 text-blue-300'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
            }`}
          >
            Be the first to start a discussion
          </button>
        </div>
      </div>

      {/* Enhanced Thread Creation Modal */}
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

      {/* Post-Save Survey Modal */}
      {book && (
        <PostSaveSurveyModal
          isOpen={showSaveSurvey}
          onClose={() => setShowSaveSurvey(false)}
          bookTitle={book.title}
          bookId={book.id}
          onComplete={() => {
            console.log('Survey completed for:', book.title);
            // Could add analytics or user preference updates here
          }}
        />
      )}

      {/* Toast Notification */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type="success"
      />
    </div>
  );
};