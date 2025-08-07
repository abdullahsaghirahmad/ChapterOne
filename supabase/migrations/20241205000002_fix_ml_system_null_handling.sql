-- Fix ML system migration with proper NULL handling
-- Migration: 20241205000002_fix_ml_system_null_handling.sql

-- =============================================================================
-- 1. ENSURE BOOK EMBEDDINGS TABLE EXISTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS book_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE,
  embedding_model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  embedding_vector REAL[] NOT NULL,
  text_content TEXT NOT NULL,
  embedding_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_embedding_dimensions CHECK (array_length(embedding_vector, 1) = 384)
);

-- Indexes for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_book_embeddings_book_id ON book_embeddings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_embeddings_model ON book_embeddings(embedding_model);

-- =============================================================================
-- 2. ENSURE USER CONTEXTUAL PREFERENCES TABLE EXISTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_contextual_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_signature TEXT NOT NULL,
  context_data JSONB NOT NULL,
  
  feature_weights JSONB NOT NULL DEFAULT '{}',
  action_counts JSONB NOT NULL DEFAULT '{}',
  reward_totals JSONB NOT NULL DEFAULT '{}',
  confidence_intervals JSONB NOT NULL DEFAULT '{}',
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, context_signature)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_user_id ON user_contextual_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_context ON user_contextual_preferences(context_signature);

-- =============================================================================
-- 3. ENSURE RECOMMENDATION INTERACTIONS TABLE EXISTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS recommendation_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  book_id TEXT NOT NULL,
  
  context_data JSONB NOT NULL,
  context_signature TEXT NOT NULL,
  
  recommendation_source VARCHAR(50) NOT NULL,
  recommendation_score REAL NOT NULL,
  recommendation_rank INTEGER NOT NULL,
  recommendation_metadata JSONB DEFAULT '{}',
  
  interaction_type VARCHAR(20) NOT NULL,
  interaction_duration_ms INTEGER,
  interaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  reward_value REAL DEFAULT 0,
  attribution_confidence REAL DEFAULT 1.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 4. ENABLE RLS AND CREATE POLICIES WITH PROPER NULL HANDLING
-- =============================================================================

-- Enable RLS
ALTER TABLE book_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contextual_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_interactions ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can view their own contextual preferences" ON user_contextual_preferences;
DROP POLICY IF EXISTS "Users can manage their own contextual preferences" ON user_contextual_preferences;

-- Book embeddings: Read for everyone, write for authenticated users and service role
CREATE POLICY "Anyone can read book embeddings" ON book_embeddings
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert book embeddings" ON book_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can manage book embeddings" ON book_embeddings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- User contextual preferences: FIXED NULL handling
CREATE POLICY "Users can view their own contextual preferences" ON user_contextual_preferences
  FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can manage their own contextual preferences" ON user_contextual_preferences
  FOR ALL 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Recommendation interactions: Handle both authenticated and anonymous users
CREATE POLICY "Users can access their own interactions" ON recommendation_interactions
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert their own interactions" ON recommendation_interactions
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- =============================================================================
-- 5. UPDATED_AT TRIGGERS
-- =============================================================================

-- Create the update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
DROP TRIGGER IF EXISTS update_book_embeddings_updated_at ON book_embeddings;
CREATE TRIGGER update_book_embeddings_updated_at 
  BEFORE UPDATE ON book_embeddings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();