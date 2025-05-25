import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, BookOpenIcon, ChatBubbleLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { useTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: any;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { theme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      theme === 'light' 
        ? 'bg-primary-50' 
        : theme === 'dark'
        ? 'bg-gray-900'
        : 'bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50'
    }`}>
      {/* Header */}
      <header className={`border-b transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white border-primary-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 border-purple-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className={`text-xl font-bold transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
              }`}>
                ChapterOne
              </Link>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <Link
                to="/"
                className={`transition-colors duration-300 ${
                  isActive('/') ? 'font-medium' : ''
                } ${
                  theme === 'light'
                    ? 'text-primary-600 hover:text-primary-900'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:text-white'
                    : 'text-purple-600 hover:text-purple-800'
                }`}
              >
                Home
              </Link>
              <Link
                to="/threads"
                className={`transition-colors duration-300 ${
                  isActive('/threads') ? 'font-medium' : ''
                } ${
                  theme === 'light'
                    ? 'text-primary-600 hover:text-primary-900'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:text-white'
                    : 'text-purple-600 hover:text-purple-800'
                }`}
              >
                Threads
              </Link>
              <Link
                to="/books"
                className={`transition-colors duration-300 ${
                  isActive('/books') ? 'font-medium' : ''
                } ${
                  theme === 'light'
                    ? 'text-primary-600 hover:text-primary-900'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:text-white'
                    : 'text-purple-600 hover:text-purple-800'
                }`}
              >
                Books
              </Link>
              <ThemeSwitcher />
              <button className={`btn transition-all duration-300 ${
                theme === 'light'
                  ? 'btn-secondary'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-none'
              }`}>
                Sign In
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t md:hidden transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white border-primary-200'
          : theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 border-purple-200'
      }`}>
        <div className="grid grid-cols-4 h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center transition-colors duration-300 ${
              isActive('/') 
                ? theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-700'
                : theme === 'light'
                ? 'text-primary-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}
          >
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link
            to="/books"
            className={`flex flex-col items-center justify-center transition-colors duration-300 ${
              isActive('/books') 
                ? theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-700'
                : theme === 'light'
                ? 'text-primary-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}
          >
            <BookOpenIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Books</span>
          </Link>
          <Link
            to="/threads"
            className={`flex flex-col items-center justify-center transition-colors duration-300 ${
              isActive('/threads') 
                ? theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-700'
                : theme === 'light'
                ? 'text-primary-600'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}
          >
            <ChatBubbleLeftIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Threads</span>
          </Link>
          <div className="flex flex-col items-center justify-center">
            <div className="scale-75">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}; 