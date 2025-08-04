import React, { useState, useEffect, useRef } from 'react';
import { 
  BellIcon, 
  XMarkIcon, 
  ChatBubbleLeftIcon, 
  ArrowUpIcon,
  UserIcon,
  BookOpenIcon,
  CheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { Notification, NotificationType } from '../../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
  onNotificationClick: (notification: Notification) => void;
}

const getNotificationIcon = (type: NotificationType, theme: string) => {
  const iconClass = `w-5 h-5 ${
    theme === 'light' 
      ? 'text-primary-600' 
      : theme === 'dark'
      ? 'text-blue-400'
      : 'text-purple-600'
  }`;

  switch (type) {
    case 'thread_activity':
    case 'thread_reply':
      return <ChatBubbleLeftIcon className={iconClass} />;
    case 'upvote_milestone':
      return <ArrowUpIcon className={iconClass} />;
    case 'thread_mention':
      return <UserIcon className={iconClass} />;
    case 'reading_recommendation':
      return <BookOpenIcon className={iconClass} />;
    default:
      return <BellIcon className={iconClass} />;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'thread_activity':
    case 'thread_reply':
      return 'from-blue-500 to-blue-600';
    case 'upvote_milestone':
      return 'from-green-500 to-green-600';
    case 'thread_mention':
      return 'from-purple-500 to-purple-600';
    case 'reading_recommendation':
      return 'from-orange-500 to-orange-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onNotificationClick
}) => {
  const { theme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const [groupedNotifications, setGroupedNotifications] = useState<{[key: string]: Notification[]}>({});

  useEffect(() => {
    // Group notifications by date
    const grouped = notifications.reduce((acc, notification) => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      }

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(notification);
      return acc;
    }, {} as {[key: string]: Notification[]});

    setGroupedNotifications(grouped);
  }, [notifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-200" />
      
      {/* Notification Panel */}
      <div
        ref={panelRef}
        className={`
          fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)]
          ${theme === 'light'
            ? 'bg-white border border-gray-200'
            : theme === 'dark'
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200'
          }
          rounded-2xl shadow-2xl z-50
          transform transition-all duration-300 ease-out
          ${isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}
        `}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b
          ${theme === 'light'
            ? 'border-gray-100'
            : theme === 'dark'
            ? 'border-gray-700'
            : 'border-purple-100'
          }
        `}>
          <div className="flex items-center space-x-2">
            <h2 className={`text-lg font-semibold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className={`
                  text-sm font-medium px-3 py-1 rounded-lg transition-all duration-200
                  ${theme === 'light'
                    ? 'text-primary-600 hover:bg-primary-50'
                    : theme === 'dark'
                    ? 'text-blue-400 hover:bg-gray-700'
                    : 'text-purple-600 hover:bg-purple-100'
                  }
                `}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className={`
                p-1 rounded-lg transition-all duration-200
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
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-96">
          {Object.keys(groupedNotifications).length === 0 ? (
            <div className="p-8 text-center">
              <BellIcon className={`w-12 h-12 mx-auto mb-3 ${
                theme === 'light'
                  ? 'text-gray-300'
                  : theme === 'dark'
                  ? 'text-gray-600'
                  : 'text-purple-300'
              }`} />
              <p className={`text-sm ${
                theme === 'light'
                  ? 'text-gray-500'
                  : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-purple-500'
              }`}>
                No notifications yet
              </p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
              <div key={dateKey}>
                {/* Date Header */}
                <div className={`
                  sticky top-0 px-4 py-2 text-xs font-medium
                  ${theme === 'light'
                    ? 'bg-gray-50 text-gray-600'
                    : theme === 'dark'
                    ? 'bg-gray-900 text-gray-400'
                    : 'bg-purple-50 text-purple-600'
                  }
                `}>
                  {dateKey}
                </div>

                {/* Notifications for this date */}
                {dateNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      relative p-4 border-b transition-all duration-200
                      ${theme === 'light'
                        ? 'border-gray-100 hover:bg-gray-50'
                        : theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-750'
                        : 'border-purple-100 hover:bg-purple-50'
                      }
                      ${!notification.isRead ? 'bg-opacity-50' : ''}
                      cursor-pointer group
                    `}
                    onClick={() => onNotificationClick(notification)}
                  >
                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                    )}

                    <div className="flex space-x-3">
                      {/* Icon */}
                      <div className={`
                        flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${getNotificationColor(notification.type)}
                        flex items-center justify-center
                      `}>
                        {getNotificationIcon(notification.type, theme)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          theme === 'light'
                            ? 'text-gray-900'
                            : theme === 'dark'
                            ? 'text-white'
                            : 'text-purple-900'
                        }`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className={`text-sm mt-1 ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : theme === 'dark'
                              ? 'text-gray-300'
                              : 'text-purple-600'
                          }`}>
                            {notification.message}
                          </p>
                        )}
                        <p className={`text-xs mt-1 ${
                          theme === 'light'
                            ? 'text-gray-400'
                            : theme === 'dark'
                            ? 'text-gray-500'
                            : 'text-purple-400'
                        }`}>
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notification.id);
                            }}
                            className={`
                              p-1 rounded transition-colors
                              ${theme === 'light'
                                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                : theme === 'dark'
                                ? 'text-gray-500 hover:text-green-400 hover:bg-green-900/30'
                                : 'text-purple-400 hover:text-green-600 hover:bg-green-100'
                              }
                            `}
                            title="Mark as read"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNotification(notification.id);
                          }}
                          className={`
                            p-1 rounded transition-colors
                            ${theme === 'light'
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : theme === 'dark'
                              ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/30'
                              : 'text-purple-400 hover:text-red-600 hover:bg-red-100'
                            }
                          `}
                          title="Delete notification"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}; 