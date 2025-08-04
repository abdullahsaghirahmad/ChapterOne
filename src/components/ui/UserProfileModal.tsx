import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  XMarkIcon, 
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { User } from '../../types';
import { UserAvatar } from './UserAvatar';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: user.displayName || user.username,
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

  // Character limits
  const BIO_LIMIT = 160;
  const DISPLAY_NAME_LIMIT = 50;

  useEffect(() => {
    if (isOpen) {
      setFormData({
        displayName: user.displayName || user.username,
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
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
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

  const isFormValid = formData.displayName.trim().length > 0;
  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    displayName: user.displayName || user.username,
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

            {/* Bio */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'light'
                  ? 'text-gray-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                Bio
              </label>
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

            {/* Privacy Settings */}
            <div>
              <h3 className={`text-sm font-medium mb-3 ${
                theme === 'light'
                  ? 'text-gray-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                Privacy Settings
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-600'
                  }`}>
                    Public profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      privacySettings: {
                        ...prev.privacySettings,
                        profileVisible: !prev.privacySettings.profileVisible
                      }
                    }))}
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:scale-105
                      ${formData.privacySettings.profileVisible
                        ? theme === 'light'
                          ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                          : theme === 'dark'
                          ? 'text-blue-400 bg-blue-900/30 hover:bg-blue-900/50'
                          : 'text-purple-600 bg-purple-100 hover:bg-purple-200'
                        : theme === 'light'
                        ? 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                        : theme === 'dark'
                        ? 'text-gray-500 bg-gray-700 hover:bg-gray-600'
                        : 'text-gray-400 bg-purple-50 hover:bg-purple-100'
                      }
                    `}
                    title={formData.privacySettings.profileVisible ? 'Profile is public' : 'Profile is private'}
                  >
                    {formData.privacySettings.profileVisible ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : theme === 'dark'
                      ? 'text-gray-300'
                      : 'text-purple-600'
                  }`}>
                    Show reading activity
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      privacySettings: {
                        ...prev.privacySettings,
                        readingActivityVisible: !prev.privacySettings.readingActivityVisible
                      }
                    }))}
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:scale-105
                      ${formData.privacySettings.readingActivityVisible
                        ? theme === 'light'
                          ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                          : theme === 'dark'
                          ? 'text-blue-400 bg-blue-900/30 hover:bg-blue-900/50'
                          : 'text-purple-600 bg-purple-100 hover:bg-purple-200'
                        : theme === 'light'
                        ? 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                        : theme === 'dark'
                        ? 'text-gray-500 bg-gray-700 hover:bg-gray-600'
                        : 'text-gray-400 bg-purple-50 hover:bg-purple-100'
                      }
                    `}
                    title={formData.privacySettings.readingActivityVisible ? 'Reading activity is visible' : 'Reading activity is hidden'}
                  >
                    {formData.privacySettings.readingActivityVisible ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

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