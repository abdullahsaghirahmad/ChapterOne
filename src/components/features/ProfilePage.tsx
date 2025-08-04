import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Cog6ToothIcon, 
  BookOpenIcon, 
  ChatBubbleLeftIcon,
  ChartBarIcon,
  ClockIcon,
  HeartIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { UserAvatar } from '../ui/UserAvatar';
import { UserProfileModal } from '../ui/UserProfileModal';
import { ThreadFollowButton } from '../ui/ThreadFollowButton';
import { BookCard } from './BookCard';
import { ThreadFollowService } from '../../services/threadFollow.service';
import { User, Book, FollowedThread } from '../../types';

interface ProfilePageProps {}

interface ReadingStats {
  totalBooks: number;
  currentlyReading: number;
  booksThisYear: number;
  favoriteGenres: string[];
  readingStreak: number;
}

type TabType = 'books' | 'threads' | 'following' | 'activity' | 'insights';

const mockBooks: Book[] = [
  {
    id: '1',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1581527774i/41881472.jpg',
    pace: 'Moderate',
    tone: ['Insightful', 'Practical'],
    themes: ['Personal Finance', 'Behavioral Psychology'],
    description: 'Timeless lessons about money and investing',
    bestFor: ['Investors', 'Young Professionals'],
    rating: 4.5,
    isExternal: false
  },
  {
    id: '2',
    title: 'Atomic Habits',
    author: 'James Clear',
    coverImage: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1535115320i/40121378.jpg',
    pace: 'Fast',
    tone: ['Motivational', 'Practical'],
    themes: ['Self-Improvement', 'Productivity'],
    description: 'An easy & proven way to build good habits & break bad ones',
    bestFor: ['Anyone wanting to improve'],
    rating: 4.8,
    isExternal: false
  }
];

export const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [activeTab, setActiveTab] = useState<TabType>('books');
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  
  // Following threads state
  const [followedThreads, setFollowedThreads] = useState<FollowedThread[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingError, setFollowingError] = useState<string | null>(null);
  
  // Check if viewing own profile
  const isOwnProfile = !username || (user && username === `@${user.user_metadata?.username}`);

  // Mock reading stats
  const [readingStats] = useState<ReadingStats>({
    totalBooks: 47,
    currentlyReading: 3,
    booksThisYear: 12,
    favoriteGenres: ['Psychology', 'Business', 'Self-Help'],
    readingStreak: 15
  });

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
            displayName: user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || '',
            bio: 'Passionate reader exploring psychology, business, and personal development. Always looking for the next great book!',
            avatarUrl: user.user_metadata?.avatar_url || '',
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
  }, [username, isOwnProfile, user]);

  // Load followed threads for own profile
  useEffect(() => {
    if (!isOwnProfile || !user) {
      return;
    }

    const loadFollowedThreads = async () => {
      try {
        setFollowingLoading(true);
        const threads = await ThreadFollowService.getFollowedThreads(user.id);
        setFollowedThreads(threads);
        setFollowingError(null);
      } catch (err) {
        console.error('Error loading followed threads:', err);
        setFollowingError('Failed to load followed threads');
      } finally {
        setFollowingLoading(false);
      }
    };

    loadFollowedThreads();
  }, [isOwnProfile, user]);

  const handleProfileSave = async (updates: Partial<User>) => {
    console.log('Profile updates:', updates);
    // TODO: Call API to update user profile
    if (profileUser) {
      setProfileUser({ ...profileUser, ...updates });
    }
    return Promise.resolve();
  };

  // Helper functions for followed threads
  const handleThreadClick = (threadId: string) => {
    navigate(`/threads/${threadId}`);
  };

  const handleBookClick = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/books/${bookId}`);
  };

  const handleUnfollow = (threadId: string) => {
    setFollowedThreads(prev => prev.filter(ft => ft.thread.id !== threadId));
  };

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
    ...(isOwnProfile ? [{ id: 'following' as TabType, label: 'Following', icon: HeartIcon, count: followedThreads.length }] : []),
    { id: 'activity' as TabType, label: 'Activity', icon: ClockIcon },
    { id: 'insights' as TabType, label: 'Insights', icon: ChartBarIcon }
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
                {profileUser.bio && (
                  <p className={`mt-3 max-w-md transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-700'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-700'
                  }`}>
                    {profileUser.bio}
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
                {readingStats.readingStreak}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                Day Streak
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
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {mockBooks.slice(0, 2).map((book) => (
                  <div key={book.id} className="relative">
                    <BookCard {...book} />
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
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {mockBooks.map((book) => (
                  <div key={`fav-${book.id}`} className="relative">
                    <BookCard {...book} />
                    <div className="absolute top-2 right-2">
                      <HeartIcon className="w-6 h-6 text-red-500 fill-current" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Following Tab */}
        {activeTab === 'following' && (
          <div className="space-y-6">
            {followingLoading ? (
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
            ) : followingError ? (
              <div className={`text-center py-12 ${
                theme === 'light'
                  ? 'text-red-500'
                  : theme === 'dark'
                  ? 'text-red-400'
                  : 'text-pink-600'
              }`}>
                <p className="text-lg font-medium mb-2">Oops! Something went wrong</p>
                <p className="text-sm opacity-75">{followingError}</p>
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
            ) : followedThreads.length === 0 ? (
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
                {followedThreads.map((followedThread) => {
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
                                  if (!isFollowing) {
                                    handleUnfollow(thread.id);
                                  }
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

        {/* Other tabs - placeholder content */}
        {activeTab !== 'books' && activeTab !== 'following' && (
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