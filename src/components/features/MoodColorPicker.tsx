import React, { useState } from 'react';

interface MoodColorPickerProps {
  onMoodSelect: (mood: string) => void;
  selectedMood?: string;
}

interface MoodColor {
  mood: string;
  color: string;
  hoverColor: string;
  description: string;
  textColor: string;
}

export const MoodColorPicker = ({ onMoodSelect, selectedMood }: MoodColorPickerProps) => {
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);

  // Mood to color mapping with intuitive associations
  const moodColors: MoodColor[] = [
    {
      mood: 'Feeling overwhelmed',
      color: 'bg-slate-500',
      hoverColor: 'hover:bg-slate-600',
      description: 'Calm and grounding',
      textColor: 'text-white'
    },
    {
      mood: 'Need inspiration',
      color: 'bg-amber-400',
      hoverColor: 'hover:bg-amber-500',
      description: 'Bright and energizing',
      textColor: 'text-gray-900'
    },
    {
      mood: 'Want to escape',
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
      description: 'Dreamy and immersive',
      textColor: 'text-white'
    },
    {
      mood: 'Looking for adventure',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      description: 'Bold and exciting',
      textColor: 'text-white'
    },
    {
      mood: 'Feeling nostalgic',
      color: 'bg-amber-700',
      hoverColor: 'hover:bg-amber-800',
      description: 'Warm and reflective',
      textColor: 'text-white'
    },
    {
      mood: 'Want to learn',
      color: 'bg-emerald-500',
      hoverColor: 'hover:bg-emerald-600',
      description: 'Growth and knowledge',
      textColor: 'text-white'
    },
    {
      mood: 'Need a laugh',
      color: 'bg-yellow-400',
      hoverColor: 'hover:bg-yellow-500',
      description: 'Joyful and light',
      textColor: 'text-gray-900'
    },
    {
      mood: 'Feeling romantic',
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600',
      description: 'Tender and passionate',
      textColor: 'text-white'
    }
  ];

  const handleMoodClick = (mood: string) => {
    onMoodSelect(mood);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">
          How are you feeling?
        </h3>
        <p className="text-sm text-primary-600">
          Choose a color that matches your current mood
        </p>
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {moodColors.map((moodColor) => (
          <button
            key={moodColor.mood}
            onClick={() => handleMoodClick(moodColor.mood)}
            onMouseEnter={() => setHoveredMood(moodColor.mood)}
            onMouseLeave={() => setHoveredMood(null)}
            className={`
              relative group p-6 rounded-xl shadow-lg transition-all duration-300 transform
              ${moodColor.color} ${moodColor.hoverColor} ${moodColor.textColor}
              ${selectedMood === moodColor.mood 
                ? 'ring-4 ring-primary-500 ring-opacity-50 scale-105 shadow-xl' 
                : 'hover:scale-105 hover:shadow-xl'
              }
            `}
          >
            {/* Mood Label */}
            <div className="text-center">
              <div className="text-sm font-medium leading-tight mb-2">
                {moodColor.mood}
              </div>
              
              {/* Hover Description */}
              <div className={`
                text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200
                ${hoveredMood === moodColor.mood ? 'opacity-100' : ''}
              `}>
                {moodColor.description}
              </div>
            </div>

            {/* Selection Indicator */}
            {selectedMood === moodColor.mood && (
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-white rounded-full shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                </div>
              </div>
            )}

            {/* Ripple Effect */}
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-active:opacity-20 transition-opacity duration-150"></div>
          </button>
        ))}
      </div>

      {/* Current Selection Display */}
      {selectedMood && (
        <div className="text-center p-4 bg-primary-50 rounded-lg border border-primary-200">
          <div className="text-sm text-primary-600 mb-1">Selected mood:</div>
          <div className="font-medium text-primary-900">{selectedMood}</div>
          <button
            onClick={() => onMoodSelect('')}
            className="mt-2 text-xs text-primary-500 hover:text-primary-700 underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Color Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Color Guide:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-500 rounded"></div>
            <span>Calming (Gray/Blue)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded"></div>
            <span>Energizing (Yellow/Orange)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span>Growth (Green)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Exciting (Red)</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 