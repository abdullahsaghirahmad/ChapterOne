import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, BookOpenIcon, ChatBubbleLeftIcon, UserIcon } from '@heroicons/react/24/outline';

interface LayoutProps {
  children: any;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <header className="bg-white border-b border-primary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-900">
                ChapterOne
              </Link>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <Link
                to="/"
                className={`text-primary-600 hover:text-primary-900 ${
                  isActive('/') ? 'font-medium' : ''
                }`}
              >
                Home
              </Link>
              <Link
                to="/threads"
                className={`text-primary-600 hover:text-primary-900 ${
                  isActive('/threads') ? 'font-medium' : ''
                }`}
              >
                Threads
              </Link>
              <Link
                to="/books"
                className={`text-primary-600 hover:text-primary-900 ${
                  isActive('/books') ? 'font-medium' : ''
                }`}
              >
                Books
              </Link>
              <button className="btn btn-secondary">Sign In</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-primary-200 md:hidden">
        <div className="grid grid-cols-4 h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center ${
              isActive('/') ? 'text-primary-900' : 'text-primary-600'
            }`}
          >
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link
            to="/books"
            className={`flex flex-col items-center justify-center ${
              isActive('/books') ? 'text-primary-900' : 'text-primary-600'
            }`}
          >
            <BookOpenIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Books</span>
          </Link>
          <Link
            to="/threads"
            className={`flex flex-col items-center justify-center ${
              isActive('/threads') ? 'text-primary-900' : 'text-primary-600'
            }`}
          >
            <ChatBubbleLeftIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Threads</span>
          </Link>
          <button className="flex flex-col items-center justify-center text-primary-600">
            <UserIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}; 