import React from 'react';
import { ChatBubbleLeftIcon, ArrowUpIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

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

  const handleClick = () => {
    navigate(`/threads/${id}`);
  };

  return (
    <div 
      className="card hover:shadow-md transition-shadow cursor-pointer" 
      onClick={handleClick}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-medium text-primary-900">{title}</h3>
          <button 
            className="btn btn-icon btn-ghost"
            onClick={(e) => {
              e.stopPropagation(); // Prevent thread navigation when clicking upvote
            }}
          >
            <ArrowUpIcon className="w-5 h-5" />
            <span className="text-sm">{upvotes}</span>
          </button>
        </div>

        {/* Description */}
        <p className="text-primary-600 line-clamp-2">{description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-primary-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span>{comments} comments</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{timestamp}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 