import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, BookOpenIcon, ChatBubbleLeftIcon, UserIcon, Cog6ToothIcon, ChevronDownIcon, ChatBubbleLeftEllipsisIcon, ArrowUpIcon, HeartIcon, BellIcon } from '@heroicons/react/24/outline';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { UserAvatar } from '../ui/UserAvatar';

import { UserProfileModal } from '../ui/UserProfileModal';
import { OnboardingModal } from '../ui/OnboardingModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/api.supabase';
import { supabase } from '../../lib/supabase';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { UserPreferencesService } from '../../services/userPreferences.service';
import { useFeatureFlags } from '../../services/featureFlag.service';
import { Notification, User, ReadingPreferences } from '../../types';
import AuthModal from '../auth/AuthModal';

interface LayoutProps {
  children: any;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const { isOpen: showAuthModal, mode: authMode, showAuthModal: openAuthModal, hideAuthModal } = useAuthModal();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Mock notifications data - TODO: Replace with real API calls
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      userId: user?.id || '',
      type: 'thread_activity',
      title: 'New comment on your thread',
      message: 'Someone replied to "Best sci-fi books for beginners"',
      data: { threadId: '123', threadTitle: 'Best sci-fi books for beginners' },
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
    },
    {
      id: '2',
      userId: user?.id || '',
      type: 'upvote_milestone',
      title: 'Your thread hit 25 upvotes!',
      message: '"Psychology books for managers" is getting popular',
      data: { threadId: '456', threadTitle: 'Psychology books for managers', upvotes: 25 },
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
    },
    {
      id: '3',
      userId: user?.id || '',
      type: 'thread_mention',
      title: 'You were mentioned in a thread',
      message: '@' + (user?.user_metadata?.username || 'user') + ' what do you think about this book?',
      data: { threadId: '789', threadTitle: 'Fantasy recommendations' },
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    }
  ]);

  // Convert Supabase user to our User type
  const currentUser: User | null = user ? {
    id: user.id,
    username: user.user_metadata?.username || user.email?.split('@')[0] || '',
    email: user.email || '',
    displayName: user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || '',
    bio: '', // Will be populated from database
    avatarUrl: user.user_metadata?.avatar_url || '',
    createdAt: new Date().toISOString(),
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
  } : null;

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Notification handlers - TODO: Replace with real API calls
  const handleMarkAllAsRead = () => {
    console.log('Mark all as read');
    // TODO: Call API to mark all notifications as read
  };

  const handleNotificationClick = (notification: Notification) => {
    console.log('Notification clicked:', notification);
    // TODO: Navigate to relevant thread/page based on notification data
    if (notification.data?.threadId && isEnabled('threads_feature_enabled')) {
      // Navigate to thread (only if threads feature is enabled)
      window.location.href = `/threads/${notification.data.threadId}`;
    }
  };

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

      console.log('Profile updated successfully via direct Supabase');
      
      // Don't return anything to match Promise<void> type
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Check if user needs onboarding when they log in
  // Skip this if new contextual recommendations are enabled (unified experience)
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Wait for both auth and feature flags to finish loading
      if (loading || flagsLoading || hasCheckedOnboarding) return;
      
      // If no user, no need to check onboarding
      if (!user) {
        setHasCheckedOnboarding(true);
        return;
      }
      
      // Skip old onboarding modal if new contextual recommendations are enabled
      if (isEnabled('contextual_recommendations_v1')) {
        console.log('[LAYOUT] Skipping old onboarding - new contextual system enabled');
        setHasCheckedOnboarding(true);
        return;
      }
      
      try {
        const hasCompleted = await UserPreferencesService.hasCompletedOnboarding();
        if (!hasCompleted) {
          console.log('[LAYOUT] User needs onboarding - showing old modal');
          // Show onboarding with a slight delay for better UX
          setTimeout(() => {
            setShowOnboarding(true);
          }, 1500);
        } else {
          console.log('[LAYOUT] User has completed onboarding');
        }
        setHasCheckedOnboarding(true);
      } catch (error) {
        console.error('[LAYOUT] Error checking onboarding status:', error);
        setHasCheckedOnboarding(true);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, flagsLoading, hasCheckedOnboarding, isEnabled]);

  // Reset onboarding check when user changes
  useEffect(() => {
    setHasCheckedOnboarding(false);
  }, [user?.id]);

  const handleOnboardingComplete = async (preferences: ReadingPreferences) => {
    try {
      await UserPreferencesService.savePreferences(preferences);
      setShowOnboarding(false);
      console.log('✅ Onboarding completed successfully');
    } catch (error) {
      console.error('Error saving onboarding preferences:', error);
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      theme === 'light' 
        ? 'bg-primary-50' 
        : theme === 'dark'
        ? 'bg-gray-900'
        : 'bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50'
    }`}>
      {/* Header */}
      <header className={`border-b transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white border-primary-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 border-purple-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className={`text-xl font-bold transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
              }`}>
                ChapterOne
              </Link>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <Link
                to="/books"
                className={`transition-colors duration-300 ${
                  isActive('/books') ? 'font-medium' : ''
                } ${
                  theme === 'light'
                    ? 'text-primary-600 hover:text-primary-900'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:text-white'
                    : 'text-purple-600 hover:text-purple-800'
                }`}
              >
                Books
              </Link>
              {/* Threads link - hidden when feature flag is OFF */}
              {isEnabled('threads_feature_enabled') && (
                <Link
                  to="/threads"
                  className={`transition-colors duration-300 ${
                    isActive('/threads') ? 'font-medium' : ''
                  } ${
                    theme === 'light'
                      ? 'text-primary-600 hover:text-primary-900'
                      : theme === 'dark'
                      ? 'text-gray-300 hover:text-white'
                      : 'text-purple-600 hover:text-purple-800'
                  }`}
                >
                  Threads
                </Link>
              )}

              {/* Auth Section - Apple Style Unified Menu */}
              {loading ? (
                <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              ) : user && currentUser ? (
                // Apple-Style Unified Profile Area: Avatar + Arrow
                <div className="flex items-center space-x-1">
                  {/* Direct Profile Avatar */}
                  <button
                    onClick={() => navigate('/profile')}
                    className={`relative transition-all duration-200 hover:scale-105 rounded-full ${
                      theme === 'light'
                        ? 'hover:ring-2 hover:ring-primary-200'
                        : theme === 'dark'
                        ? 'hover:ring-2 hover:ring-gray-600'
                        : 'hover:ring-2 hover:ring-purple-200'
                    }`}
                    title="View Profile"
                  >
                    <UserAvatar
                      user={currentUser}
                      size="sm"
                    />
                    {/* Notification badge on avatar when present */}
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium ${
                        notifications.filter(n => !n.isRead).length > 9 ? 'text-[10px]' : ''
                      }`}>
                        {notifications.filter(n => !n.isRead).length > 9 ? '9+' : notifications.filter(n => !n.isRead).length}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Arrow */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={`p-1 rounded-lg transition-all duration-200 hover:scale-105 ${
                        theme === 'light'
                          ? 'hover:bg-gray-100'
                          : theme === 'dark'
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-purple-100'
                      }`}
                      title="Profile Options"
                    >
                      <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${
                        showUserMenu ? 'rotate-180' : ''
                      } ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-purple-600'
                      }`} />
                    </button>
                    
                    {showUserMenu && (
                      <div className={`absolute right-0 mt-2 w-72 rounded-xl shadow-xl z-50 overflow-hidden ${
                        theme === 'light'
                          ? 'bg-white border border-gray-200'
                          : theme === 'dark'
                          ? 'bg-gray-800 border border-gray-700'
                          : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
                      }`}>
                        {/* User Info Header */}
                        <div className={`px-4 py-3 border-b ${
                          theme === 'light'
                            ? 'border-gray-100'
                            : theme === 'dark'
                            ? 'border-gray-700'
                            : 'border-purple-100'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <UserAvatar user={currentUser} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                theme === 'light'
                                  ? 'text-gray-900'
                                  : theme === 'dark'
                                  ? 'text-white'
                                  : 'text-purple-900'
                              }`}>
                                {currentUser.displayName}
                              </p>
                              <p className={`text-xs truncate ${
                                theme === 'light'
                                  ? 'text-gray-500'
                                  : theme === 'dark'
                                  ? 'text-gray-400'
                                  : 'text-purple-500'
                              }`}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Apple-Style Notifications Section */}
                        {notifications.filter(n => !n.isRead).length > 0 && (
                          <div className={`px-0 py-0 border-b ${
                            theme === 'light'
                              ? 'border-gray-100'
                              : theme === 'dark'
                              ? 'border-gray-700'
                              : 'border-purple-100'
                          }`}>
                            {/* Section Header */}
                            <div className="px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <BellIcon className={`w-4 h-4 ${
                                  theme === 'light'
                                    ? 'text-gray-600'
                                    : theme === 'dark'
                                    ? 'text-gray-400'
                                    : 'text-purple-600'
                                }`} />
                                <h3 className={`text-sm font-medium ${
                                  theme === 'light'
                                    ? 'text-gray-900'
                                    : theme === 'dark'
                                    ? 'text-white'
                                    : 'text-purple-900'
                                }`}>
                                  Notifications
                                </h3>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  theme === 'light'
                                    ? 'bg-red-100 text-red-600'
                                    : theme === 'dark'
                                    ? 'bg-red-900 text-red-300'
                                    : 'bg-red-100 text-red-600'
                                }`}>
                                  {notifications.filter(n => !n.isRead).length}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  handleMarkAllAsRead();
                                  setShowUserMenu(false);
                                }}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                  theme === 'light'
                                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                                    : theme === 'dark'
                                    ? 'bg-blue-900 text-blue-300 hover:bg-blue-800'
                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                }`}
                              >
                                Mark all read
                              </button>
                            </div>

                            {/* Notification List */}
                            <div className="max-h-64 overflow-y-auto">
                              {notifications.filter(n => !n.isRead).slice(0, 4).map((notification, index) => {
                                // Determine notification type and icon
                                let NotificationIcon = ChatBubbleLeftIcon;
                                let iconColor = 'text-blue-500';
                                
                                if (notification.type === 'thread_reply') {
                                  NotificationIcon = ChatBubbleLeftEllipsisIcon;
                                  iconColor = 'text-blue-500';
                                } else if (notification.type === 'upvote_milestone') {
                                  NotificationIcon = ArrowUpIcon;
                                  iconColor = 'text-green-500';
                                } else if (notification.type === 'thread_activity') {
                                  NotificationIcon = HeartIcon;
                                  iconColor = 'text-red-500';
                                } else if (notification.type === 'thread_mention') {
                                  NotificationIcon = ChatBubbleLeftIcon;
                                  iconColor = 'text-purple-500';
                                } else if (notification.type === 'new_follower') {
                                  NotificationIcon = UserIcon;
                                  iconColor = 'text-indigo-500';
                                }

                                // Format timestamp
                                const timeAgo = new Date(notification.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                });

                                return (
                                  <button
                                    key={notification.id}
                                    onClick={() => {
                                      handleNotificationClick(notification);
                                      setShowUserMenu(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 transition-colors border-b last:border-b-0 ${
                                      theme === 'light'
                                        ? 'hover:bg-gray-50 border-gray-50'
                                        : theme === 'dark'
                                        ? 'hover:bg-gray-700 border-gray-700'
                                        : 'hover:bg-purple-25 border-purple-50'
                                    }`}
                                  >
                                    <div className="flex items-start space-x-3">
                                      {/* Notification Icon */}
                                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                        theme === 'light'
                                          ? 'bg-gray-100'
                                          : theme === 'dark'
                                          ? 'bg-gray-700'
                                          : 'bg-purple-100'
                                      }`}>
                                        <NotificationIcon className={`w-4 h-4 ${iconColor}`} />
                                      </div>

                                      {/* Content */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <p className={`text-sm font-medium truncate ${
                                            theme === 'light'
                                              ? 'text-gray-900'
                                              : theme === 'dark'
                                              ? 'text-white'
                                              : 'text-purple-900'
                                          }`}>
                                            {notification.title}
                                          </p>
                                          <span className={`text-xs ml-2 flex-shrink-0 ${
                                            theme === 'light'
                                              ? 'text-gray-500'
                                              : theme === 'dark'
                                              ? 'text-gray-400'
                                              : 'text-purple-500'
                                          }`}>
                                            {timeAgo}
                                          </span>
                                        </div>
                                        <p className={`text-sm mt-1 ${
                                          theme === 'light'
                                            ? 'text-gray-600'
                                            : theme === 'dark'
                                            ? 'text-gray-300'
                                            : 'text-purple-600'
                                        }`}>
                                          {notification.message}
                                        </p>
                                      </div>

                                      {/* Unread indicator */}
                                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                    </div>
                                  </button>
                                );
                              })}
                              
                              {/* Show more indicator */}
                              {notifications.filter(n => !n.isRead).length > 4 && (
                                <div className={`px-4 py-3 text-center ${
                                  theme === 'light'
                                    ? 'bg-gray-50'
                                    : theme === 'dark'
                                    ? 'bg-gray-700'
                                    : 'bg-purple-25'
                                }`}>
                                  <span className={`text-xs font-medium ${
                                    theme === 'light'
                                      ? 'text-gray-600'
                                      : theme === 'dark'
                                      ? 'text-gray-400'
                                      : 'text-purple-600'
                                  }`}>
                                    +{notifications.filter(n => !n.isRead).length - 4} more notifications
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Apple-Style Profile Actions */}
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/profile');
                              setShowUserMenu(false);
                            }}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                              theme === 'light'
                                ? 'text-gray-900 hover:bg-gray-50'
                                : theme === 'dark'
                                ? 'text-white hover:bg-gray-700'
                                : 'text-purple-900 hover:bg-purple-50'
                            }`}
                          >
                            <UserIcon className="w-5 h-5 mr-3" />
                            View Profile
                          </button>

                          {/* Apple-Style Theme Switcher */}
                          <div className={`flex items-center px-4 py-3 border-t ${
                            theme === 'light'
                              ? 'border-gray-100'
                              : theme === 'dark'
                              ? 'border-gray-700'
                              : 'border-purple-100'
                          }`}>
                            <div className="w-5 h-5 mr-3 flex items-center justify-center">
                              <div className="scale-75">
                                <ThemeSwitcher />
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${
                              theme === 'light'
                                ? 'text-gray-900'
                                : theme === 'dark'
                                ? 'text-white'
                                : 'text-purple-900'
                            }`}>
                              Theme
                            </span>
                          </div>
                          
                          {/* Apple-Style Sign Out */}
                          <button
                            onClick={handleSignOut}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors border-t ${
                              theme === 'light'
                                ? 'text-red-600 hover:bg-red-50 border-gray-100'
                                : theme === 'dark'
                                ? 'text-red-400 hover:bg-red-900/20 border-gray-700'
                                : 'text-red-600 hover:bg-red-50 border-purple-100'
                            }`}
                          >
                            <UserIcon className="w-5 h-5 mr-3" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal('signin')}
                  className={`btn transition-all duration-300 ${
                    theme === 'light'
                      ? 'btn-secondary'
                      : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none'
                  }`}
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t md:hidden transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white border-primary-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 border-purple-200'
      }`}>
        <div className="grid grid-cols-4 h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center transition-colors duration-300 ${
              isActive('/') 
                ? theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-700'
                : theme === 'light'
                ? 'text-primary-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}
          >
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link
            to="/books"
            className={`flex flex-col items-center justify-center transition-colors duration-300 ${
              isActive('/books') 
                ? theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-700'
                : theme === 'light'
                ? 'text-primary-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}
          >
            <BookOpenIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Books</span>
          </Link>
          {/* Threads navigation - hidden when feature flag is OFF */}
          {isEnabled('threads_feature_enabled') && (
            <Link
              to="/threads"
              className={`flex flex-col items-center justify-center transition-colors duration-300 ${
                isActive('/threads') 
                  ? theme === 'light'
                    ? 'text-primary-900'
                    : theme === 'dark'
                    ? 'text-white'
                    : 'text-purple-700'
                  : theme === 'light'
                  ? 'text-primary-600'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`}
            >
              <ChatBubbleLeftIcon className="w-6 h-6" />
              <span className="text-xs mt-1">Threads</span>
            </Link>
          )}
          <div className="flex flex-col items-center justify-center">
            <div className="scale-75">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
              <AuthModal
          isOpen={showAuthModal}
          onClose={hideAuthModal}
          initialMode={authMode}
        />

      {/* Profile Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={currentUser}
          onSave={handleProfileSave}
        />
      )}

      {/* Onboarding Modal - Only show if new contextual system is disabled */}
      {!flagsLoading && !isEnabled('contextual_recommendations_v1') && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}; 