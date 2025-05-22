"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const dataIngestion_service_1 = require("../services/dataIngestion.service");
const openLibrary_service_1 = require("../services/openLibrary.service");
const Book_1 = require("../entities/Book");
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
async function main() {
    try {
        // Initialize database connection
        await database_1.AppDataSource.initialize();
        console.log('Database connection established');
        // Initialize OpenLibrary API
        const openLibraryAPI = new openLibrary_service_1.OpenLibraryAPI();
        // Initialize repositories
        const bookRepository = database_1.AppDataSource.getRepository(Book_1.Book);
        // Initialize the data ingestion service
        const dataIngestionService = new dataIngestion_service_1.DataIngestionService();
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
                    const existingBook = await database_1.AppDataSource.query(checkQuery, [result.title, result.author]);
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
                        await database_1.AppDataSource.query(updateQuery, [
                            result.publishedYear || '',
                            result.coverImage || null,
                            result.description || 'No description available',
                            result.pace || 'Moderate',
                            result.tone || [],
                            result.themes || [],
                            result.bestFor || [],
                            result.pageCount || null,
                            existingBook[0].id
                        ]);
                        console.log(`Book "${result.title}" updated successfully`);
                    }
                    else {
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
                        await database_1.AppDataSource.query(insertQuery, [
                            (0, uuid_1.v4)(),
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
                        ]);
                        console.log(`Book "${result.title}" saved successfully`);
                    }
                }
                catch (error) {
                    console.error(`Error saving book "${result.title}":`, error);
                }
                console.log('------------------------------------');
            }
            else {
                console.log(`No data found for "${book.title}" by ${book.author}`);
            }
        }
        console.log('Data fetch and storage completed successfully');
    }
    catch (error) {
        console.error('Error during data fetch:', error);
        process.exit(1);
    }
    finally {
        await database_1.AppDataSource.destroy();
    }
}
main();
