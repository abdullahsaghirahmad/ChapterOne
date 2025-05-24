import React, { useState } from 'react';
import { MoodColorPicker } from './MoodColorPicker';

export const MoodDemo = () => {
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    
    // Simulate search results based on mood
    const mockResults = {
      'Feeling overwhelmed': [
        'The Midnight Library - A calming exploration of life choices',
        'Educated - Finding peace through learning',
        'When Breath Becomes Air - Gentle wisdom about life'
      ],
      'Need inspiration': [
        'Atomic Habits - Small changes, big results',
        'The Alchemist - Follow your dreams',
        'Big Magic - Creative courage and inspiration'
      ],
      'Want to escape': [
        'The Name of the Wind - Epic fantasy adventure',
        'The Seven Moons of Maali Almeida - Magical realism',
        'Circe - Mythological transformation'
      ],
      'Looking for adventure': [
        'Ready Player One - Virtual reality quest',
        'The Martian - Survival on Mars',
        'Project Hail Mary - Space adventure'
      ],
      'Feeling nostalgic': [
        'A Man Called Ove - Heartwarming Swedish tale',
        'The Kite Runner - Childhood memories and redemption',
        'Where the Crawdads Sing - Coming of age in nature'
      ],
      'Want to learn': [
        'Sapiens - Brief history of humankind',
        'Thinking Fast and Slow - How we make decisions',
        'The Immortal Life of Henrietta Lacks - Science and ethics'
      ],
      'Need a laugh': [
        'The Hitchhiker\'s Guide to the Galaxy - Absurd space comedy',
        'Good Omens - Apocalyptic humor',
        'Yes Please - Amy Poehler\'s funny memoir'
      ],
      'Feeling romantic': [
        'The Seven Husbands of Evelyn Hugo - Hollywood romance',
        'Beach Read - Enemies to lovers',
        'The Time Traveler\'s Wife - Love across time'
      ]
    };

    if (mood && mockResults[mood as keyof typeof mockResults]) {
      setSearchResults(mockResults[mood as keyof typeof mockResults]);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-4">
          Mood-to-Color Search Interface
        </h1>
        <p className="text-lg text-primary-600 max-w-2xl mx-auto">
          Experience our revolutionary color-based mood selection. Choose colors that resonate with your current feeling and discover books that match your emotional state.
        </p>
      </div>

      {/* Demo Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mood Color Picker */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <MoodColorPicker 
            onMoodSelect={handleMoodSelect}
            selectedMood={selectedMood}
          />
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-4">
            Book Recommendations
          </h3>
          
          {selectedMood ? (
            <div>
              <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                <div className="text-sm text-primary-600">Selected mood:</div>
                <div className="font-medium text-primary-900">{selectedMood}</div>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-primary-800">Perfect matches for your mood:</h4>
                  {searchResults.map((result, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="text-sm text-gray-800">{result}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <div className="text-primary-600 mb-2">Select a mood color to see recommendations</div>
              <div className="text-sm text-primary-500">Each color represents a different emotional state</div>
            </div>
          )}
        </div>
      </div>

      {/* Features Highlight */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="text-3xl mb-3">🎯</div>
          <h4 className="font-semibold text-blue-900 mb-2">Intuitive Selection</h4>
          <p className="text-sm text-blue-700">Colors naturally match emotions - no more reading through lists</p>
        </div>
        
        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <div className="text-3xl mb-3">⚡</div>
          <h4 className="font-semibold text-green-900 mb-2">Faster Search</h4>
          <p className="text-sm text-green-700">Visual selection is 3x faster than text-based search</p>
        </div>
        
        <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <div className="text-3xl mb-3">🧠</div>
          <h4 className="font-semibold text-purple-900 mb-2">Better Matches</h4>
          <p className="text-sm text-purple-700">Color psychology ensures more accurate mood-to-book matching</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-6 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="font-semibold text-amber-900 mb-3">How to Test:</h4>
        <ol className="text-sm text-amber-800 space-y-2">
          <li>1. Click on any colored mood button that resonates with you</li>
          <li>2. Watch as the interface instantly shows books matching your emotional state</li>
          <li>3. Notice how colors make mood selection more intuitive and faster</li>
          <li>4. Try different moods to see how recommendations change</li>
        </ol>
        <div className="mt-4 text-xs text-amber-700">
          This is a preview of how the color-based search would work in the main app!
        </div>
      </div>
    </div>
  );
}; 