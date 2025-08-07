-- Add semantic embeddings feature flag
-- Migration: 20241205000003_add_semantic_embeddings_feature_flag.sql

-- Ensure feature_flags table exists first (safe operation)
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_whitelist TEXT[],
  user_blacklist TEXT[],
  ab_test_config JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  environment VARCHAR(20) DEFAULT 'development'
);

-- Add the new semantic_embeddings_v1 feature flag
INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, environment) VALUES
('semantic_embeddings_v1', 'Enable server-side semantic embeddings with real-time context matching', false, 0, 'development')
ON CONFLICT (flag_name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Optional: Enable it immediately for development testing
-- UPDATE feature_flags 
-- SET is_enabled = true, rollout_percentage = 100 
-- WHERE flag_name = 'semantic_embeddings_v1' AND environment = 'development';