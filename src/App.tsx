import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './components/features/HomePage';
import { BooksPage } from './components/features/BooksPage';
import { ThreadPage } from './components/features/ThreadPage';
import { ThreadDetailPage } from './components/features/ThreadDetailPage';
import { ColorSearchPage } from './components/features/ColorSearchPage';
import AuthCallback from './components/auth/AuthCallback';
import './styles/themes.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/books" element={<BooksPage />} />
              <Route path="/threads" element={<ThreadPage />} />
              <Route path="/threads/:id" element={<ThreadDetailPage />} />
              <Route path="/color-search" element={<ColorSearchPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                    <a href="/" className="text-blue-600 hover:text-blue-800 underline">← Back to Home</a>
                  </div>
                </div>
              } />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 