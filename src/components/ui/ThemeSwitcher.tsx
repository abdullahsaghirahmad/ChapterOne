import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRainbowHint, setShowRainbowHint] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Track clicks to reveal rainbow mode hint
  useEffect(() => {
    if (clickCount >= 3 && theme !== 'rainbow') {
      setShowRainbowHint(true);
      const timer = setTimeout(() => setShowRainbowHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [clickCount, theme]);

  const handleToggle = () => {
    setIsAnimating(true);
    setClickCount(prev => prev + 1);
    
    // Add delightful animation delay
    setTimeout(() => {
      toggleTheme();
      setIsAnimating(false);
    }, 200);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        );
      case 'rainbow':
        return (
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 animate-pulse">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="w-full h-full rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🦄</span>
              </div>
            </div>
          </div>
        );
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'rainbow': return 'Unicorn';
    }
  };

  return (
    <div className="relative">
      {/* Main Theme Switcher */}
      <button
        onClick={handleToggle}
        className={`
          relative flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ease-out
          ${theme === 'light' 
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
            : theme === 'dark'
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white shadow-lg'
          }
          ${isAnimating ? 'scale-110' : 'hover:scale-105'}
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          ${theme === 'rainbow' ? 'focus:ring-pink-300 animate-pulse' : 'focus:ring-blue-300'}
          shadow-md hover:shadow-lg
        `}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'rainbow' : 'light'} theme`}
      >
        {/* Icon Container */}
        <div className={`
          transition-transform duration-300 ease-out
          ${isAnimating ? 'rotate-180 scale-125' : ''}
        `}>
          {getThemeIcon()}
        </div>
        
        {/* Theme Label */}
        <span className={`
          text-sm font-medium transition-all duration-300
          ${theme === 'rainbow' ? 'bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent font-bold' : ''}
        `}>
          {getThemeLabel()}
        </span>

        {/* Rainbow Mode Sparkles */}
        {theme === 'rainbow' && (
          <>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          </>
        )}
      </button>

      {/* Rainbow Discovery Hint */}
      {showRainbowHint && theme !== 'rainbow' && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap animate-bounce">
            <div className="flex items-center space-x-1">
              <span>🦄</span>
              <span>Keep clicking for magic!</span>
              <span>✨</span>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-purple-500"></div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Transition Overlay */}
      {isAnimating && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className={`
            w-full h-full transition-opacity duration-300
            ${theme === 'rainbow' 
              ? 'bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-indigo-400/20' 
              : 'bg-black/10'
            }
          `} />
        </div>
      )}
    </div>
  );
}; 