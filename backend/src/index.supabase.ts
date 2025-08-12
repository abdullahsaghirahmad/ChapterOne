import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Supabase routes
import bookRoutesSupabase from './routes/book.routes.supabase';
import threadRoutesSupabase from './routes/thread.routes.supabase';
import authRoutesSupabase from './routes/auth.routes.supabase';
import llmRoutes from './routes/llm.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'supabase'
  });
});

// API Routes
app.use('/api/auth', authRoutesSupabase);
app.use('/api/books', bookRoutesSupabase);
app.use('/api/threads', threadRoutesSupabase);
app.use('/api/llm', llmRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'ChapterOne API - Powered by Supabase',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      books: '/api/books',
      threads: '/api/threads'
      // llm: '/api/llm' // Temporarily disabled
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ChapterOne API Server running on port ' + PORT);
  console.log('📚 Using Supabase for data storage');
  console.log('🔗 Frontend URLs: ' + (process.env.FRONTEND_URL || 'http://localhost:3000, http://localhost:3002'));
  console.log('📍 API Base URL: http://localhost:' + PORT);
  console.log('🏥 Health Check: http://localhost:' + PORT + '/health');
});

export default app; 