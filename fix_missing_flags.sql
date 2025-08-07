-- Safe approach: Try to insert each flag, ignore if it already exists
-- This will only add the ones that are actually missing

INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, environment, description) 
SELECT 'contextual_recommendations_v1', false, 0, 'production', 'Enable contextual ML recommendations'
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'contextual_recommendations_v1' AND environment = 'production');

INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, environment, description) 
SELECT 'contextual_bandits', false, 0, 'production', 'Enable multi-armed bandit learning'
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'contextual_bandits' AND environment = 'production');

INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, environment, description) 
SELECT 'neural_content_filter', false, 0, 'production', 'Enable neural content filtering'
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'neural_content_filter' AND environment = 'production');

INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, environment, description) 
SELECT 'context_awareness_panel', false, 0, 'production', 'Enable context awareness debugging'
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'context_awareness_panel' AND environment = 'production');

INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, environment, description) 
SELECT 'recommendation_explanations', false, 0, 'production', 'Show recommendation explanations'
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'recommendation_explanations' AND environment = 'production');

-- Check final result
SELECT flag_name, is_enabled FROM feature_flags WHERE environment = 'production' ORDER BY flag_name;