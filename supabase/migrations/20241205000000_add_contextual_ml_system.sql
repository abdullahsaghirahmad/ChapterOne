-- Contextual ML Recommendation System
-- Migration: 20241205000000_add_contextual_ml_system.sql

-- =============================================================================
-- 1. BOOK EMBEDDINGS TABLE
-- Store semantic embeddings for content-based similarity
-- =============================================================================
CREATE TABLE IF NOT EXISTS book_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE, -- Reference to book.id or external book ID
  embedding_model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  embedding_vector REAL[] NOT NULL, -- 384-dimensional vector for all-MiniLM-L6-v2
  text_content TEXT NOT NULL, -- Combined text used to generate embedding
  embedding_metadata JSONB DEFAULT '{}', -- Model version, generation date, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure embedding vector has correct dimensions
  CONSTRAINT check_embedding_dimensions CHECK (array_length(embedding_vector, 1) = 384)
);

-- Indexes for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_book_embeddings_book_id ON book_embeddings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_embeddings_model ON book_embeddings(embedding_model);

-- =============================================================================
-- 2. USER CONTEXTUAL PREFERENCES (Multi-Armed Bandits)
-- Track user preferences across different contexts for learning
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_contextual_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_signature TEXT NOT NULL, -- Hashed context (mood+situation+goal+temporal)
  context_data JSONB NOT NULL, -- Full context details
  
  -- Bandit algorithm data
  feature_weights JSONB NOT NULL DEFAULT '{}', -- Learned feature importance weights
  action_counts JSONB NOT NULL DEFAULT '{}', -- Number of times each action was taken
  reward_totals JSONB NOT NULL DEFAULT '{}', -- Cumulative rewards for each action
  confidence_intervals JSONB NOT NULL DEFAULT '{}', -- Upper confidence bounds
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one preference set per user per context
  UNIQUE(user_id, context_signature)
);

-- Indexes for efficient context-based lookups
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_user_id ON user_contextual_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_context ON user_contextual_preferences(context_signature);
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_updated ON user_contextual_preferences(last_updated DESC);

-- =============================================================================
-- 3. RECOMMENDATION INTERACTIONS (Enhanced tracking)
-- Extend interaction tracking with contextual reward signals
-- =============================================================================
CREATE TABLE IF NOT EXISTS recommendation_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for anonymous users
  session_id TEXT, -- For anonymous user tracking
  book_id TEXT NOT NULL,
  
  -- Context at time of recommendation
  context_data JSONB NOT NULL,
  context_signature TEXT NOT NULL,
  
  -- Recommendation details
  recommendation_source VARCHAR(50) NOT NULL, -- 'semantic', 'bandit', 'neural', 'hybrid'
  recommendation_score REAL NOT NULL,
  recommendation_rank INTEGER NOT NULL, -- Position in recommendation list
  recommendation_metadata JSONB DEFAULT '{}',
  
  -- User interaction
  interaction_type VARCHAR(20) NOT NULL, -- 'view', 'click', 'save', 'dismiss'
  interaction_duration_ms INTEGER,
  interaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reward signal calculation
  immediate_reward REAL, -- Quick engagement score
  delayed_reward REAL, -- Long-term satisfaction (updated later)
  reward_updated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics and bandit updates
CREATE INDEX IF NOT EXISTS idx_rec_interactions_user_id ON recommendation_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_session ON recommendation_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_context ON recommendation_interactions(context_signature);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_book ON recommendation_interactions(book_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_timestamp ON recommendation_interactions(interaction_timestamp DESC);

-- =============================================================================
-- 4. FEATURE FLAGS SYSTEM
-- Control rollout of ML features with A/B testing
-- =============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  
  -- Rollout configuration
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_whitelist TEXT[], -- Specific user IDs to include
  user_blacklist TEXT[], -- Specific user IDs to exclude
  
  -- A/B testing configuration
  ab_test_config JSONB DEFAULT '{}', -- Variant definitions and traffic splits
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Environment targeting
  environment VARCHAR(20) DEFAULT 'development' -- 'development', 'staging', 'production'
);

-- Insert initial ML feature flags
INSERT INTO feature_flags (flag_name, description, rollout_percentage, environment) VALUES
('contextual_recommendations_v1', 'Enable contextual ML recommendations system', 0, 'development'),
('semantic_similarity', 'Enable semantic similarity scoring', 0, 'development'),
('contextual_bandits', 'Enable multi-armed contextual bandits learning', 0, 'development'),
('neural_content_filter', 'Enable neural content-based filtering', 0, 'development'),
('context_awareness_panel', 'Show context awareness UI panel', 0, 'development'),
('recommendation_explanations', 'Show recommendation explanation system', 0, 'development')
ON CONFLICT (flag_name) DO NOTHING;

-- =============================================================================
-- 5. EXTEND EXISTING TABLES
-- Add ML-specific fields to existing tables
-- =============================================================================

-- Extend saved_books.saved_context with ML tracking
DO $$ 
BEGIN
  -- Add ML tracking fields to saved_books
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_books' AND column_name = 'recommendation_context'
  ) THEN
    ALTER TABLE saved_books ADD COLUMN recommendation_context JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_books' AND column_name = 'recommendation_source'
  ) THEN
    ALTER TABLE saved_books ADD COLUMN recommendation_source VARCHAR(50);
  END IF;
END $$;

-- =============================================================================
-- 6. UTILITY FUNCTIONS
-- Helper functions for ML operations
-- =============================================================================

-- Function to calculate cosine similarity between embeddings
CREATE OR REPLACE FUNCTION cosine_similarity(a REAL[], b REAL[])
RETURNS REAL AS $$
DECLARE
  dot_product REAL := 0;
  norm_a REAL := 0;
  norm_b REAL := 0;
  i INTEGER;
BEGIN
  -- Calculate dot product and norms
  FOR i IN 1..array_length(a, 1) LOOP
    dot_product := dot_product + (a[i] * b[i]);
    norm_a := norm_a + (a[i] * a[i]);
    norm_b := norm_b + (b[i] * b[i]);
  END LOOP;
  
  -- Return cosine similarity
  IF norm_a = 0 OR norm_b = 0 THEN
    RETURN 0;
  ELSE
    RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get context signature (for consistent hashing)
CREATE OR REPLACE FUNCTION get_context_signature(context_data JSONB)
RETURNS TEXT AS $$
BEGIN
  RETURN md5(context_data::TEXT);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if user is in feature flag rollout
CREATE OR REPLACE FUNCTION is_feature_enabled(
  flag_name TEXT,
  user_id UUID DEFAULT NULL,
  environment TEXT DEFAULT 'development'
)
RETURNS BOOLEAN AS $$
DECLARE
  flag_config RECORD;
  user_hash INTEGER;
BEGIN
  -- Get flag configuration
  SELECT * INTO flag_config 
  FROM feature_flags 
  WHERE feature_flags.flag_name = is_feature_enabled.flag_name 
    AND feature_flags.environment = is_feature_enabled.environment;
  
  -- Flag doesn't exist or is disabled
  IF flag_config IS NULL OR NOT flag_config.is_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check user blacklist
  IF user_id IS NOT NULL AND user_id::TEXT = ANY(flag_config.user_blacklist) THEN
    RETURN FALSE;
  END IF;
  
  -- Check user whitelist
  IF user_id IS NOT NULL AND user_id::TEXT = ANY(flag_config.user_whitelist) THEN
    RETURN TRUE;
  END IF;
  
  -- Check rollout percentage
  IF user_id IS NOT NULL THEN
    user_hash := abs(hashtext(user_id::TEXT)) % 100;
    RETURN user_hash < flag_config.rollout_percentage;
  END IF;
  
  -- For anonymous users, use rollout percentage
  RETURN random() * 100 < flag_config.rollout_percentage;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- Secure access to ML tables
-- =============================================================================

-- Enable RLS
ALTER TABLE book_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contextual_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Book embeddings: Read-only for authenticated users
CREATE POLICY "Anyone can read book embeddings" ON book_embeddings
  FOR SELECT TO authenticated, anon
  USING (true);

-- User contextual preferences: Users can only see their own
CREATE POLICY "Users can view their own contextual preferences" ON user_contextual_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contextual preferences" ON user_contextual_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Recommendation interactions: Users can see their own, anonymous by session
CREATE POLICY "Users can view their own recommendation interactions" ON recommendation_interactions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert their own recommendation interactions" ON recommendation_interactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Feature flags: Read-only for all users
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT TO authenticated, anon
  USING (true);

-- =============================================================================
-- 8. UPDATED_AT TRIGGERS
-- Auto-update timestamps
-- =============================================================================

-- Book embeddings
CREATE TRIGGER update_book_embeddings_updated_at 
  BEFORE UPDATE ON book_embeddings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Feature flags  
CREATE TRIGGER update_feature_flags_updated_at 
  BEFORE UPDATE ON feature_flags 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 9. INITIAL DATA & COMMENTS
-- =============================================================================

-- Add helpful comments
COMMENT ON TABLE book_embeddings IS 'Semantic embeddings for books using transformer models for content-based similarity';
COMMENT ON TABLE user_contextual_preferences IS 'Multi-armed bandit data for learning user preferences in different contexts';
COMMENT ON TABLE recommendation_interactions IS 'Detailed tracking of user interactions with recommendations for reward signal calculation';
COMMENT ON TABLE feature_flags IS 'Feature flag system for gradual rollout and A/B testing of ML features';

COMMENT ON FUNCTION cosine_similarity(REAL[], REAL[]) IS 'Calculate cosine similarity between two embedding vectors';
COMMENT ON FUNCTION get_context_signature(JSONB) IS 'Generate consistent hash signature for context data';
COMMENT ON FUNCTION is_feature_enabled(TEXT, UUID, TEXT) IS 'Check if a feature flag is enabled for a specific user';