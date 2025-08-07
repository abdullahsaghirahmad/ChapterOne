-- Add essential feature flag infrastructure only
-- Migration: 20241205000016_add_essential_feature_flags.sql
-- SAFE: Only adds new tables/functions, doesn't modify existing ones

-- =============================================================================
-- 1. FEATURE FLAGS TABLE
-- Essential for the admin panel toggle functionality to work
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
  ab_test_config JSONB DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Environment targeting
  environment VARCHAR(20) DEFAULT 'development'
);

-- =============================================================================
-- 2. FEATURE FLAG FUNCTION
-- Required for FeatureFlagService.isFeatureEnabled() to work
-- =============================================================================
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
-- 3. INSERT DEFAULT FLAGS (All disabled - same as current state)
-- =============================================================================
INSERT INTO feature_flags (flag_name, description, rollout_percentage, environment) VALUES
('contextual_recommendations_v1', 'Enable contextual ML recommendations system', 0, 'development'),
('semantic_similarity', 'Enable semantic similarity scoring', 0, 'development'),
('semantic_embeddings_v1', 'Enable JavaScript semantic embeddings', 0, 'development'),
('contextual_bandits', 'Enable multi-armed contextual bandits learning', 0, 'development'),
('neural_content_filter', 'Enable neural content-based filtering', 0, 'development'),
('context_awareness_panel', 'Show context awareness UI panel', 0, 'development'),
('recommendation_explanations', 'Show recommendation explanation system', 0, 'development')
ON CONFLICT (flag_name) DO NOTHING;

-- =============================================================================
-- 4. SECURITY & PERMISSIONS
-- =============================================================================

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags (required for the frontend)
DROP POLICY IF EXISTS "Anyone can read feature flags" ON feature_flags;
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT TO authenticated, anon
  USING (true);

-- =============================================================================
-- 5. AUTO-UPDATE TIMESTAMP TRIGGER
-- =============================================================================
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at 
  BEFORE UPDATE ON feature_flags 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. HELPFUL METADATA
-- =============================================================================
COMMENT ON TABLE feature_flags IS 'Feature flag system for gradual rollout and A/B testing of ML features';
COMMENT ON FUNCTION is_feature_enabled(TEXT, UUID, TEXT) IS 'Check if a feature flag is enabled for a specific user';