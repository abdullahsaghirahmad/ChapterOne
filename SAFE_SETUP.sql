-- 🛡️ 100% SAFE Setup for ChapterOne ML Feature Flags
-- This script ONLY CREATES, never deletes or modifies existing data

-- 1. Create feature_flags table (only if it doesn't exist)
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

-- 2. Insert ONLY our ML feature flags (won't overwrite existing ones)
INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, environment) VALUES
('contextual_recommendations_v1', 'Enable contextual ML recommendations system', false, 50, 'development'),
('contextual_bandits', 'Enable multi-armed contextual bandits learning', false, 25, 'development')
ON CONFLICT (flag_name) DO NOTHING;

-- 3. Check if we can read the table (this will fail if RLS blocks us)
SELECT COUNT(*) as existing_flags FROM feature_flags;

-- 4. Show what we have
SELECT 
  flag_name, 
  is_enabled,
  CASE WHEN is_enabled THEN '🟢 ON' ELSE '🔴 OFF' END as status,
  created_at
FROM feature_flags 
WHERE flag_name IN ('contextual_recommendations_v1', 'contextual_bandits')
ORDER BY flag_name;