const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupMigration() {
  console.log('🔧 ChapterOne Book Migration Setup');
  console.log('================================');
  console.log('');
  console.log('To migrate the hardcoded books to the database, we need your Supabase service role key.');
  console.log('This key has admin permissions and can bypass Row Level Security policies.');
  console.log('');
  console.log('You can find your service role key in your Supabase dashboard:');
  console.log('1. Go to https://app.supabase.com/project/lrnxluoicdtonxrbteit/settings/api');
  console.log('2. Copy the "service_role" key from the "Project API keys" section');
  console.log('3. Paste it below');
  console.log('');
  console.log('⚠️  Note: The service role key is sensitive - it has admin access to your database');
  console.log('');

  const serviceRoleKey = await question('Please enter your Supabase service role key: ');

  if (!serviceRoleKey || serviceRoleKey.trim() === '') {
    console.log('❌ No service role key provided. Migration cancelled.');
    rl.close();
    return;
  }

  // Update the supabase.env file
  try {
    const envPath = './supabase.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the service role key
    envContent = envContent.replace(
      /SUPABASE_SERVICE_ROLE_KEY=.*/,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey.trim()}`
    );
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Service role key updated in supabase.env');
    console.log('');
    console.log('🚀 Now running the migration...');
    console.log('');
    
    rl.close();
    
    // Run the migration script
    const { migrateHardcodedBooks } = require('./migrate_hardcoded_books');
    const result = await migrateHardcodedBooks();
    
    if (result.errors === 0) {
      console.log('');
      console.log('🎉 Success! All hardcoded books have been migrated to the database.');
      console.log('');
      console.log('Next steps:');
      console.log('1. The frontend will now show the original hardcoded books');
      console.log('2. You can test the app to verify everything works');
      console.log('3. Consider removing the service role key from supabase.env for security');
      console.log('');
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('');
      console.log('⚠️  Migration completed with some errors. Check the output above.');
      console.log('The books that were added successfully are now available in the app.');
    }
    
  } catch (error) {
    console.error('❌ Error updating environment file:', error.message);
    rl.close();
  }
}

setupMigration().catch(console.error); 