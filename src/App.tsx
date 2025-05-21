import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './components/features/HomePage';
import { ThreadPage } from './components/features/ThreadPage';
import { ThreadDetailPage } from './components/features/ThreadDetailPage';
import { BooksPage } from './components/features/BooksPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/threads" element={<ThreadPage />} />
          <Route path="/threads/:id" element={<ThreadDetailPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 