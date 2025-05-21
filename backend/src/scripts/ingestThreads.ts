import { AppDataSource } from '../config/database';
import { DataIngestionService } from '../services/dataIngestion.service';
import dotenv from 'dotenv';

dotenv.config();

// List of book-related subreddits
const BOOK_SUBREDDITS = [
  'books',
  'literature',
  'booksuggestions',
  'suggestmeabook',
  'Fantasy',
  'sciencefiction',
  'YAlit',
  'bookclub',
  'whattoreadwhen',
  'horrorlit'
];

async function main() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Initialize ingestion service
    const dataIngestionService = new DataIngestionService();
    
    // Fetch Reddit threads
    console.log('Fetching threads from Reddit...');
    let totalThreads = 0;
    
    // Process each subreddit
    for (const subreddit of BOOK_SUBREDDITS) {
      console.log(`Processing r/${subreddit}...`);
      const threads = await dataIngestionService.fetchThreadsFromReddit(subreddit, 10);
      console.log(`Imported ${threads.length} threads from r/${subreddit}`);
      totalThreads += threads.length;
    }
    
    // Generate discussion threads based on books in our database
    console.log('Generating book discussion threads...');
    const discussionThreads = await dataIngestionService.generateDiscussionThreads();
    console.log(`Generated ${discussionThreads.length} discussion threads`);
    
    totalThreads += discussionThreads.length;
    
    console.log(`Successfully imported a total of ${totalThreads} threads`);
    
    // Close database connection
    await AppDataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error ingesting threads:', error);
    process.exit(1);
  }
}

// Run the script
main(); 