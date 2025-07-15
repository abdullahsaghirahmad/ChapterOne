const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://lrnxluoicdtonxrbteit.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Open Library API (better CORS support)
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';

// Test if an image URL is working AND has good CORS support
async function testImageUrl(url) {
  if (!url || url.includes('placeholder') || url.includes('no-cover')) {
    return false;
  }
  
  try {
    const response = await axios.head(url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'ChapterOne/1.0 (Book Cover Checker)'
      }
    });
    
    // Check for CORS-friendly headers
    const corsHeaders = response.headers['access-control-allow-origin'];
    const frameOptions = response.headers['x-frame-options'];
    
    if (response.status === 200) {
      // Prefer URLs that have good CORS support
      if (corsHeaders === '*' || !frameOptions || frameOptions.toLowerCase() !== 'sameorigin') {
        console.log(`  ✅ URL working with good CORS: ${url}`);
        return true;
      } else {
        console.log(`  ⚠️ URL works but has CORS restrictions: ${url}`);
        return false; // Reject CORS-restricted URLs
      }
    }
    return false;
  } catch (error) {
    console.log(`  ❌ URL failed: ${error.message}`);
    return false;
  }
}

// Search Open Library for a cover image (prioritize this for CORS)
async function searchOpenLibraryImage(title, author, isbn) {
  try {
    console.log(`  🔍 Searching Open Library for "${title}"...`);
    
    // Try ISBN first if available
    if (isbn) {
      const isbnUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
      if (await testImageUrl(isbnUrl)) {
        return isbnUrl;
      }
    }

    // Search by title and author
    const query = `${title} ${author}`.replace(/[^\w\s]/g, '').trim();
    const response = await axios.get(OPEN_LIBRARY_API, {
      params: {
        q: query,
        limit: 10 // Get more results for better matches
      },
      timeout: 10000
    });

    const books = response.data.docs || [];
    console.log(`  📚 Found ${books.length} potential matches`);
    
    for (const book of books) {
      if (book.cover_i) {
        const imageUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        if (await testImageUrl(imageUrl)) {
          return imageUrl;
        }
      }
    }
  } catch (error) {
    console.log(`  ⚠️ Open Library search failed: ${error.message}`);
  }
  return null;
}

// Try other CORS-friendly sources as backups
async function searchAlternativeSources(title, author) {
  console.log(`  🔍 Trying alternative sources...`);
  
  // Try some popular free book cover APIs
  const alternatives = [
    // Archive.org often has book covers with good CORS
    `https://archive.org/download/bookcover_${title.toLowerCase().replace(/[^\w]/g, '')}/cover.jpg`,
    // Wikimedia Commons sometimes has book covers
    `https://upload.wikimedia.org/wikipedia/commons/thumb/book_${title.toLowerCase().replace(/[^\w]/g, '')}.jpg/200px-book_${title.toLowerCase().replace(/[^\w]/g, '')}.jpg`
  ];
  
  for (const url of alternatives) {
    if (await testImageUrl(url)) {
      return url;
    }
  }
  
  return null;
}

// Find a working, CORS-friendly image URL for a book
async function findWorkingImageUrl(book) {
  console.log(`🔍 Searching for CORS-friendly image for "${book.title}" by ${book.author}`);
  
  // Priority 1: Open Library (best CORS support)
  let newUrl = await searchOpenLibraryImage(book.title, book.author, book.isbn);
  if (newUrl) {
    console.log(`  ✅ Found on Open Library: ${newUrl}`);
    return newUrl;
  }

  // Priority 2: Alternative sources
  newUrl = await searchAlternativeSources(book.title, book.author);
  if (newUrl) {
    console.log(`  ✅ Found on alternative source: ${newUrl}`);
    return newUrl;
  }

  console.log(`  ❌ No CORS-friendly image found - will use SVG fallback`);
  return null;
}

// Main function to check and fix all book images in Supabase
async function fixBrokenImagesWithCors() {
  try {
    console.log('🚀 Connected to Supabase');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    console.log('🎯 Focus: CORS-friendly image URLs for browser compatibility');
    
    // Get all books with their current image URLs from Supabase
    const { data: books, error } = await supabase
      .from('book')
      .select('id, title, author, isbn, coverImage')
      .not('coverImage', 'is', null)
      .order('title');
    
    if (error) {
      throw error;
    }
    
    console.log(`📚 Found ${books.length} books with cover images`);
    
    let checkedCount = 0;
    let brokenCount = 0;
    let corsIssueCount = 0;
    let fixedCount = 0;
    let failedCount = 0;

    for (const book of books) {
      checkedCount++;
      console.log(`\n📖 [${checkedCount}/${books.length}] Checking "${book.title}"`);
      console.log(`   Current URL: ${book.coverImage}`);
      
      // Test current URL for both working AND CORS-friendly
      const isWorking = await testImageUrl(book.coverImage);
      
      if (isWorking) {
        console.log(`   ✅ URL is working and CORS-friendly`);
        continue;
      }
      
      // Check if it's a CORS issue (URL works but has restrictions)
      try {
        const response = await axios.head(book.coverImage, { timeout: 5000 });
        if (response.status === 200) {
          corsIssueCount++;
          console.log(`   🚫 URL works but has CORS restrictions - will replace`);
        } else {
          brokenCount++;
          console.log(`   ❌ URL is completely broken`);
        }
      } catch {
        brokenCount++;
        console.log(`   ❌ URL is completely broken`);
      }
      
      // Find a replacement
      const newUrl = await findWorkingImageUrl(book);
      
      if (newUrl) {
        // Update the database using Supabase
        const { error: updateError } = await supabase
          .from('book')
          .update({ coverImage: newUrl })
          .eq('id', book.id);
        
        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`);
          failedCount++;
        } else {
          fixedCount++;
          console.log(`   ✅ Updated with CORS-friendly URL: ${newUrl}`);
        }
      } else {
        // Remove the broken URL so SVG fallback will work
        const { error: updateError } = await supabase
          .from('book')
          .update({ coverImage: null })
          .eq('id', book.id);
        
        if (updateError) {
          console.log(`   ❌ Failed to clear URL: ${updateError.message}`);
          failedCount++;
        } else {
          fixedCount++;
          console.log(`   ✅ Cleared broken URL - SVG fallback will now show`);
        }
      }
      
      // Small delay to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 Summary:');
    console.log(`   📚 Total books checked: ${checkedCount}`);
    console.log(`   ❌ Broken URLs found: ${brokenCount}`);
    console.log(`   🚫 CORS-restricted URLs: ${corsIssueCount}`);
    console.log(`   ✅ URLs fixed/cleared: ${fixedCount}`);
    console.log(`   ⚠️ Could not fix: ${failedCount}`);
    console.log(`   💚 Working CORS-friendly URLs: ${checkedCount - brokenCount - corsIssueCount}`);
    
  } catch (error) {
    console.error('💥 Error during image fixing:', error);
  }
}

// Run the script
if (require.main === module) {
  console.log('🔧 Starting CORS-friendly image URL fix...');
  fixBrokenImagesWithCors()
    .then(() => {
      console.log('✨ CORS-friendly image fixing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixBrokenImagesWithCors, testImageUrl, findWorkingImageUrl }; 