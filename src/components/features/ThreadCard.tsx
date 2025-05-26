import React from 'react';
import { ChatBubbleLeftIcon, ArrowUpIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

export interface ThreadCardProps {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  comments: number;
  timestamp: string;
  tags: string[];
}

export const ThreadCard = ({
  id,
  title,
  description,
  upvotes,
  comments,
  timestamp,
  tags,
}: ThreadCardProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleClick = () => {
    navigate(`/threads/${id}`);
  };

  return (
    <div 
      className={`transition-all duration-300 hover:shadow-lg cursor-pointer rounded-lg p-6 h-full flex flex-col ${
        theme === 'light'
          ? 'bg-white border border-gray-200 hover:border-primary-300'
          : theme === 'dark'
          ? 'bg-gray-800 border border-gray-700 hover:border-gray-600'
          : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-200 hover:border-purple-300'
      }`}
      onClick={handleClick}
    >
      {/* Header with title and upvote */}
      <div className="flex items-start justify-between mb-3">
        <h3 className={`text-lg font-medium leading-tight flex-1 pr-3 transition-colors duration-300 ${
          theme === 'light'
            ? 'text-primary-900'
            : theme === 'dark'
            ? 'text-white'
            : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
        }`}>
          {title}
        </h3>
        <button 
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 hover:scale-105 flex-shrink-0 ${
            theme === 'light'
              ? 'text-primary-600 hover:bg-primary-50 hover:text-primary-700'
              : theme === 'dark'
              ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              : 'text-purple-600 hover:bg-purple-100 hover:text-purple-700'
          }`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent thread navigation when clicking upvote
          }}
        >
          <ArrowUpIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{upvotes}</span>
        </button>
      </div>

      {/* Description */}
      <p className={`text-sm line-clamp-2 mb-4 flex-1 transition-colors duration-300 ${
        theme === 'light'
          ? 'text-gray-600'
          : theme === 'dark'
          ? 'text-gray-300'
          : 'text-purple-600'
      }`}>
        {description}
      </p>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-1 text-xs rounded-full transition-colors duration-300 ${
                  theme === 'light'
                    ? 'bg-primary-100 text-primary-700'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gradient-to-r from-pink-200 to-purple-200 text-purple-800'
                }`}
              >
                {tag}
              </span>
            ))}
            {tags.length > 5 && (
              <span className={`px-2 py-1 text-xs rounded-full transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-gray-100 text-gray-500'
                  : theme === 'dark'
                  ? 'bg-gray-600 text-gray-400'
                  : 'bg-purple-100 text-purple-500'
              }`}>
                +{tags.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer with comments and date */}
      <div className={`flex items-center justify-between text-sm pt-3 border-t transition-colors duration-300 ${
        theme === 'light'
          ? 'border-gray-200 text-gray-500'
          : theme === 'dark'
          ? 'border-gray-600 text-gray-400'
          : 'border-purple-200 text-purple-500'
      }`}>
        <div className="flex items-center gap-1">
          <ChatBubbleLeftIcon className="w-4 h-4" />
          <span>{comments} comments</span>
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className="w-4 h-4" />
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
}; 