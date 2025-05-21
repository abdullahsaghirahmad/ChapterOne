import { AppDataSource } from '../config/database';
import { DataIngestionService } from '../services/dataIngestion.service';
import { RedditAPI } from '../services/reddit.service';
import { StorygraphAPI } from '../services/storygraph.service';
import { OpenLibraryAPI } from '../services/openLibrary.service';
import { NLPService } from '../services/nlp.service';
import { Book } from '../entities/Book';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function main() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Initialize OpenLibrary API
    const openLibraryAPI = new OpenLibraryAPI();

    // Initialize repositories
    const bookRepository = AppDataSource.getRepository(Book);

    // Initialize the data ingestion service
    const dataIngestionService = new DataIngestionService();

    console.log('Starting data fetch process...');

    console.log('Fetching book data from sample list...');
    // Create a list of popular books to fetch data for
    const popularBooks = [
      { title: "The Lord of the Rings", author: "J.R.R. Tolkien" },
      { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling" },
      { title: "To Kill a Mockingbird", author: "Harper Lee" },
      { title: "1984", author: "George Orwell" },
      { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
      { title: "Pride and Prejudice", author: "Jane Austen" },
      { title: "The Catcher in the Rye", author: "J.D. Salinger" }
    ];
    
    // Fetch data for each book from Open Library and save to database
    for (const book of popularBooks) {
      console.log(`Fetching data for "${book.title}" by ${book.author}...`);
      const bookData = await openLibraryAPI.searchBooks(`${book.title} ${book.author}`, 1);
      if (bookData.length > 0) {
        // Process the first result
        const result = bookData[0];
        console.log('Book data fetched successfully:');
        console.log(`Title: ${result.title}`);
        console.log(`Author: ${result.author}`);
        console.log(`Year: ${result.publishedYear}`);
        console.log(`Cover: ${result.coverImage || 'No cover image'}`);
        console.log(`Description: ${result.description || 'No description'}`);
        console.log(`Pace: ${result.pace}`);
        console.log(`Tone: ${result.tone.join(', ') || 'None identified'}`);
        console.log(`Themes: ${result.themes.join(', ') || 'None identified'}`);
        console.log(`Best For: ${result.bestFor.join(', ') || 'General Audience'}`);
        
        // Save the book to the database using direct SQL
        try {
          // Check if book already exists
          const checkQuery = `
            SELECT id FROM book 
            WHERE title = $1 AND author = $2
          `;
          
          const existingBook = await AppDataSource.query(
            checkQuery,
            [result.title, result.author]
          );
          
          if (existingBook.length > 0) {
            console.log(`Book "${result.title}" already exists, updating...`);
            
            // Update existing book
            const updateQuery = `
              UPDATE book 
              SET 
                "publishedYear" = $1,
                "coverImage" = $2,
                description = $3,
                pace = $4,
                tone = $5,
                themes = $6,
                "bestFor" = $7,
                "pageCount" = $8,
                "updatedAt" = NOW()
              WHERE id = $9
            `;
            
            await AppDataSource.query(
              updateQuery,
              [
                result.publishedYear || '',
                result.coverImage || null,
                result.description || 'No description available',
                result.pace || 'Moderate',
                result.tone || [],
                result.themes || [],
                result.bestFor || [],
                result.pageCount || null,
                existingBook[0].id
              ]
            );
            
            console.log(`Book "${result.title}" updated successfully`);
            
          } else {
            console.log(`Adding new book "${result.title}" to database...`);
            
            // Create new book
            const insertQuery = `
              INSERT INTO book (
                id, title, author, "publishedYear", "coverImage", 
                description, pace, tone, themes, "bestFor", 
                "pageCount", "createdAt", "updatedAt"
              ) 
              VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, $10, 
                $11, NOW(), NOW()
              )
            `;
            
            await AppDataSource.query(
              insertQuery,
              [
                uuidv4(),
                result.title,
                result.author,
                result.publishedYear || '',
                result.coverImage || null,
                result.description || 'No description available',
                result.pace || 'Moderate',
                result.tone || [],
                result.themes || [],
                result.bestFor || [],
                result.pageCount || null
              ]
            );
            
            console.log(`Book "${result.title}" saved successfully`);
          }
          
        } catch (error) {
          console.error(`Error saving book "${result.title}":`, error);
        }
        
        console.log('------------------------------------');
      } else {
        console.log(`No data found for "${book.title}" by ${book.author}`);
      }
    }

    console.log('Data fetch and storage completed successfully');
  } catch (error) {
    console.error('Error during data fetch:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main(); 