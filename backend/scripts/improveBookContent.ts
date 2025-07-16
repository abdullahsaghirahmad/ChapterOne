import { createClient } from '@supabase/supabase-js';
import { LLMService } from '../src/services/llm.service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Improve book content with LLM-generated descriptions and quotes
 */
async function improveBookContent() {
  console.log('🚀 Starting book content improvement...');
  console.log('📝 Generating descriptions and quotes using LLM');
  console.log('='.repeat(70));
  
  try {
    // Initialize LLM service
    console.log('🧠 Initializing LLM service...');
    const llmService = new LLMService();
    
    // Fetch all books
    console.log('📚 Fetching books from Supabase...');
    const { data: books, error } = await supabase
      .from('book')
      .select('*')
      .order('title');
      
    if (error) {
      throw new Error(`Failed to fetch books: ${error.message}`);
    }
    
    if (!books || books.length === 0) {
      console.log('📭 No books found in database');
      return;
    }
    
    console.log(`📊 Found ${books.length} books to improve`);
    
    let processed = 0;
    let updated = 0;
    let descriptionUpdates = 0;
    let quoteUpdates = 0;
    let errors = 0;
    
    console.log('\n📖 Starting content improvement...\n');
    
    for (const book of books) {
      processed++;
      console.log(`[${processed}/${books.length}] Processing: "${book.title}" by ${book.author}`);
      
      try {
        let needsUpdate = false;
        let updatedDescription = book.description;
        let updatedQuote = book.quote;
        
        // Check if description needs improvement
        const needsDescriptionUpdate = !book.description || 
          book.description === 'No description available' || 
          book.description.length < 50;
        
        // Check if quote is missing
        const needsQuoteUpdate = !book.quote;
        
        if (needsDescriptionUpdate) {
          console.log(`  📝 Generating description...`);
          try {
            updatedDescription = await llmService.generateDescription(
              book.title, 
              book.author, 
              book.description
            );
            
            if (updatedDescription && updatedDescription !== book.description) {
              console.log(`  ✅ Generated description: ${updatedDescription.substring(0, 60)}...`);
              needsUpdate = true;
              descriptionUpdates++;
            }
          } catch (error) {
            console.log(`  ⚠️ Description generation failed: ${error}`);
          }
        }
        
        if (needsQuoteUpdate) {
          console.log(`  💬 Generating quote...`);
          try {
            updatedQuote = await llmService.generateQuote(
              book.title, 
              book.author, 
              updatedDescription
            );
            
            if (updatedQuote) {
              console.log(`  ✅ Generated quote: "${updatedQuote.substring(0, 40)}..."`);
              needsUpdate = true;
              quoteUpdates++;
            }
          } catch (error) {
            console.log(`  ⚠️ Quote generation failed: ${error}`);
          }
        }
        
        // Update the book if needed
        if (needsUpdate) {
          const updateData: any = {
            updatedAt: new Date().toISOString()
          };
          
          if (needsDescriptionUpdate && updatedDescription) {
            updateData.description = updatedDescription;
          }
          
          if (needsQuoteUpdate && updatedQuote) {
            updateData.quote = updatedQuote;
          }
          
          const { error: updateError } = await supabase
            .from('book')
            .update(updateData)
            .eq('id', book.id);
            
          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }
          
          console.log(`  💾 Updated book in database`);
          updated++;
        } else {
          console.log(`  ℹ️ No updates needed`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Error processing "${book.title}":`, error);
        errors++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Final summary
    console.log('='.repeat(70));
    console.log('📊 CONTENT IMPROVEMENT COMPLETE');
    console.log('='.repeat(70));
    console.log(`📚 Total books processed: ${processed}`);
    console.log(`✅ Books updated: ${updated}`);
    console.log(`📝 Descriptions generated: ${descriptionUpdates}`);
    console.log(`💬 Quotes generated: ${quoteUpdates}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(70));
    
    if (updated > 0) {
      console.log(`\n🎉 Successfully improved content for ${updated} books!`);
      console.log(`📈 Improvement rate: ${((updated / processed) * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('💥 Content improvement failed:', error);
    process.exit(1);
  }
}

// Run the improvement
if (require.main === module) {
  improveBookContent()
    .then(() => {
      console.log('\n✅ Content improvement completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Content improvement failed:', error);
      process.exit(1);
    });
}

export { improveBookContent }; 