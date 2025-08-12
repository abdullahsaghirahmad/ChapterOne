import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ContextEncoderService } from '../../services/contextEncoder.service';

interface UserContext {
  mood: string;
  situation: string; 
  goal: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

const MOOD_OPTIONS = [
  { id: 'motivated', label: 'Motivated', icon: '💪', description: 'Ready to tackle challenges' },
  { id: 'curious', label: 'Curious', icon: '🤔', description: 'Want to learn something new' },
  { id: 'relaxed', label: 'Relaxed', icon: '😌', description: 'Looking for something peaceful' },
  { id: 'adventurous', label: 'Adventurous', icon: '🌟', description: 'Seeking excitement' },
  { id: 'nostalgic', label: 'Nostalgic', icon: '📚', description: 'In a reflective mood' },
  { id: 'focused', label: 'Focused', icon: '🎯', description: 'Ready for deep thinking' }
];

const SITUATION_OPTIONS = [
  { id: 'commuting', label: 'Commuting', icon: '🚊' },
  { id: 'before_bed', label: 'Before Bed', icon: '🌙' },
  { id: 'weekend', label: 'Weekend Reading', icon: '☕' },
  { id: 'lunch_break', label: 'Lunch Break', icon: '🍽️' },
  { id: 'traveling', label: 'Traveling', icon: '✈️' },
  { id: 'studying', label: 'Study Session', icon: '📖' }
];

const GOAL_OPTIONS = [
  { id: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { id: 'learning', label: 'Learning', icon: '🧠' },
  { id: 'professional', label: 'Professional Growth', icon: '💼' },
  { id: 'inspiration', label: 'Inspiration', icon: '✨' },
  { id: 'relaxation', label: 'Relaxation', icon: '🌸' },
  { id: 'perspective', label: 'New Perspective', icon: '🔄' }
];

export const ReadingContextPreferences: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  // Load user context from localStorage
  const [userContext, setUserContext] = useState<UserContext>(() => {
    const loadedContext = ContextEncoderService.loadContext(user?.id);
    if (loadedContext) {
      return {
        mood: loadedContext.mood || '',
        situation: loadedContext.situation || '',
        goal: loadedContext.goal || '',
        timeOfDay: loadedContext.timeOfDay as 'morning' | 'afternoon' | 'evening' | 'night'
      };
    }
    
    return {
      mood: '',
      situation: '',
      goal: '',
      timeOfDay: ContextEncoderService.getCurrentTimeOfDay() as 'morning' | 'afternoon' | 'evening' | 'night'
    };
  });

  const handleContextChange = (type: keyof UserContext, value: string) => {
    const newContext = { ...userContext, [type]: value };
    setUserContext(newContext);
    ContextEncoderService.saveContext(newContext, user?.id);
  };

  const clearAllContext = () => {
    const newContext = {
      mood: '',
      situation: '',
      goal: '',
      timeOfDay: ContextEncoderService.getCurrentTimeOfDay() as 'morning' | 'afternoon' | 'evening' | 'night'
    };
    setUserContext(newContext);
    ContextEncoderService.saveContext(newContext, user?.id);
  };

  const applySmartDefaults = () => {
    const smartDefaults = ContextEncoderService.getSmartTimeDefaults();
    const newContext = {
      mood: smartDefaults.mood,
      situation: smartDefaults.situation,
      goal: smartDefaults.goal,
      timeOfDay: ContextEncoderService.getCurrentTimeOfDay() as 'morning' | 'afternoon' | 'evening' | 'night'
    };
    setUserContext(newContext);
    ContextEncoderService.saveContext(newContext, user?.id);
  };

  return (
    <div className={`p-6 rounded-lg border ${
      theme === 'light'
        ? 'bg-white border-gray-200'
        : theme === 'dark'
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-purple-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-medium ${
          theme === 'light'
            ? 'text-gray-900'
            : theme === 'dark'
            ? 'text-white'
            : 'text-purple-900'
        }`}>
          Reading Context Preferences
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={clearAllContext}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Clear All
          </button>
          
          <button
            onClick={applySmartDefaults}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-purple-900 hover:bg-purple-800 text-purple-300'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
            }`}
          >
            ⚡ Smart Defaults
          </button>
        </div>
      </div>

      <p className={`text-sm mb-6 ${
        theme === 'light'
          ? 'text-gray-600'
          : theme === 'dark'
          ? 'text-gray-300'
          : 'text-purple-600'
      }`}>
        Set your default reading preferences. These will be used to personalize all your book recommendations across the platform.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mood Selection */}
        <div>
          <h4 className={`text-sm font-medium mb-3 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}>
            How are you feeling?
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => handleContextChange('mood', mood.id)}
                className={`p-3 rounded-lg text-sm transition-all text-left ${
                  userContext.mood === mood.id
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 ring-2 ring-purple-500'
                    : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
                title={mood.description}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{mood.icon}</span>
                  <div>
                    <div className="font-medium">{mood.label}</div>
                    <div className={`text-xs ${
                      userContext.mood === mood.id 
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {mood.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Situation Selection */}
        <div>
          <h4 className={`text-sm font-medium mb-3 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}>
            What's your situation?
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {SITUATION_OPTIONS.map((situation) => (
              <button
                key={situation.id}
                onClick={() => handleContextChange('situation', situation.id)}
                className={`p-3 rounded-lg text-sm transition-all text-left ${
                  userContext.situation === situation.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ring-2 ring-blue-500'
                    : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{situation.icon}</span>
                  <span className="font-medium">{situation.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal Selection */}
        <div>
          <h4 className={`text-sm font-medium mb-3 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}>
            What's your goal?
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleContextChange('goal', goal.id)}
                className={`p-3 rounded-lg text-sm transition-all text-left ${
                  userContext.goal === goal.id
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ring-2 ring-green-500'
                    : theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{goal.icon}</span>
                  <span className="font-medium">{goal.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Selection Summary */}
      {(userContext.mood || userContext.situation || userContext.goal) && (
        <div className={`mt-6 p-4 rounded-lg ${
          theme === 'light'
            ? 'bg-gray-50 border border-gray-200'
            : theme === 'dark'
            ? 'bg-gray-700 border border-gray-600'
            : 'bg-purple-50 border border-purple-200'
        }`}>
          <h5 className={`text-sm font-medium mb-2 ${
            theme === 'light'
              ? 'text-gray-900'
              : theme === 'dark'
              ? 'text-white'
              : 'text-purple-900'
          }`}>
            Your Reading Context:
          </h5>
          <div className="flex flex-wrap gap-2">
            {userContext.mood && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                theme === 'light'
                  ? 'bg-purple-100 text-purple-700'
                  : theme === 'dark'
                  ? 'bg-purple-900/50 text-purple-300'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {MOOD_OPTIONS.find(m => m.id === userContext.mood)?.label}
              </span>
            )}
            {userContext.situation && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                theme === 'light'
                  ? 'bg-blue-100 text-blue-700'
                  : theme === 'dark'
                  ? 'bg-blue-900/50 text-blue-300'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {SITUATION_OPTIONS.find(s => s.id === userContext.situation)?.label}
              </span>
            )}
            {userContext.goal && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                theme === 'light'
                  ? 'bg-green-100 text-green-700'
                  : theme === 'dark'
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-green-100 text-green-700'
              }`}>
                {GOAL_OPTIONS.find(g => g.id === userContext.goal)?.label}
              </span>
            )}
          </div>
          <p className={`text-xs mt-2 ${
            theme === 'light'
              ? 'text-gray-500'
              : theme === 'dark'
              ? 'text-gray-400'
              : 'text-purple-500'
          }`}>
            These preferences will influence all book recommendations across ChapterOne.
          </p>
        </div>
      )}
    </div>
  );
};