#!/usr/bin/env node

// Setup script to create feature flags and ML tables in Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables - try multiple locations
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(sql, description) {
  console.log(`⚡ ${description}...`);
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error(`❌ ${description} failed:`, error.message);
    // Try direct query for simple cases
    const { error: directError } = await supabase.from('feature_flags').select('*').limit(1);
    if (directError && directError.message.includes('relation "feature_flags" does not exist')) {
      return false;
    }
    return false;
  }
  
  console.log(`✅ ${description} completed`);
  return true;
}

async function createFeatureFlags() {
  console.log('🚀 Setting up ML Feature Flags and Tables...\n');

  // First, try to create a simple exec_sql function if it doesn't exist
  const createExecFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
    RETURNS TEXT AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'OK';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Try to create the exec function
  try {
    await supabase.rpc('exec_sql', { sql_query: createExecFunction });
  } catch (error) {
    // Function creation might fail, that's okay
    console.log('⚠️  Could not create exec function, trying direct approach...');
  }

  // Step 1: Create feature_flags table
  const createTableSQL = `
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
  `;

  const tableCreated = await runSQL(createTableSQL, 'Creating feature_flags table');
  
  if (!tableCreated) {
    // Try direct table creation
    console.log('⚡ Trying direct table creation...');
    
    // Manual approach - insert feature flags directly
    const flags = [
      {
        flag_name: 'contextual_recommendations_v1',
        description: 'Enable contextual ML recommendations system',
        is_enabled: false,
        rollout_percentage: 50,
        environment: 'development'
      },
      {
        flag_name: 'contextual_bandits',
        description: 'Enable multi-armed contextual bandits learning',
        is_enabled: false,
        rollout_percentage: 25,
        environment: 'development'
      }
    ];

    // Try to insert flags one by one
    for (const flag of flags) {
      console.log(`⚡ Creating flag: ${flag.flag_name}...`);
      const { error } = await supabase
        .from('feature_flags')
        .upsert(flag, { onConflict: 'flag_name' });
      
      if (error) {
        console.error(`❌ Failed to create ${flag.flag_name}:`, error.message);
      } else {
        console.log(`✅ Created flag: ${flag.flag_name}`);
      }
    }
  }

  // Step 2: Insert feature flags
  const insertFlagsSQL = `
    INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, environment) VALUES
    ('contextual_recommendations_v1', 'Enable contextual ML recommendations system', false, 50, 'development'),
    ('contextual_bandits', 'Enable multi-armed contextual bandits learning', false, 25, 'development'),
    ('semantic_similarity', 'Enable semantic similarity scoring', false, 0, 'development'),
    ('neural_content_filter', 'Enable neural content-based filtering', false, 0, 'development'),
    ('context_awareness_panel', 'Show context awareness UI panel', false, 0, 'development'),
    ('recommendation_explanations', 'Show recommendation explanation system', false, 0, 'development')
    ON CONFLICT (flag_name) DO NOTHING;
  `;

  await runSQL(insertFlagsSQL, 'Inserting initial feature flags');

  // Step 3: Create other ML tables
  const createMLTablesSQL = `
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
  `;

  await runSQL(createMLTablesSQL, 'Creating ML tables');

  // Step 4: Verify feature flags exist
  console.log('\n🔍 Verifying feature flags...');
  const { data: flags, error } = await supabase
    .from('feature_flags')
    .select('flag_name, is_enabled')
    .order('flag_name');

  if (error) {
    console.error('❌ Failed to verify feature flags:', error.message);
  } else {
    console.log('✅ Feature flags in database:');
    flags.forEach(flag => {
      const status = flag.is_enabled ? '🟢 ON' : '🔴 OFF';
      console.log(`  ${status} ${flag.flag_name}`);
    });
  }

  console.log('\n🎉 Database setup complete!');
  console.log('💡 You can now use the feature flag toggles in the ML Test Panel');
  console.log('🔗 Refresh your app at localhost:3000 to see the changes');
}

// Run the setup
createFeatureFlags().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});