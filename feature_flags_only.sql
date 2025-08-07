-- SAFE: Feature flags table and function only
-- Can be applied via Supabase SQL Editor if needed

-- 1. Create feature_flags table
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

-- 2. Create is_feature_enabled function
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
  SELECT * INTO flag_config 
  FROM feature_flags 
  WHERE feature_flags.flag_name = is_feature_enabled.flag_name 
    AND feature_flags.environment = is_feature_enabled.environment;
  
  IF flag_config IS NULL OR NOT flag_config.is_enabled THEN
    RETURN FALSE;
  END IF;
  
  IF user_id IS NOT NULL AND user_id::TEXT = ANY(flag_config.user_blacklist) THEN
    RETURN FALSE;
  END IF;
  
  IF user_id IS NOT NULL AND user_id::TEXT = ANY(flag_config.user_whitelist) THEN
    RETURN TRUE;
  END IF;
  
  IF user_id IS NOT NULL THEN
    user_hash := abs(hashtext(user_id::TEXT)) % 100;
    RETURN user_hash < flag_config.rollout_percentage;
  END IF;
  
  RETURN random() * 100 < flag_config.rollout_percentage;
END;
$$ LANGUAGE plpgsql;

-- 3. Insert default flags (all disabled)
INSERT INTO feature_flags (flag_name, description, rollout_percentage, environment) VALUES
('contextual_recommendations_v1', 'Enable contextual ML recommendations system', 0, 'development'),
('semantic_embeddings_v1', 'Enable JavaScript semantic embeddings', 0, 'development'),
('contextual_bandits', 'Enable multi-armed contextual bandits learning', 0, 'development'),
('context_awareness_panel', 'Show context awareness UI panel', 0, 'development'),
('recommendation_explanations', 'Show recommendation explanation system', 0, 'development')
ON CONFLICT (flag_name) DO NOTHING;

-- 4. Set permissions
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read feature flags" ON feature_flags;
CREATE POLICY "Anyone can read feature flags" ON feature_flags FOR SELECT TO authenticated, anon USING (true);