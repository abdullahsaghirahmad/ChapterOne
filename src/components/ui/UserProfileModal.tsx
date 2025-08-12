import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  XMarkIcon, 
  CameraIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import { UserAvatar } from './UserAvatar';
import { UserPreferencesService } from '../../services/userPreferences.service';
import { SavedBooksService } from '../../services/savedBooks.service';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updates: Partial<User>) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave
}) => {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: user.displayName || user.username,
    username: user.username,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    privacySettings: user.privacySettings || {
      profileVisible: true,
      readingActivityVisible: true
    },
    notificationSettings: user.notificationSettings || {
      emailNotifications: true,
      inAppNotifications: true,
      threadComments: true,
      threadMentions: true,
      digestFrequency: 'weekly' as const
    }
  });

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    error: string | null;
  }>({
    checking: false,
    available: null,
    error: null
  });

  // Character limits
  const BIO_LIMIT = 160;
  const DISPLAY_NAME_LIMIT = 50;

  useEffect(() => {
    if (isOpen) {
      setFormData({
        displayName: user.displayName || user.username,
        username: user.username,
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        privacySettings: user.privacySettings || {
          profileVisible: true,
          readingActivityVisible: true
        },
        notificationSettings: user.notificationSettings || {
          emailNotifications: true,
          inAppNotifications: true,
          threadComments: true,
          threadMentions: true,
          digestFrequency: 'weekly' as const
        }
      });
      setUsernameStatus({ checking: false, available: null, error: null });
    }
  }, [user, isOpen]);

  const generateAIBio = async () => {
    if (!authUser) return;
    
    setIsGeneratingBio(true);
    try {
      // Fetch user data for bio generation
      const [userPreferences, savedBooks] = await Promise.all([
        UserPreferencesService.getPreferences().catch(() => null),
        SavedBooksService.getSavedBooks().catch(() => [])
      ]);

      // Create AI prompt based on user data
      const favoriteGenres = userPreferences?.favoriteGenres || [];
      const preferredPace = userPreferences?.preferredPace || '';
      const bookCount = savedBooks.length;
      const recentGenres = savedBooks
        .slice(0, 5)
        .map(book => book.bookData.categories || [])
        .flat()
        .slice(0, 3);

      const prompt = `Generate a compelling, personalized bio for a book lover based on their reading profile. Keep it under 160 characters, engaging, and authentic.

User Profile:
- Favorite genres: ${favoriteGenres.join(', ') || 'Various'}
- Reading pace: ${preferredPace || 'Moderate'}
- Books saved: ${bookCount}
- Recent interests: ${recentGenres.join(', ') || 'Exploring new genres'}
- Username: ${user.username}

Style: Write in first person, enthusiastic but not overly excited. Focus on reading journey and interests. Examples:
- "Psychology and business enthusiast exploring the mind through books. Always hunting for the next life-changing read! 📚"
- "Sci-fi dreamer and fantasy explorer. Currently diving deep into climate fiction and loving every page. 🌟"

Generate only the bio text, no quotes or additional formatting:`;

      // Call LLM service for bio generation
      const response = await fetch('/api/llm/generate-bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Bio generation response:', data); // Debug log
        const generatedBio = data.bio?.trim() || '';
        
        if (generatedBio) {
          setFormData(prev => ({
            ...prev,
            bio: generatedBio
          }));
          console.log('Bio set successfully:', generatedBio); // Debug log
        } else {
          console.log('No bio in response, using fallback');
          throw new Error('Empty bio response');
        }
      } else {
        // Fallback to simple bio generation
        const fallbackBio = `Book enthusiast exploring ${favoriteGenres.slice(0, 2).join(' and ') || 'great stories'}. Always looking for the next compelling read! 📚`;
        setFormData(prev => ({
          ...prev,
          bio: fallbackBio.slice(0, BIO_LIMIT)
        }));
      }
    } catch (error) {
      // This is expected if there's a network issue - not a critical error
      // Silently fall back to a nice default bio
      const fallbackBios = [
        "Book enthusiast exploring great stories. Always looking for the next compelling read! 📚",
        "Passionate reader diving into new worlds through books ✨",
        "Bookworm with an endless appetite for knowledge and stories 📖",
        "Reader, thinker, and seeker of wisdom through the written word 🌟"
      ];
      const randomBio = fallbackBios[Math.floor(Math.random() * fallbackBios.length)];
      setFormData(prev => ({
        ...prev,
        bio: randomBio
      }));
    } finally {
      setIsGeneratingBio(false);
    }
  };

  // Username validation with debouncing
  const checkUsernameAvailability = async (username: string) => {
    if (username === user.username) {
      setUsernameStatus({ checking: false, available: true, error: null });
      return;
    }

    if (username.length < 3) {
      setUsernameStatus({ checking: false, available: false, error: 'Username must be at least 3 characters' });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus({ checking: false, available: false, error: 'Username can only contain letters, numbers, and underscores' });
      return;
    }

    setUsernameStatus({ checking: true, available: null, error: null });
    
    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();
      
      if (response.ok) {
        setUsernameStatus({ 
          checking: false, 
          available: data.available, 
          error: data.available ? null : 'Username is already taken' 
        });
      } else {
        setUsernameStatus({ 
          checking: false, 
          available: false, 
          error: data.message || 'Error checking username' 
        });
      }
    } catch (error) {
      setUsernameStatus({ 
        checking: false, 
        available: false, 
        error: 'Network error checking username' 
      });
    }
  };

  // Debounced username checking
  useEffect(() => {
    if (formData.username && formData.username !== user.username) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [formData.username, user.username]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(formData);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to your storage service
      // For now, we'll use a placeholder URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          avatarUrl: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = formData.displayName.trim().length > 0 && 
                       formData.username.trim().length >= 3 && 
                       (usernameStatus.available !== false) &&
                       !usernameStatus.checking;
  
  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    displayName: user.displayName || user.username,
    username: user.username,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    privacySettings: user.privacySettings || { profileVisible: true, readingActivityVisible: true },
    notificationSettings: user.notificationSettings || {
      emailNotifications: true,
      inAppNotifications: true,
      threadComments: true,
      threadMentions: true,
      digestFrequency: 'weekly' as const
    }
  });

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`
          relative w-full max-w-lg transform overflow-hidden rounded-2xl
          ${theme === 'light'
            ? 'bg-white'
            : theme === 'dark'
            ? 'bg-gray-800'
            : 'bg-gradient-to-br from-pink-50 to-purple-50'
          }
          p-6 shadow-2xl transition-all duration-300
        `}>
          {/* Success Overlay */}
          {showSuccess && (
            <div className="absolute inset-0 bg-green-500/90 rounded-2xl flex items-center justify-center z-10">
              <div className="text-center text-white">
                <CheckIcon className="w-12 h-12 mx-auto mb-2" />
                <p className="text-lg font-semibold">Profile Updated!</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-semibold ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${theme === 'light'
                  ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  : theme === 'dark'
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                  : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100'
                }
              `}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <UserAvatar
                user={{
                  username: user.username,
                  displayName: formData.displayName,
                  avatarUrl: formData.avatarUrl
                }}
                size="xl"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`
                  absolute -bottom-1 -right-1 p-2 rounded-full
                  ${theme === 'light'
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                  }
                  text-white shadow-lg transition-all duration-200 hover:scale-105
                `}
              >
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className={`text-sm mt-2 ${
              theme === 'light'
                ? 'text-gray-500'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}>
              Click to change avatar
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'light'
                  ? 'text-gray-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value.slice(0, DISPLAY_NAME_LIMIT) }))}
                className={`
                  w-full px-3 py-2 rounded-lg border transition-colors
                  ${theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-200'
                    : theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-200'
                    : 'bg-purple-50 border-purple-300 text-purple-900 focus:border-purple-500 focus:ring-purple-200'
                  }
                  focus:outline-none focus:ring-2
                `}
                placeholder="How should others see your name?"
              />
              <p className={`text-xs mt-1 ${
                theme === 'light'
                  ? 'text-gray-500'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`}>
                {formData.displayName.length}/{DISPLAY_NAME_LIMIT}
              </p>
            </div>

            {/* Username */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'light'
                  ? 'text-gray-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const username = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
                    setFormData(prev => ({ ...prev, username }));
                  }}
                  className={`
                    w-full px-3 py-2 pl-6 rounded-lg border transition-colors
                    ${theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-200'
                      : theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-200'
                      : 'bg-purple-50 border-purple-300 text-purple-900 focus:border-purple-500 focus:ring-purple-200'
                    }
                    ${usernameStatus.error ? 'border-red-500' : ''}
                    ${usernameStatus.available === true ? 'border-green-500' : ''}
                    focus:outline-none focus:ring-2
                  `}
                  placeholder="your_username"
                />
                <span className={`absolute left-2 top-1/2 transform -translate-y-1/2 text-sm ${
                  theme === 'light' ? 'text-gray-500' : theme === 'dark' ? 'text-gray-400' : 'text-purple-500'
                }`}>
                  @
                </span>
                {usernameStatus.checking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                )}
                {usernameStatus.available === true && !usernameStatus.checking && (
                  <CheckIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {usernameStatus.error && (
                <p className="text-xs mt-1 text-red-500">
                  {usernameStatus.error}
                </p>
              )}
              {usernameStatus.available === true && !usernameStatus.checking && (
                <p className="text-xs mt-1 text-green-500">
                  Username is available!
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${
                  theme === 'light'
                    ? 'text-gray-700'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-purple-700'
                }`}>
                  Bio
                </label>
                <button
                  type="button"
                  onClick={generateAIBio}
                  disabled={isGeneratingBio}
                  className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                    isGeneratingBio
                      ? 'opacity-50 cursor-not-allowed'
                      : theme === 'light'
                      ? 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                      : theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700'
                      : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <SparklesIcon className="w-3 h-3" />
                  <span>{isGeneratingBio ? 'Generating...' : 'AI Generate'}</span>
                </button>
              </div>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, BIO_LIMIT) }))}
                rows={3}
                className={`
                  w-full px-3 py-2 rounded-lg border transition-colors resize-none
                  ${theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-200'
                    : theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-200'
                    : 'bg-purple-50 border-purple-300 text-purple-900 focus:border-purple-500 focus:ring-purple-200'
                  }
                  focus:outline-none focus:ring-2
                `}
                placeholder="Tell others about your reading interests..."
              />
              <p className={`text-xs mt-1 ${
                theme === 'light'
                  ? 'text-gray-500'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`}>
                {formData.bio.length}/{BIO_LIMIT}
              </p>
            </div>


          </div>

          {/* Error Message */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p className="text-sm">{saveError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className={`
                flex-1 py-2 px-4 rounded-lg font-medium transition-colors
                ${theme === 'light'
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : theme === 'dark'
                  ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  : 'bg-purple-200 hover:bg-purple-300 text-purple-700'
                }
              `}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isFormValid || !hasChanges || isSaving}
              className={`
                flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200
                ${isFormValid && hasChanges && !isSaving
                  ? theme === 'light'
                    ? 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-105'
                    : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                    : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}; 