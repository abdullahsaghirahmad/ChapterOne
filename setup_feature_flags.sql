-- Create feature_flags table and insert initial data
-- This sets up the feature flags needed for the ML system

-- 1. Create feature_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  environment VARCHAR(20) DEFAULT 'development',
  user_whitelist TEXT[] DEFAULT '{}',
  user_blacklist TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert the initial feature flags
INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, environment) VALUES
('contextual_recommendations_v1', 'Enable contextual ML recommendations system', false, 50, 'development'),
('contextual_bandits', 'Enable multi-armed contextual bandits learning', false, 25, 'development'),
('semantic_similarity', 'Enable semantic similarity scoring', false, 0, 'development'),
('neural_content_filter', 'Enable neural content-based filtering', false, 0, 'development'),
('context_awareness_panel', 'Show context awareness UI panel', false, 0, 'development'),
('recommendation_explanations', 'Show recommendation explanation system', false, 0, 'development')
ON CONFLICT (flag_name) DO NOTHING;

-- 3. Enable RLS but allow updates (for the toggle to work)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow read access to feature flags for everyone
DROP POLICY IF EXISTS "Feature flags are readable by everyone" ON feature_flags;
CREATE POLICY "Feature flags are readable by everyone" ON feature_flags
FOR SELECT USING (true);

-- Allow updates to feature flags (for development - you might want to restrict this in production)
DROP POLICY IF EXISTS "Feature flags are updatable in development" ON feature_flags;
CREATE POLICY "Feature flags are updatable in development" ON feature_flags
FOR UPDATE USING (environment = 'development');

-- 4. Create missing tables for ML system (if they don't exist)

-- Book embeddings table
CREATE TABLE IF NOT EXISTS book_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE,
  embedding_model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  embedding VECTOR(384),
  text_content TEXT NOT NULL,
  embedding_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User contextual preferences table
CREATE TABLE IF NOT EXISTS user_contextual_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID to TEXT to support 'anonymous'
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

-- Recommendation impressions table
CREATE TABLE IF NOT EXISTS recommendation_impressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, -- TEXT to support both UUID and 'anonymous'
  session_id TEXT,
  book_id TEXT NOT NULL,
  context_vector JSONB NOT NULL,
  source TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score REAL NOT NULL,
  reward REAL,
  attributed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendation actions table
CREATE TABLE IF NOT EXISTS recommendation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, -- TEXT to support both UUID and 'anonymous'
  session_id TEXT,
  book_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  value REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_embeddings_book_id ON book_embeddings(book_id);
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_user_id ON user_contextual_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_user_session ON recommendation_impressions(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user_session ON recommendation_actions(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name_env ON feature_flags(flag_name, environment);

-- 6. Enable RLS on all tables
ALTER TABLE book_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contextual_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for ML tables (allowing access for development)
-- Book embeddings policies
DROP POLICY IF EXISTS "Book embeddings are readable by everyone" ON book_embeddings;
CREATE POLICY "Book embeddings are readable by everyone" ON book_embeddings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Book embeddings are insertable by everyone" ON book_embeddings;
CREATE POLICY "Book embeddings are insertable by everyone" ON book_embeddings
FOR INSERT WITH CHECK (true);

-- User contextual preferences policies
DROP POLICY IF EXISTS "User contextual preferences are accessible by user" ON user_contextual_preferences;
CREATE POLICY "User contextual preferences are accessible by user" ON user_contextual_preferences
FOR ALL USING (true); -- Allow all operations for development

-- Recommendation impressions policies
DROP POLICY IF EXISTS "Recommendation impressions are accessible by user" ON recommendation_impressions;
CREATE POLICY "Recommendation impressions are accessible by user" ON recommendation_impressions
FOR ALL USING (true); -- Allow all operations for development

-- Recommendation actions policies
DROP POLICY IF EXISTS "Recommendation actions are accessible by user" ON recommendation_actions;
CREATE POLICY "Recommendation actions are accessible by user" ON recommendation_actions
FOR ALL USING (true); -- Allow all operations for development

-- 8. Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_book_embeddings_updated_at ON book_embeddings;
CREATE TRIGGER update_book_embeddings_updated_at
    BEFORE UPDATE ON book_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get feature flag status
CREATE OR REPLACE FUNCTION get_feature_flag_status(flag_name TEXT, user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    flag_config RECORD;
BEGIN
    SELECT * INTO flag_config 
    FROM feature_flags 
    WHERE feature_flags.flag_name = get_feature_flag_status.flag_name;
    
    IF flag_config IS NULL OR NOT flag_config.is_enabled THEN
        RETURN FALSE;
    END IF;
    
    -- For development, just return the is_enabled status
    RETURN flag_config.is_enabled;
END;
$$ LANGUAGE plpgsql;