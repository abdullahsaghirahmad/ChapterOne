import React, { useState } from 'react';
import { 
  BookOpenIcon, 
  ClockIcon, 
  HeartIcon, 
  BookmarkIcon, 
  CloudIcon, 
  BoltIcon,
  FireIcon,
  LightBulbIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
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
  const [imgError, setImgError] = useState(false);
  
  // Helper function to extract value from string or object
  const getValue = (item: string | { type: string; value: string } | any): string => {
    if (!item) return '';
    
    // Handle object with value property
    if (typeof item === 'object' && item !== null) {
      if ('value' in item) return item.value;
    }
    
    // Handle stringified object that looks like "{""value"": ""theme""}"
    if (typeof item === 'string' && item.includes('{""') && item.includes('""value""')) {
      try {
        // Try to extract value between quotes
        const match = item.match(/""value""\s*:\s*""([^""]+)""/);
        if (match && match[1]) {
          return match[1];
        }
      } catch (e) {
        // Just return original if extraction fails
      }
    }
    
    // If it's just a string, return it
    return String(item);
  };

  // Create a safer fallback image URL - using a data URI for absolute reliability
  const fallbackCoverImage = `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22225%22%20viewBox%3D%220%200%20150%20225%22%20fill%3D%22none%22%3E%3Crect%20width%3D%22150%22%20height%3D%22225%22%20fill%3D%22%23E2E8F0%22%2F%3E%3Ctext%20x%3D%2275%22%20y%3D%22112.5%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%231E293B%22%20text-anchor%3D%22middle%22%3E${encodeURIComponent(title || 'No Cover')}%3C%2Ftext%3E%3C%2Fsvg%3E`;
  
  // Sanitize the cover image URL
  const sanitizedCoverImage = 
    (!coverImage || coverImage === 'undefined' || imgError) 
      ? fallbackCoverImage 
      : coverImage;

  // Process the pace value
  const paceString = getValue(pace as (string | { type: string; value: string } | any));

  // Get the appropriate pace icon based on the pace value
  const getPaceIcon = () => {
    const normalizedPace = paceString.toLowerCase();
    
    if (normalizedPace.includes('very fast') || normalizedPace.includes('veryfast')) {
      return <FireIcon className="w-4 h-4 text-red-500" />;
    } else if (normalizedPace.includes('fast')) {
      return <BoltIcon className="w-4 h-4 text-yellow-500" />;
    } else if (normalizedPace.includes('very slow') || normalizedPace.includes('veryslow')) {
      return <SparklesIcon className="w-4 h-4 text-green-600" />;
    } else if (normalizedPace.includes('slow')) {
      return <LightBulbIcon className="w-4 h-4 text-blue-500" />;
    } else {
      // Default "moderate" pace
      return <ClockIcon className="w-4 h-4 text-primary-500" />;
    }
  };

  // Process tone and themes arrays making sure they are properly rendered
  const processedTone = Array.isArray(tone) 
    ? tone.map(t => getValue(t))
    : typeof tone === 'string' 
      ? [tone]
      : [];

  const processedThemes = Array.isArray(themes) 
    ? themes.map(t => getValue(t))
    : typeof themes === 'string'
      ? [themes]
      : [];

  return (
    <div className={`card hover:shadow-md transition-shadow ${isExternal ? 'border-blue-200' : ''}`}>
      <div className="flex gap-4">
        {/* Book Cover */}
        <div className="w-24 h-36 flex-shrink-0 relative">
          <img
            src={sanitizedCoverImage}
            alt={`${title} cover`}
            className="w-full h-full object-cover rounded-lg bg-gray-200"
            onError={() => setImgError(true)}
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

          {/* Quick Tags with Dynamic Pace Icon */}
          <div className="flex items-center gap-2 mb-2">
            {getPaceIcon()}
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