import React, { useState, useEffect } from 'react';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { ThreadFollowService } from '../../services/threadFollow.service';

interface ThreadFollowButtonProps {
  threadId: string;
  onFollowChange?: (isFollowing: boolean, followerCount: number) => void;
  showFollowerCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export const ThreadFollowButton: React.FC<ThreadFollowButtonProps> = ({
  threadId,
  onFollowChange,
  showFollowerCount = true,
  size = 'md',
  variant = 'default',
  className = ''
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    md: {
      button: 'px-4 py-2 text-sm',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    lg: {
      button: 'px-6 py-3 text-base',
      icon: 'w-6 h-6',
      text: 'text-base'
    }
  };

  // Load initial follow status and count
  useEffect(() => {
    if (!user || !threadId) return;

    const loadFollowData = async () => {
      try {
        setIsLoading(true);
        const [followStatus, count] = await Promise.all([
          ThreadFollowService.isFollowing(threadId, user.id),
          ThreadFollowService.getFollowerCount(threadId)
        ]);
        
        setIsFollowing(followStatus);
        setFollowerCount(count);
        setError(null);
      } catch (err) {
        console.error('Error loading follow data:', err);
        setError('Failed to load follow status');
      } finally {
        setIsLoading(false);
      }
    };

    loadFollowData();
  }, [threadId, user]);

  const handleToggleFollow = async () => {
    if (isLoading) return;

    // Show sign-in modal for anonymous users
    if (!user) {
      showAuthModal('signup'); // Use signup to encourage new users
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const newFollowStatus = await ThreadFollowService.toggleFollow(threadId, user.id);
      const newCount = await ThreadFollowService.getFollowerCount(threadId);
      
      setIsFollowing(newFollowStatus);
      setFollowerCount(newCount);
      
      onFollowChange?.(newFollowStatus, newCount);
    } catch (err) {
      console.error('Error toggling follow:', err);
      setError('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  const IconComponent = isFollowing ? HeartIconSolid : HeartIconOutline;

  const getButtonClasses = () => {
    const baseClasses = `
      ${sizeClasses[size].button}
      inline-flex items-center gap-2 font-medium rounded-xl
      transition-all duration-200 ease-out hover:scale-105 active:scale-95
      focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
    `;

    if (isFollowing) {
      return `${baseClasses} ${
        theme === 'light'
          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 focus:ring-red-500'
          : theme === 'dark'
          ? 'bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50 focus:ring-red-500'
          : 'bg-gradient-to-r from-pink-100 to-red-100 text-red-600 border border-red-200 hover:from-pink-200 hover:to-red-200 focus:ring-red-500'
      }`;
    } else {
      return `${baseClasses} ${
        theme === 'light'
          ? 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 focus:ring-primary-500'
          : theme === 'dark'
          ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 focus:ring-blue-500'
          : 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-pink-100 focus:ring-purple-500'
      }`;
    }
  };

  const renderContent = () => {
    const buttonText = !user ? 'Follow' : (isFollowing ? 'Following' : 'Follow');
    
    if (variant === 'icon-only') {
      return (
        <IconComponent 
          className={`${sizeClasses[size].icon} ${isLoading ? 'animate-pulse' : ''}`}
        />
      );
    }

    return (
      <>
        <IconComponent 
          className={`${sizeClasses[size].icon} ${isLoading ? 'animate-pulse' : ''}`}
        />
        {variant !== 'compact' && (
          <span className={sizeClasses[size].text}>
            {buttonText}
          </span>
        )}
        {showFollowerCount && followerCount > 0 && (
          <span className={`${sizeClasses[size].text} opacity-75`}>
            {followerCount}
          </span>
        )}
      </>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleToggleFollow}
        disabled={isLoading}
        className={getButtonClasses()}
        title={
          !user
            ? `Sign in to follow this thread and get notified of new discussions${showFollowerCount && followerCount > 0 ? ` (${followerCount} followers)` : ''}`
            : isFollowing 
            ? `Unfollow this thread${showFollowerCount && followerCount > 0 ? ` (${followerCount} followers)` : ''}`
            : `Follow this thread${showFollowerCount && followerCount > 0 ? ` (${followerCount} followers)` : ''}`
        }
        aria-label={
          !user
            ? `Sign in to follow thread (${followerCount} followers)`
            : isFollowing 
            ? `Unfollow thread (${followerCount} followers)`
            : `Follow thread (${followerCount} followers)`
        }
      >
        {renderContent()}
      </button>

      {/* Error tooltip */}
      {error && (
        <div className={`
          absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 
          text-xs rounded-lg shadow-lg z-50 whitespace-nowrap
          ${theme === 'light'
            ? 'bg-red-100 text-red-700 border border-red-200'
            : theme === 'dark'
            ? 'bg-red-900 text-red-300 border border-red-800'
            : 'bg-red-100 text-red-700 border border-red-200'
          }
        `}>
          {error}
        </div>
      )}

      {/* Follower count tooltip for icon-only variant */}
      {variant === 'icon-only' && showFollowerCount && followerCount > 0 && (
        <div className={`
          absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5
          text-xs font-bold rounded-full flex items-center justify-center
          ${theme === 'light'
            ? 'bg-primary-500 text-white'
            : theme === 'dark'
            ? 'bg-blue-500 text-white'
            : 'bg-purple-500 text-white'
          }
        `}>
          {followerCount > 99 ? '99+' : followerCount}
        </div>
      )}
    </div>
  );
};