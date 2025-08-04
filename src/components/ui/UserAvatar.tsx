import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { User } from '../../types';

interface UserAvatarProps {
  user: Pick<User, 'displayName' | 'username' | 'avatarUrl'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm', 
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
};

const statusSizeClasses = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showOnlineStatus = false,
  className = '',
  onClick
}) => {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);

  const displayName = user.displayName || user.username;
  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  const gradientColors = [
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600', 
    'from-pink-400 to-pink-600',
    'from-green-400 to-green-600',
    'from-yellow-400 to-yellow-600',
    'from-red-400 to-red-600',
    'from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600'
  ];

  // Generate consistent color based on username
  const colorIndex = user.username.charCodeAt(0) % gradientColors.length;
  const gradientColor = gradientColors[colorIndex];

  const handleImageError = () => {
    setImageError(true);
  };

  const avatarContent = user.avatarUrl && !imageError ? (
    <img
      src={user.avatarUrl}
      alt={`${displayName}'s avatar`}
      className="w-full h-full object-cover"
      onError={handleImageError}
    />
  ) : (
    <div className={`w-full h-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-medium`}>
      {initials}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          rounded-full overflow-hidden 
          transition-all duration-200 ease-out
          ${theme === 'light' 
            ? 'ring-2 ring-gray-100' 
            : theme === 'dark'
            ? 'ring-2 ring-gray-700'
            : 'ring-2 ring-purple-200'
          }
          ${onClick 
            ? `cursor-pointer hover:scale-105 hover:shadow-lg ${
                theme === 'light' 
                  ? 'hover:ring-primary-300' 
                  : theme === 'dark'
                  ? 'hover:ring-gray-500'
                  : 'hover:ring-purple-300'
              }` 
            : ''
          }
        `}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
      >
        {avatarContent}
      </div>

      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <div className={`
          absolute -bottom-0.5 -right-0.5 
          ${statusSizeClasses[size]}
          bg-green-500 rounded-full
          ${theme === 'light' 
            ? 'border-white' 
            : theme === 'dark'
            ? 'border-gray-800'
            : 'border-purple-100'
          }
        `} />
      )}
    </div>
  );
}; 