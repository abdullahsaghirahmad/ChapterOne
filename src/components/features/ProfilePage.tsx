import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Cog6ToothIcon, 
  BookOpenIcon, 
  ChatBubbleLeftIcon,
  ChartBarIcon,
  ClockIcon,
  HeartIcon,
  ArrowUpIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { auth } from '../../services/api.supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../ui/UserAvatar';
import { UserProfileModal } from '../ui/UserProfileModal';
import { ThreadFollowButton } from '../ui/ThreadFollowButton';
import { BookCard } from './BookCard';
import { ThreadFollowService } from '../../services/threadFollow.service';
import { User, FollowedThread, ReadingPreferences, SavedBook } from '../../types';
import { UserPreferencesService } from '../../services/userPreferences.service';
import { SavedBooksService } from '../../services/savedBooks.service';
import { ReadingContextPreferences } from './ReadingContextPreferences';

interface ProfilePageProps {}

interface ReadingStats {
  totalBooks: number;
  currentlyReading: number;
  booksThisYear: number;
  favoriteGenres: string[];
  booksCompleted: number;
}

type TabType = 'books' | 'threads' | 'activity' | 'insights' | 'preferences';



export const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('books');
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  
  // Following threads state - COMMENTED OUT FOR UX IMPROVEMENT
  // const [followedThreads, setFollowedThreads] = useState<FollowedThread[]>([]);
  // const [followingLoading, setFollowingLoading] = useState(false);
  // const [followingError, setFollowingError] = useState<string | null>(null);
  
  // User preferences state
  const [userPreferences, setUserPreferences] = useState<ReadingPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  
  // Saved books state
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [savedBooksLoading, setSavedBooksLoading] = useState(false);
  const [savedBooksError, setSavedBooksError] = useState<string | null>(null);
  
  // Genre editing state
  const [isEditingGenres, setIsEditingGenres] = useState(false);
  const [editableGenres, setEditableGenres] = useState<string[]>([]);
  
  // Check if viewing own profile
  const isOwnProfile = !username || (user && username === `@${user.user_metadata?.username}`);

  // Helper functions to organize saved books
  const wantToReadBooks = savedBooks
    .filter(book => book.status === 'want_to_read')
    .map(savedBook => savedBook.bookData);
    
  const currentlyReadingBooks = savedBooks
    .filter(book => book.status === 'currently_reading')
    .map(savedBook => savedBook.bookData);
    
  const favoriteBooks = savedBooks
    .filter(book => book.status === 'finished' && (book.rating || 0) >= 4)
    .map(savedBook => savedBook.bookData);

  // Reading stats - calculated from real data
  const [readingStats, setReadingStats] = useState<ReadingStats>({
    totalBooks: 0,
    currentlyReading: 0,
    booksThisYear: 0,
    favoriteGenres: ['Psychology', 'Business', 'Self-Help'], // Fallback until real data loads
    booksCompleted: 0
  });

  // Calculate reading statistics from real data
  const calculateReadingStats = useCallback(() => {
    if (!savedBooks.length) return;

    const currentYear = new Date().getFullYear();
    const currentYearBooks = savedBooks.filter(book => {
      const bookYear = new Date(book.createdAt).getFullYear();
      return bookYear === currentYear;
    });

    const completedBooks = savedBooks.filter(book => book.status === 'finished');
    const currentlyReadingBooks = savedBooks.filter(book => book.status === 'currently_reading');

    // Extract genres from user preferences and saved books
    const bookGenres = savedBooks
      .map(book => {
        const categories = book.bookData.categories || [];
        const themes = (book.bookData.themes || []).map(theme => 
          typeof theme === 'string' ? theme : theme.value || theme.type || ''
        );
        return [...categories, ...themes];
      })
      .flat()
      .filter(genre => genre && typeof genre === 'string');
    
    const preferenceGenres = userPreferences?.favoriteGenres || [];
    const allGenres = [...bookGenres, ...preferenceGenres];
    
    // Count genre frequency and get top 3
    const genreCounts = allGenres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const favoriteGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([genre]) => genre);

    setReadingStats({
      totalBooks: savedBooks.length,
      currentlyReading: currentlyReadingBooks.length,
      booksThisYear: currentYearBooks.length,
      favoriteGenres: favoriteGenres.length > 0 ? favoriteGenres : ['Psychology', 'Business', 'Self-Help'],
      booksCompleted: completedBooks.length
    });
  }, [savedBooks, userPreferences]);

  // Fetch user preferences
  const fetchUserPreferences = useCallback(async () => {
    if (!user || !isOwnProfile) return;
    
    try {
      setPreferencesLoading(true);
      const preferences = await UserPreferencesService.getPreferences();
      setUserPreferences(preferences);
      
      // Update reading stats with real genre data
      if (preferences?.favoriteGenres && preferences.favoriteGenres.length > 0) {
        setReadingStats(prev => ({
          ...prev,
          favoriteGenres: preferences.favoriteGenres || []
        }));
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
  }, [user, isOwnProfile]);

  // Fetch saved books
  const fetchSavedBooks = useCallback(async () => {
    if (!user || !isOwnProfile) return;
    
    try {
      setSavedBooksLoading(true);
      setSavedBooksError(null);
      
      const books = await SavedBooksService.getSavedBooks();
      setSavedBooks(books);
      
      // Update reading stats with real data
      const currentlyReading = books.filter(book => book.status === 'currently_reading').length;
      const totalBooks = books.length;
      
      setReadingStats(prev => ({
        ...prev,
        totalBooks,
        currentlyReading
      }));
    } catch (error) {
      console.error('Error fetching saved books:', error);
      setSavedBooksError('Failed to load your book library');
    } finally {
      setSavedBooksLoading(false);
    }
  }, [user, isOwnProfile]);

  // Genre editing functions
  const handleEditGenres = () => {
    setEditableGenres([...(userPreferences?.favoriteGenres || readingStats.favoriteGenres)]);
    setIsEditingGenres(true);
  };

  const handleSaveGenres = async () => {
    try {
      if (!user) return;
      
      const updatedPreferences: ReadingPreferences = {
        ...userPreferences,
        favoriteGenres: editableGenres
      };
      
      await UserPreferencesService.savePreferences(updatedPreferences);
      setUserPreferences(updatedPreferences);
      setReadingStats(prev => ({
        ...prev,
        favoriteGenres: editableGenres
      }));
      setIsEditingGenres(false);
    } catch (error) {
      console.error('Error saving genres:', error);
    }
  };

  const handleCancelEditGenres = () => {
    setEditableGenres([]);
    setIsEditingGenres(false);
  };

  const handleGenreToggle = (genre: string) => {
    setEditableGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // Available genres for selection
  const availableGenres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 'Fantasy',
    'Biography', 'History', 'Science', 'Business', 'Self-Help', 'Psychology',
    'Philosophy', 'Health', 'Travel', 'Cooking', 'Art', 'Religion', 'Politics',
    'Technology', 'Education', 'Sports', 'Humor', 'Poetry', 'Drama'
  ];

  // Mock user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // TODO: Replace with real API call
        if (isOwnProfile && user) {
          setProfileUser({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || '',
            email: user.email || '',
            displayName: user.user_metadata?.full_name || user.user_metadata?.name || (user.user_metadata?.username || user.email?.split('@')[0] || ''),
            bio: user.user_metadata?.bio || '', // Load actual bio from auth metadata
            avatarUrl: user.user_metadata?.avatar_url || '', // Load actual avatar from auth metadata
            createdAt: new Date().toISOString(),
            threadCount: 8,
            followingCount: 12,
            privacySettings: {
              profileVisible: true,
              readingActivityVisible: true
            },
            notificationSettings: {
              emailNotifications: true,
              inAppNotifications: true,
              threadComments: true,
              threadMentions: true,
              digestFrequency: 'weekly'
            }
          });
        } else {
          // Mock public profile
          setProfileUser({
            id: 'mock-user-id',
            username: username?.replace('@', '') || 'bookworm',
            email: 'hidden@privacy.com',
            displayName: 'Book Lover',
            bio: 'Fellow book enthusiast sharing great reads and thoughtful discussions.',
            avatarUrl: '',
            createdAt: new Date().toISOString(),
            threadCount: 15,
            followingCount: 8,
            privacySettings: {
              profileVisible: true,
              readingActivityVisible: true
            }
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    
    // Only load preferences and books if we have a user and this is own profile
    if (isOwnProfile && user) {
      fetchUserPreferences();
      fetchSavedBooks();
    }
  }, [username, isOwnProfile, user?.id]); // Only depend on user.id to avoid unnecessary re-runs

  // Load followed threads for own profile - COMMENTED OUT FOR UX IMPROVEMENT
  // useEffect(() => {
  //   if (!isOwnProfile || !user) {
  //     return;
  //   }

  //   const loadFollowedThreads = async () => {
  //     try {
  //       setFollowingLoading(true);
  //       const threads = await ThreadFollowService.getFollowedThreads(user.id);
  //       setFollowedThreads(threads);
  //       setFollowingError(null);
  //     } catch (err) {
  //       console.error('Error loading followed threads:', err);
  //       setFollowingError('Failed to load followed threads');
  //     } finally {
  //       setFollowingLoading(false);
  //     }
  //   };

  //   loadFollowedThreads();
  // }, [isOwnProfile, user]);

  // Calculate reading stats when data changes
  useEffect(() => {
    calculateReadingStats();
  }, [calculateReadingStats]);

  const handleProfileSave = async (updates: Partial<User>) => {
    try {
      console.log('Profile updates:', updates);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Update Supabase Auth metadata
      const authUpdates = {
        username: updates.username,
        bio: updates.bio,
        avatar_url: updates.avatarUrl, // Add avatar URL with underscore to match retrieval
        full_name: updates.displayName,
        name: updates.displayName,
        favoriteGenres: updates.readingPreferences?.favoriteGenres,
        preferredPace: updates.readingPreferences?.preferredPace,
        favoriteThemes: updates.readingPreferences?.favoriteThemes
      };

      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: authUpdates
      });

      if (authError) {
        throw new Error(`Failed to update auth profile: ${authError.message}`);
      }

      // Try to update custom user table if it exists (graceful degradation)
      try {
        const { error: tableError } = await supabase
          .from('user')
          .update({
            username: updates.username,
            favoriteGenres: updates.readingPreferences?.favoriteGenres || [],
            preferredPace: updates.readingPreferences?.preferredPace || 'Moderate',
            favoriteThemes: updates.readingPreferences?.favoriteThemes || [],
            updatedAt: new Date().toISOString()
          })
          .eq('id', user.id);

        if (tableError) {
          console.warn('User table update failed:', tableError.message);
        } else {
          console.log('User table updated successfully');
        }
      } catch (tableUpdateError) {
        // Ignore table update errors - auth metadata is the primary source
        console.warn('User table update failed (graceful degradation):', tableUpdateError);
      }

      // Get the current user data to refresh the local profile state
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      
      // Update local profile state with the refreshed data
      if (refreshedUser && profileUser) {
        setProfileUser({
          ...profileUser,
          username: refreshedUser.user_metadata?.username || profileUser.username,
          displayName: refreshedUser.user_metadata?.full_name || refreshedUser.user_metadata?.name || profileUser.displayName,
          bio: refreshedUser.user_metadata?.bio || '',
          avatarUrl: refreshedUser.user_metadata?.avatar_url || '',
          readingPreferences: {
            favoriteGenres: refreshedUser.user_metadata?.favoriteGenres || [],
            preferredPace: refreshedUser.user_metadata?.preferredPace || 'Moderate',
            favoriteThemes: refreshedUser.user_metadata?.favoriteThemes || []
          }
        });
      }

      console.log('Profile updated successfully via direct Supabase');
      
      // Re-fetch saved books after profile update to ensure consistency
      if (isOwnProfile && user) {
        setTimeout(() => {
          fetchSavedBooks(); // Fresh fetch
        }, 1000); // Small delay to ensure auth session is settled
      }
      
      // Don't return anything to match Promise<void> type
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Helper functions for followed threads
  const handleThreadClick = (threadId: string) => {
    navigate(`/threads/${threadId}`);
  };

  const handleBookClick = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/books/${bookId}`);
  };

  // const handleUnfollow = (threadId: string) => {
  //   setFollowedThreads(prev => prev.filter(ft => ft.thread.id !== threadId));
  // };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const tabs = [
    { id: 'books' as TabType, label: 'Books', icon: BookOpenIcon, count: readingStats.totalBooks },
    { id: 'threads' as TabType, label: 'Threads', icon: ChatBubbleLeftIcon, count: profileUser?.threadCount || 0 },
    { id: 'activity' as TabType, label: 'Activity', icon: ClockIcon },
    { id: 'insights' as TabType, label: 'Insights', icon: ChartBarIcon },
    ...(isOwnProfile ? [{ id: 'preferences' as TabType, label: 'Preferences', icon: Cog6ToothIcon }] : [])
  ];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light'
          ? 'bg-gray-50'
          : theme === 'dark'
          ? 'bg-gray-900'
          : 'bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50'
      }`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${
            theme === 'light'
              ? 'text-gray-600'
              : theme === 'dark'
              ? 'text-gray-300'
              : 'text-purple-600'
          }`}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light'
          ? 'bg-gray-50'
          : theme === 'dark'
          ? 'bg-gray-900'
          : 'bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50'
      }`}>
        <div className="text-center">
          <h1 className={`text-2xl font-bold mb-2 ${
            theme === 'light'
              ? 'text-gray-900'
              : theme === 'dark'
              ? 'text-white'
              : 'text-purple-900'
          }`}>
            Profile Not Found
          </h1>
          <p className={`mb-4 ${
            theme === 'light'
              ? 'text-gray-600'
              : theme === 'dark'
              ? 'text-gray-300'
              : 'text-purple-600'
          }`}>
            This profile doesn't exist or has been made private.
          </p>
          <button
            onClick={() => navigate('/')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              theme === 'light'
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'light'
        ? 'bg-gray-50'
        : theme === 'dark'
        ? 'bg-gray-900'
        : 'bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50'
    }`}>
      {/* Profile Header */}
      <div className={`border-b transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-white border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 border-purple-200'
      }`}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* User Info */}
            <div className="flex items-center space-x-6">
              <UserAvatar 
                user={profileUser} 
                size="xl" 
                className="flex-shrink-0"
              />
              <div className="flex-1">
                <h1 className={`text-3xl font-bold transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
                }`}>
                  {profileUser.displayName}
                </h1>
                <p className={`text-lg mt-1 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-purple-600'
                }`}>
                  @{profileUser.username}
                </p>
                {profileUser.bio ? (
                  <p className={`mt-3 max-w-md transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-700'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-700'
                  }`}>
                    {profileUser.bio}
                  </p>
                ) : isOwnProfile && (
                  <p className={`mt-3 max-w-md italic transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-500'
                      : theme === 'dark'
                      ? 'text-gray-400'
                      : 'text-purple-500'
                  }`}>
                    Add a bio to tell others about your reading journey...
                  </p>
                )}
              </div>
            </div>

            {/* Action Button */}
            {isOwnProfile && (
              <button
                onClick={() => setShowEditModal(true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${
                  theme === 'light'
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
                }`}
              >
                <Cog6ToothIcon className="w-5 h-5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Reading Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`text-center p-4 rounded-xl transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-gray-50'
                : theme === 'dark'
                ? 'bg-gray-700'
                : 'bg-purple-100'
            }`}>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-600'
                  : theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-purple-600'
              }`}>
                {readingStats.totalBooks}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                Total Books
              </div>
            </div>
            
            <div className={`text-center p-4 rounded-xl transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-gray-50'
                : theme === 'dark'
                ? 'bg-gray-700'
                : 'bg-purple-100'
            }`}>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-600'
                  : theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-purple-600'
              }`}>
                {readingStats.currentlyReading}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                Currently Reading
              </div>
            </div>
            
            <div className={`text-center p-4 rounded-xl transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-gray-50'
                : theme === 'dark'
                ? 'bg-gray-700'
                : 'bg-purple-100'
            }`}>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-600'
                  : theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-purple-600'
              }`}>
                {readingStats.booksThisYear}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                This Year
              </div>
            </div>
            
            <div className={`text-center p-4 rounded-xl transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-gray-50'
                : theme === 'dark'
                ? 'bg-gray-700'
                : 'bg-purple-100'
            }`}>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-600'
                  : theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-purple-600'
              }`}>
                {readingStats.booksCompleted}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                Books Completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`border-b transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-white border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-r from-pink-50 to-purple-50 border-purple-200'
      }`}>
        <div className="max-w-4xl mx-auto px-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? theme === 'light'
                        ? 'border-primary-600 text-primary-600'
                        : theme === 'dark'
                        ? 'border-blue-400 text-blue-400'
                        : 'border-purple-600 text-purple-600'
                      : theme === 'light'
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      : theme === 'dark'
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      : 'border-transparent text-purple-400 hover:text-purple-600 hover:border-purple-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      isActive
                        ? theme === 'light'
                          ? 'bg-primary-100 text-primary-600'
                          : theme === 'dark'
                          ? 'bg-blue-900/50 text-blue-400'
                          : 'bg-purple-100 text-purple-600'
                        : theme === 'light'
                        ? 'bg-gray-100 text-gray-600'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-purple-50 text-purple-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {activeTab === 'books' && (
          <div className="space-y-8">
            {/* Want to Read */}
            <div>
              <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                Want to Read
              </h2>
              {savedBooksLoading ? (
                <div className={`text-center py-8 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-600'
                }`}>
                  <div className="animate-spin w-6 h-6 mx-auto mb-3 border-2 border-current border-t-transparent rounded-full" />
                  Loading your books...
                </div>
              ) : savedBooksError ? (
                <div className={`text-center py-8 ${
                  theme === 'light'
                    ? 'text-red-500'
                    : theme === 'dark'
                    ? 'text-red-400'
                    : 'text-pink-600'
                }`}>
                  <p className="mb-4">{savedBooksError}</p>
                  <button
                    onClick={() => fetchSavedBooks()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-red-100 hover:bg-red-200 text-red-700'
                        : theme === 'dark'
                        ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400'
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                  >
                    Retry Loading
                  </button>
                </div>
              ) : wantToReadBooks.length === 0 ? (
                <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
                  theme === 'light'
                    ? 'text-gray-500 border-gray-300'
                    : theme === 'dark'
                    ? 'text-gray-400 border-gray-600'
                    : 'text-purple-500 border-purple-300'
                }`}>
                  <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No books saved yet</p>
                  <p className="text-sm opacity-75 mb-4">Save books from our recommendations to see them here!</p>
                  <button
                    onClick={() => navigate('/books')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                        : theme === 'dark'
                        ? 'bg-purple-900/20 hover:bg-purple-900/30 text-purple-400'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                    }`}
                  >
                    Browse Books
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  {wantToReadBooks.slice(0, 6).map((book) => (
                    <div key={`want-${book.id}`} className="relative">
                      <BookCard 
                        {...book} 
                        isSaved={true}
                        onInteraction={async (type) => {
                          // Refresh saved books list when user unsaves
                          if (type === 'unsave') {
                            await fetchSavedBooks();
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Currently Reading */}
            <div>
              <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                Currently Reading
              </h2>
              {savedBooksLoading ? (
                <div className={`text-center py-8 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-600'
                }`}>
                  <div className="animate-spin w-6 h-6 mx-auto mb-3 border-2 border-current border-t-transparent rounded-full" />
                  Loading your books...
                </div>
              ) : savedBooksError ? (
                <div className={`text-center py-8 ${
                  theme === 'light'
                    ? 'text-red-500'
                    : theme === 'dark'
                    ? 'text-red-400'
                    : 'text-pink-600'
                }`}>
                  <p>{savedBooksError}</p>
                </div>
              ) : currentlyReadingBooks.length === 0 ? (
                <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
                  theme === 'light'
                    ? 'text-gray-500 border-gray-300'
                    : theme === 'dark'
                    ? 'text-gray-400 border-gray-600'
                    : 'text-purple-500 border-purple-300'
                }`}>
                  <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No books currently reading</p>
                  <p className="text-sm opacity-75">Start reading a book to see it here!</p>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  {currentlyReadingBooks.slice(0, 6).map((book) => (
                  <div key={book.id} className="relative">
                    <BookCard 
                      {...book} 
                      isSaved={true}
                      onInteraction={async (type) => {
                        // Refresh saved books list when user unsaves
                        if (type === 'unsave') {
                          await fetchSavedBooks();
                        }
                      }}
                    />
                    {/* Reading Progress */}
                    <div className={`mt-3 p-3 rounded-lg ${
                      theme === 'light'
                        ? 'bg-gray-50'
                        : theme === 'dark'
                        ? 'bg-gray-700'
                        : 'bg-purple-50'
                    }`}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className={`${
                          theme === 'light'
                            ? 'text-gray-600'
                            : theme === 'dark'
                            ? 'text-gray-300'
                            : 'text-purple-600'
                        }`}>
                          Progress
                        </span>
                        <span className={`font-medium ${
                          theme === 'light'
                            ? 'text-gray-900'
                            : theme === 'dark'
                            ? 'text-white'
                            : 'text-purple-900'
                        }`}>
                          {Math.floor(Math.random() * 80) + 20}%
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full ${
                        theme === 'light'
                          ? 'bg-gray-200'
                          : theme === 'dark'
                          ? 'bg-gray-600'
                          : 'bg-purple-200'
                      }`}>
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            theme === 'light'
                              ? 'bg-primary-500'
                              : theme === 'dark'
                              ? 'bg-blue-500'
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.floor(Math.random() * 80) + 20}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>

            {/* Favorites */}
            <div>
              <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                All-Time Favorites
              </h2>
              {savedBooksLoading ? (
                <div className={`text-center py-8 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-600'
                }`}>
                  <div className="animate-spin w-6 h-6 mx-auto mb-3 border-2 border-current border-t-transparent rounded-full" />
                  Loading your favorites...
                </div>
              ) : favoriteBooks.length === 0 ? (
                <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
                  theme === 'light'
                    ? 'text-gray-500 border-gray-300'
                    : theme === 'dark'
                    ? 'text-gray-400 border-gray-600'
                    : 'text-purple-500 border-purple-300'
                }`}>
                  <HeartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No favorites yet</p>
                  <p className="text-sm opacity-75">Rate finished books 4+ stars to see them here!</p>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  {favoriteBooks.map((book) => (
                    <div key={`fav-${book.id}`} className="relative">
                      <BookCard 
                        {...book} 
                        isSaved={true}
                        onInteraction={async (type) => {
                          // Refresh saved books list when user unsaves
                          if (type === 'unsave') {
                            await fetchSavedBooks();
                          }
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <HeartIcon className="w-6 h-6 text-red-500 fill-current" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Following Tab - REMOVED FOR UX IMPROVEMENT */}
        {false && (
          <div className="space-y-6">
            {false ? (
              <div className={`text-center py-12 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                <div className="animate-spin w-8 h-8 mx-auto mb-4 border-2 border-current border-t-transparent rounded-full" />
                Loading your followed threads...
              </div>
            ) : false ? (
              <div className={`text-center py-12 ${
                theme === 'light'
                  ? 'text-red-500'
                  : theme === 'dark'
                  ? 'text-red-400'
                  : 'text-pink-600'
              }`}>
                <p className="text-lg font-medium mb-2">Oops! Something went wrong</p>
                <p className="text-sm opacity-75">{"Error"}</p>
                <button
                  onClick={() => window.location.reload()}
                  className={`mt-4 px-4 py-2 rounded-lg transition-colors ${
                    theme === 'light'
                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                      : theme === 'dark'
                      ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                      : 'bg-red-100 hover:bg-red-200 text-red-700'
                  }`}
                >
                  Try Again
                </button>
              </div>
            ) : false ? (
              <div className={`text-center py-16 rounded-lg border-2 border-dashed ${
                theme === 'light'
                  ? 'border-gray-300 bg-gray-50'
                  : theme === 'dark'
                  ? 'border-gray-700 bg-gray-800'
                  : 'border-purple-300 bg-gradient-to-br from-pink-50 to-purple-50'
              }`}>
                <HeartIcon className={`w-16 h-16 mx-auto mb-4 ${
                  theme === 'light'
                    ? 'text-gray-400'
                    : theme === 'dark'
                    ? 'text-gray-500'
                    : 'text-purple-400'
                }`} />
                <h3 className={`text-xl font-semibold mb-2 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-900'
                }`}>
                  No followed threads yet
                </h3>
                <p className={`text-sm mb-6 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-purple-600'
                }`}>
                  Follow threads to keep track of discussions you care about
                </p>
                <button
                  onClick={() => navigate('/threads')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${
                    theme === 'light'
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
                  }`}
                >
                  Explore Threads
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {[].map((followedThread: any) => {
                  const thread = followedThread.thread;
                  const book = thread.threadBooks[0]?.book; // Primary book
                  
                  return (
                    <div
                      key={followedThread.id}
                      onClick={() => handleThreadClick(thread.id)}
                      className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                        theme === 'light'
                          ? 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-md'
                          : theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-lg'
                          : 'bg-gradient-to-br from-pink-50 to-purple-50 border-purple-200 hover:border-purple-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Book Cover */}
                        {book && (
                          <div 
                            className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={(e) => handleBookClick(book.id, e)}
                          >
                            <img
                              src={book.imageUrl || '/api/placeholder/80/120'}
                              alt={book.title}
                              className="w-16 h-24 object-cover rounded-lg shadow-sm"
                            />
                          </div>
                        )}

                        {/* Thread Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-lg font-semibold mb-1 line-clamp-2 ${
                                theme === 'light'
                                  ? 'text-gray-900'
                                  : theme === 'dark'
                                  ? 'text-white'
                                  : 'text-purple-900'
                              }`}>
                                {thread.title}
                              </h3>
                              <p className={`text-sm line-clamp-2 mb-2 ${
                                theme === 'light'
                                  ? 'text-gray-600'
                                  : theme === 'dark'
                                  ? 'text-gray-300'
                                  : 'text-purple-600'
                              }`}>
                                {thread.description}
                              </p>
                            </div>
                            
                            {/* Follow Button */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <ThreadFollowButton
                                threadId={thread.id}
                                onFollowChange={(isFollowing) => {
                                  // handleUnfollow removed with Following tab
                                }}
                                size="sm"
                                variant="compact"
                                showFollowerCount={false}
                              />
                            </div>
                          </div>

                          {/* Thread Meta */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Author */}
                              <div className="flex items-center gap-2">
                                <UserAvatar
                                  user={{
                                    username: thread.user.username,
                                    displayName: thread.user.displayName,
                                    avatarUrl: thread.user.avatarUrl
                                  }}
                                  size="sm"
                                />
                                <span className={`text-sm ${
                                  theme === 'light'
                                    ? 'text-gray-700'
                                    : theme === 'dark'
                                    ? 'text-gray-300'
                                    : 'text-purple-700'
                                }`}>
                                  {thread.user.displayName || thread.user.username}
                                </span>
                              </div>

                              {/* Book Title */}
                              {book && (
                                <div 
                                  className="flex items-center gap-1 cursor-pointer hover:opacity-75"
                                  onClick={(e) => handleBookClick(book.id, e)}
                                >
                                  <BookOpenIcon className="w-4 h-4" />
                                  <span className={`text-sm font-medium truncate max-w-[200px] ${
                                    theme === 'light'
                                      ? 'text-primary-600'
                                      : theme === 'dark'
                                      ? 'text-blue-400'
                                      : 'text-purple-600'
                                  }`}>
                                    {book.title}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Thread Stats */}
                            <div className="flex items-center gap-4 text-sm">
                              <div className={`flex items-center gap-1 ${
                                theme === 'light'
                                  ? 'text-gray-500'
                                  : theme === 'dark'
                                  ? 'text-gray-400'
                                  : 'text-purple-500'
                              }`}>
                                <ArrowUpIcon className="w-4 h-4" />
                                <span>{thread.upvotes}</span>
                              </div>
                              <div className={`flex items-center gap-1 ${
                                theme === 'light'
                                  ? 'text-gray-500'
                                  : theme === 'dark'
                                  ? 'text-gray-400'
                                  : 'text-purple-500'
                              }`}>
                                <ChatBubbleLeftIcon className="w-4 h-4" />
                                <span>{thread.comments}</span>
                              </div>
                              <span className={`${
                                theme === 'light'
                                  ? 'text-gray-500'
                                  : theme === 'dark'
                                  ? 'text-gray-400'
                                  : 'text-purple-500'
                              }`}>
                                {formatRelativeTime(thread.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-8">
            {/* Reading Preferences */}
            <div>
              <h2 className={`text-xl font-semibold mb-6 transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                Reading Preferences
              </h2>
              
              <div className="space-y-6">
                {/* Favorite Genres */}
                <div className={`p-6 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-white border-gray-200'
                    : theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-medium ${
                      theme === 'light'
                        ? 'text-gray-900'
                        : theme === 'dark'
                        ? 'text-white'
                        : 'text-purple-900'
                    }`}>
                      Favorite Genres
                    </h3>
                    
                    {!isEditingGenres ? (
                      <button 
                        onClick={handleEditGenres}
                        className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                          theme === 'light'
                            ? 'text-primary-600 hover:bg-primary-50'
                            : theme === 'dark'
                            ? 'text-blue-400 hover:bg-blue-900/20'
                            : 'text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={handleSaveGenres}
                          className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                            theme === 'light'
                              ? 'text-green-600 hover:bg-green-50'
                              : theme === 'dark'
                              ? 'text-green-400 hover:bg-green-900/20'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <CheckIcon className="h-4 w-4" />
                          <span>Save</span>
                        </button>
                        <button 
                          onClick={handleCancelEditGenres}
                          className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                            theme === 'light'
                              ? 'text-gray-600 hover:bg-gray-50'
                              : theme === 'dark'
                              ? 'text-gray-400 hover:bg-gray-800'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <XMarkIcon className="h-4 w-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {!isEditingGenres ? (
                    // Display mode
                    <div className="flex flex-wrap gap-2">
                      {readingStats.favoriteGenres.length > 0 ? (
                        readingStats.favoriteGenres.map((genre, index) => (
                          <span
                            key={index}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                              theme === 'light'
                                ? 'bg-primary-100 text-primary-700'
                                : theme === 'dark'
                                ? 'bg-blue-900/20 text-blue-400'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {genre}
                          </span>
                        ))
                      ) : (
                        <p className={`text-sm ${
                          theme === 'light'
                            ? 'text-gray-500'
                            : theme === 'dark'
                            ? 'text-gray-400'
                            : 'text-purple-500'
                        }`}>
                          No favorite genres selected. Click Edit to add some!
                        </p>
                      )}
                    </div>
                  ) : (
                    // Edit mode
                    <div className="space-y-4">
                      <p className={`text-sm ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : theme === 'dark'
                          ? 'text-gray-300'
                          : 'text-purple-600'
                      }`}>
                        Select your favorite genres (click to toggle):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableGenres.map((genre) => (
                          <button
                            key={genre}
                            onClick={() => handleGenreToggle(genre)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border-2 ${
                              editableGenres.includes(genre)
                                ? theme === 'light'
                                  ? 'bg-blue-500 text-white border-blue-500 shadow-md hover:bg-blue-600 hover:border-blue-600'
                                  : theme === 'dark'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700 hover:border-blue-700'
                                  : 'bg-purple-500 text-white border-purple-500 shadow-md hover:bg-purple-600 hover:border-purple-600'
                                : theme === 'light'
                                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                : theme === 'dark'
                                ? 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                      <div className={`flex items-center justify-between pt-3 border-t ${
                        theme === 'light'
                          ? 'border-gray-200'
                          : theme === 'dark'
                          ? 'border-gray-700'
                          : 'border-purple-200'
                      }`}>
                        <p className={`text-sm font-medium ${
                          editableGenres.length > 0
                            ? theme === 'light'
                              ? 'text-blue-600'
                              : theme === 'dark'
                              ? 'text-blue-400'
                              : 'text-purple-600'
                            : theme === 'light'
                            ? 'text-gray-500'
                            : theme === 'dark'
                            ? 'text-gray-400'
                            : 'text-purple-500'
                        }`}>
                          Selected: {editableGenres.length} genre{editableGenres.length !== 1 ? 's' : ''}
                        </p>
                        {editableGenres.length > 0 && (
                          <button
                            onClick={() => setEditableGenres([])}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              theme === 'light'
                                ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                : theme === 'dark'
                                ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                                : 'text-purple-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reading Context Preferences */}
                <ReadingContextPreferences />

                {/* Status & Last Updated */}
                <div className={`text-center py-4 border-t ${
                  theme === 'light'
                    ? 'text-gray-500 border-gray-200'
                    : theme === 'dark'
                    ? 'text-gray-400 border-gray-700'
                    : 'text-purple-500 border-purple-200'
                }`}>
                  {preferencesLoading ? (
                    <p className="text-sm">Loading preferences...</p>
                  ) : userPreferences ? (
                    <p className="text-sm">
                      Preferences loaded from your profile
                    </p>
                  ) : (
                    <p className="text-sm">
                      Complete onboarding to see your preferences here
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs - placeholder content */}
        {activeTab !== 'books' && activeTab !== 'preferences' && (
          <div className={`text-center py-12 ${
            theme === 'light'
              ? 'text-gray-500'
              : theme === 'dark'
              ? 'text-gray-400'
              : 'text-purple-500'
          }`}>
            <div className="mb-4">
              {activeTab === 'threads' && <ChatBubbleLeftIcon className="w-12 h-12 mx-auto" />}
              {activeTab === 'activity' && <ClockIcon className="w-12 h-12 mx-auto" />}
              {activeTab === 'insights' && <ChartBarIcon className="w-12 h-12 mx-auto" />}
            </div>
            <h3 className="text-lg font-medium mb-2">
              {activeTab === 'threads' && 'Thread Discussions'}
              {activeTab === 'activity' && 'Reading Activity'}
              {activeTab === 'insights' && 'Reading Insights'}
            </h3>
            <p>This tab will be implemented in Phase 2</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && profileUser && (
        <UserProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={profileUser}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
}; 