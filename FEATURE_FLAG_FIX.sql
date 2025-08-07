-- 🔧 Fix for Feature Flag Function
-- This creates the missing is_feature_enabled function

CREATE OR REPLACE FUNCTION is_feature_enabled(
  flag_name TEXT,
  user_id TEXT DEFAULT NULL,
  environment TEXT DEFAULT 'development'
) RETURNS BOOLEAN AS $$
DECLARE
  flag_config RECORD;
BEGIN
  -- Get the feature flag configuration
  SELECT * INTO flag_config 
  FROM feature_flags 
  WHERE feature_flags.flag_name = is_feature_enabled.flag_name
    AND feature_flags.environment = is_feature_enabled.environment;
  
  -- If flag doesn't exist or is disabled, return false
  IF flag_config IS NULL OR NOT flag_config.is_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- For development, just return the is_enabled status
  -- (In production, you'd add rollout percentage logic here)
  RETURN flag_config.is_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;