-- Add Hybrid Content System Feature Flags
-- Safe migration to add new feature flags for gradual rollout

-- Insert hybrid content feature flags (all initially disabled for safety)
INSERT INTO feature_flags (flag_name, is_enabled, environment, description, rollout_percentage, created_at, updated_at)
VALUES 
  (
    'hybrid_content_creation',
    false,
    'production',
    'Enable hybrid content creation pipeline with external APIs and quality assessment',
    0,
    NOW(),
    NOW()
  ),
  (
    'content_source_tracking',
    false,
    'production', 
    'Track content sources and quality scores for admin visibility',
    0,
    NOW(),
    NOW()
  ),
  (
    'ai_content_enhancement',
    false,
    'production',
    'Enable AI enhancement of low-quality content from external sources',
    0,
    NOW(),
    NOW()
  ),
  (
    'admin_content_dashboard',
    true,
    'production',
    'Show content management dashboard in admin panel',
    100,
    NOW(),
    NOW()
  )
ON CONFLICT (flag_name, environment) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add development environment flags for testing
INSERT INTO feature_flags (flag_name, is_enabled, environment, description, rollout_percentage, created_at, updated_at)
VALUES 
  (
    'hybrid_content_creation',
    true,
    'development',
    'Enable hybrid content creation pipeline with external APIs and quality assessment',
    100,
    NOW(),
    NOW()
  ),
  (
    'content_source_tracking',
    true,
    'development', 
    'Track content sources and quality scores for admin visibility',
    100,
    NOW(),
    NOW()
  ),
  (
    'ai_content_enhancement',
    true,
    'development',
    'Enable AI enhancement of low-quality content from external sources',
    100,
    NOW(),
    NOW()
  ),
  (
    'admin_content_dashboard',
    true,
    'development',
    'Show content management dashboard in admin panel',
    100,
    NOW(),
    NOW()
  )
ON CONFLICT (flag_name, environment) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  rollout_percentage = EXCLUDED.rollout_percentage,
  updated_at = NOW();

-- Verify the flags were created
SELECT flag_name, is_enabled, environment, rollout_percentage, description
FROM feature_flags 
WHERE flag_name IN (
  'hybrid_content_creation',
  'content_source_tracking', 
  'ai_content_enhancement',
  'admin_content_dashboard'
)
ORDER BY environment, flag_name;