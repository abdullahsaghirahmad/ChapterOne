import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthModalProvider } from './contexts/AuthModalProvider';
import { Layout } from './components/layout/Layout';
import { HomePage } from './components/features/HomePage';
import { BooksPage } from './components/features/BooksPage';
import { BookDetailPage } from './components/features/BookDetailPage';
import { ThreadPage } from './components/features/ThreadPage';
import { ThreadDetailPage } from './components/features/ThreadDetailPage';
import { useFeatureFlags } from './services/featureFlag.service';
import { ColorSearchPage } from './components/features/ColorSearchPage';
import { ProfilePage } from './components/features/ProfilePage';
import AuthCallback from './components/auth/AuthCallback';
import { AdminPanel } from './components/admin/AdminPanel';
import './styles/themes.css';

// Animated Routes wrapper component
const AnimatedRoutes = () => {
  const location = useLocation();
  const { isEnabled } = useFeatureFlags();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1] // Apple's standard easing
            }}
          >
            <HomePage />
          </motion.div>
        } />
        <Route path="/books" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <BooksPage />
          </motion.div>
        } />
        <Route path="/books/:id" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <BookDetailPage />
          </motion.div>
        } />
        {/* Thread routes - hidden when feature flag is OFF */}
        {isEnabled('threads_feature_enabled') && (
          <>
            <Route path="/threads" element={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0.0, 0.2, 1]
                }}
              >
                <ThreadPage />
              </motion.div>
            } />
            <Route path="/threads/:id" element={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0.0, 0.2, 1]
                }}
              >
                <ThreadDetailPage />
              </motion.div>
            } />
          </>
        )}

        <Route path="/profile" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <ProfilePage />
          </motion.div>
        } />
        <Route path="/profile/:username" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <ProfilePage />
          </motion.div>
        } />
        <Route path="/color-search" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <ColorSearchPage />
          </motion.div>
        } />
        <Route path="/auth/callback" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <AuthCallback />
          </motion.div>
        } />
        <Route path="/admin" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <AdminPanel />
          </motion.div>
        } />
        <Route path="/ml-admin" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <AdminPanel />
          </motion.div>
        } />
        <Route path="*" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                <a href="/" className="text-blue-600 hover:text-blue-800 underline">← Back to Home</a>
              </div>
            </div>
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthModalProvider>
          <Router>
            <Layout>
              <AnimatedRoutes />
            </Layout>
          </Router>
        </AuthModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 