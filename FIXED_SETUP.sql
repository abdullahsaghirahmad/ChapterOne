-- 🚀 Fixed Setup for ChapterOne ML Feature Flags
-- Copy and paste this into your Supabase SQL Editor

-- 1. Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  environment VARCHAR(20) DEFAULT 'development',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert the ML feature flags
INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, environment) VALUES
('contextual_recommendations_v1', 'Enable contextual ML recommendations system', false, 50, 'development'),
('contextual_bandits', 'Enable multi-armed contextual bandits learning', false, 25, 'development'),
('semantic_similarity', 'Enable semantic similarity scoring', false, 0, 'development'),
('neural_content_filter', 'Enable neural content-based filtering', false, 0, 'development'),
('context_awareness_panel', 'Show context awareness UI panel', false, 0, 'development'),
('recommendation_explanations', 'Show recommendation explanation system', false, 0, 'development')
ON CONFLICT (flag_name) DO NOTHING;

-- 3. Create ML system tables
CREATE TABLE IF NOT EXISTS user_contextual_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS recommendation_impressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
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

CREATE TABLE IF NOT EXISTS recommendation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  book_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  value REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS and create policies for development
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contextual_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (ignore errors)
DROP POLICY IF EXISTS "Feature flags are readable by everyone" ON feature_flags;
DROP POLICY IF EXISTS "Feature flags are updatable in development" ON feature_flags;
DROP POLICY IF EXISTS "ML tables accessible for development" ON user_contextual_preferences;
DROP POLICY IF EXISTS "Impressions accessible for development" ON recommendation_impressions;
DROP POLICY IF EXISTS "Actions accessible for development" ON recommendation_actions;

-- Create policies (without IF NOT EXISTS)
CREATE POLICY "Feature flags are readable by everyone" ON feature_flags
FOR SELECT USING (true);

CREATE POLICY "Feature flags are updatable in development" ON feature_flags
FOR UPDATE USING (environment = 'development');

CREATE POLICY "ML tables accessible for development" ON user_contextual_preferences
FOR ALL USING (true);

CREATE POLICY "Impressions accessible for development" ON recommendation_impressions
FOR ALL USING (true);

CREATE POLICY "Actions accessible for development" ON recommendation_actions
FOR ALL USING (true);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_name_env ON feature_flags(flag_name, environment);
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_user_id ON user_contextual_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_user_session ON recommendation_impressions(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user_session ON recommendation_actions(user_id, session_id);

-- 6. Verify setup
SELECT 
  flag_name, 
  is_enabled,
  CASE WHEN is_enabled THEN '🟢 ON' ELSE '🔴 OFF' END as status
FROM feature_flags 
ORDER BY flag_name;