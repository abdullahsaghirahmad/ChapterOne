import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

export type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: ToastType;
  duration?: number;
  actions?: ToastAction[];
}

export const Toast: React.FC<ToastProps> = ({
  isOpen,
  onClose,
  message,
  type = 'success',
  duration = 3000,
  actions = [],
}) => {
  const { theme } = useTheme();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const toastContent = (
    <div className="fixed top-4 right-4 z-[10000] max-w-sm">
      <div className={`flex items-center p-4 rounded-lg shadow-lg border backdrop-blur-sm transform transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white/90 border-gray-200'
          : theme === 'dark'
          ? 'bg-gray-800/90 border-gray-600'
          : 'bg-white/90 border-purple-200'
      }`}>
        {/* Icon */}
        <div className="flex-shrink-0 mr-3">
          {type === 'success' && (
            <CheckCircleIcon className={`w-6 h-6 ${
              theme === 'light'
                ? 'text-green-500'
                : theme === 'dark'
                ? 'text-green-400'
                : 'text-green-500'
            }`} />
          )}
          {type === 'error' && (
            <XCircleIcon className={`w-6 h-6 ${
              theme === 'light'
                ? 'text-red-500'
                : theme === 'dark'
                ? 'text-red-400'
                : 'text-red-500'
            }`} />
          )}
        </div>

        {/* Message and Actions */}
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            theme === 'light'
              ? 'text-gray-900'
              : theme === 'dark'
              ? 'text-white'
              : 'text-purple-900'
          }`}>
            {message}
          </p>
          
          {/* Action Buttons */}
          {actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    action.variant === 'primary'
                      ? theme === 'light'
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : theme === 'dark'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                      : theme === 'light'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`flex-shrink-0 ml-3 p-1 rounded-lg transition-colors ${
            theme === 'light'
              ? 'hover:bg-gray-100 text-gray-500'
              : theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400'
              : 'hover:bg-purple-100 text-purple-600'
          }`}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return createPortal(toastContent, document.body);
};