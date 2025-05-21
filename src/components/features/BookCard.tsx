import React from 'react';
import { BookOpenIcon, ClockIcon, HeartIcon, BookmarkIcon, CloudIcon } from '@heroicons/react/24/outline';
import { Pace } from '../../types';

interface BookCardProps {
  title: string;
  author: string;
  coverImage?: string;
  pace?: Pace | { type: string; value: string };
  tone?: (string | { type: string; value: string })[];
  themes?: (string | { type: string; value: string })[];
  description?: string;
  bestFor?: string[];
  isExternal?: boolean;
}

export const BookCard = ({
  title,
  author,
  coverImage = 'https://via.placeholder.com/150x225?text=No+Cover',
  pace = 'Moderate',
  tone = [],
  themes = [],
  description = 'No description available',
  bestFor = [],
  isExternal = false,
}: BookCardProps) => {
  // Helper function to extract value from string or object
  const getValue = (item: string | { type: string; value: string }): string => {
    if (typeof item === 'object' && item !== null) {
      return item.value;
    }
    return item;
  };

  // Process the pace value
  const paceString = getValue(pace as (string | { type: string; value: string }));

  // Process tone and themes arrays
  const processedTone = tone.map(t => getValue(t));
  const processedThemes = themes.map(t => getValue(t));

  return (
    <div className={`card hover:shadow-md transition-shadow ${isExternal ? 'border-blue-200' : ''}`}>
      <div className="flex gap-4">
        {/* Book Cover */}
        <div className="w-24 h-36 flex-shrink-0 relative">
          <img
            src={coverImage}
            alt={`${title} cover`}
            className="w-full h-full object-cover rounded-lg"
          />
          {isExternal && (
            <div className="absolute top-0 right-0 bg-blue-500 text-white p-1 rounded-bl-lg rounded-tr-lg">
              <CloudIcon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold">{title}</h3>
            {isExternal && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                External
              </span>
            )}
          </div>
          <p className="text-primary-600 mb-2">{author}</p>

          {/* Quick Tags */}
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="w-4 h-4 text-primary-500" />
            <span className="text-sm text-primary-600">{paceString} paced</span>
          </div>

          {/* Tone & Themes */}
          {(processedTone.length > 0 || processedThemes.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {processedTone.map((t) => (
                <span key={t} className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                  {t}
                </span>
              ))}
              {processedThemes.map((theme) => (
                <span key={theme} className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-primary-700 mb-2 line-clamp-2">{description}</p>

          {/* Best For */}
          {bestFor.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {bestFor.map((scenario) => (
                <span key={scenario} className="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full">
                  {scenario}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary text-sm">
              <BookOpenIcon className="w-4 h-4 mr-1" />
              Read
            </button>
            {!isExternal && (
              <>
                <button className="btn btn-secondary text-sm">
                  <BookmarkIcon className="w-4 h-4 mr-1" />
                  Save
                </button>
                <button className="btn btn-secondary text-sm">
                  <HeartIcon className="w-4 h-4" />
                </button>
              </>
            )}
            {isExternal && (
              <button className="btn btn-secondary text-sm">
                <BookmarkIcon className="w-4 h-4 mr-1" />
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 