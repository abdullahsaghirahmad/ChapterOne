import React, { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { NotificationCenter } from './NotificationCenter';
import { Notification } from '../../types';

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
  onNotificationClick: (notification: Notification) => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onNotificationClick,
  className = ''
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Animate bell on new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotifications(true);
      const timer = setTimeout(() => setHasNewNotifications(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className={`
          relative p-2 rounded-xl transition-all duration-200 ease-out
          ${theme === 'light'
            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            : theme === 'dark'
            ? 'text-gray-400 hover:text-white hover:bg-gray-700'
            : 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'
          }
          ${isOpen 
            ? theme === 'light'
              ? 'bg-primary-100 text-primary-700'
              : theme === 'dark'
              ? 'bg-gray-700 text-white'
              : 'bg-purple-100 text-purple-700'
            : ''
          }
          ${hasNewNotifications ? 'animate-bounce' : ''}
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${theme === 'light'
            ? 'focus:ring-primary-500'
            : theme === 'dark'
            ? 'focus:ring-blue-500'
            : 'focus:ring-purple-500'
          }
        `}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon className="w-5 h-5" />
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <div className={`
            absolute -top-1 -right-1 min-w-[18px] h-[18px] 
            bg-red-500 text-white text-xs font-bold
            rounded-full flex items-center justify-center
            transform transition-all duration-200
            ${hasNewNotifications ? 'scale-110' : 'scale-100'}
            ring-2 ring-white
          `}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* New notification pulse */}
        {hasNewNotifications && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-400 rounded-full animate-ping" />
        )}
      </button>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onDeleteNotification={onDeleteNotification}
        onNotificationClick={(notification) => {
          onNotificationClick(notification);
          setIsOpen(false); // Close panel after clicking notification
        }}
      />
    </div>
  );
}; 