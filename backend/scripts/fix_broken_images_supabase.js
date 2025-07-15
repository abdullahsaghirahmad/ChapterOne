const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://lrnxluoicdtonxrbteit.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('Please set SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Google Books API (no key required for basic search)
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Open Library API
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';

// Test if an image URL is working
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
    return response.status === 200;
  } catch (error) {
    console.log(`  ❌ URL failed: ${error.message}`);
    return false;
  }
}

// Search Google Books for a cover image
async function searchGoogleBooksImage(title, author) {
  try {
    const query = `${title} ${author}`.replace(/[^\w\s]/g, '').trim();
    const response = await axios.get(GOOGLE_BOOKS_API, {
      params: {
        q: query,
        maxResults: 5
      },
      timeout: 10000
    });

    const books = response.data.items || [];
    for (const book of books) {
      if (book.volumeInfo?.imageLinks?.thumbnail) {
        // Convert to high resolution
        let imageUrl = book.volumeInfo.imageLinks.thumbnail;
        imageUrl = imageUrl.replace('&zoom=1', '&zoom=2');
        imageUrl = imageUrl.replace('&edge=curl', '');
        
        // Test if the image works
        if (await testImageUrl(imageUrl)) {
          return imageUrl;
        }
      }
    }
  } catch (error) {
    console.log(`  ⚠️ Google Books search failed: ${error.message}`);
  }
  return null;
}

// Search Open Library for a cover image
async function searchOpenLibraryImage(title, author, isbn) {
  try {
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
        limit: 5
      },
      timeout: 10000
    });

    const books = response.data.docs || [];
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

// Find a working image URL for a book
async function findWorkingImageUrl(book) {
  console.log(`🔍 Searching for new image for "${book.title}" by ${book.author}`);
  
  // Try Google Books first
  let newUrl = await searchGoogleBooksImage(book.title, book.author);
  if (newUrl) {
    console.log(`  ✅ Found on Google Books: ${newUrl}`);
    return newUrl;
  }

  // Try Open Library
  newUrl = await searchOpenLibraryImage(book.title, book.author, book.isbn);
  if (newUrl) {
    console.log(`  ✅ Found on Open Library: ${newUrl}`);
    return newUrl;
  }

  console.log(`  ❌ No working image found`);
  return null;
}

// Main function to check and fix all book images in Supabase
async function fixBrokenImagesSupabase() {
  try {
    console.log('🚀 Connected to Supabase');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    
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
    let fixedCount = 0;
    let failedCount = 0;

    for (const book of books) {
      checkedCount++;
      console.log(`\n📖 [${checkedCount}/${books.length}] Checking "${book.title}"`);
      console.log(`   Current URL: ${book.coverImage}`);
      
      // Test current URL
      const isWorking = await testImageUrl(book.coverImage);
      
      if (isWorking) {
        console.log(`   ✅ URL is working`);
        continue;
      }
      
      brokenCount++;
      console.log(`   ❌ URL is broken`);
      
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
          console.log(`   ✅ Updated with new URL: ${newUrl}`);
        }
      } else {
        failedCount++;
        console.log(`   ❌ Could not find replacement - keeping original URL`);
      }
      
      // Small delay to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 Summary:');
    console.log(`   📚 Total books checked: ${checkedCount}`);
    console.log(`   ❌ Broken URLs found: ${brokenCount}`);
    console.log(`   ✅ URLs fixed: ${fixedCount}`);
    console.log(`   ⚠️ Could not fix: ${failedCount}`);
    console.log(`   💚 Working URLs: ${checkedCount - brokenCount}`);
    
  } catch (error) {
    console.error('💥 Error during image fixing:', error);
  }
}

// Run the script
if (require.main === module) {
  console.log('🔧 Starting Supabase broken image URL fix...');
  fixBrokenImagesSupabase()
    .then(() => {
      console.log('✨ Supabase image fixing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixBrokenImagesSupabase, testImageUrl, findWorkingImageUrl }; 