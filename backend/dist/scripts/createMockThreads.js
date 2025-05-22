"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Book_1 = require("../entities/Book");
const Thread_1 = require("../entities/Thread");
const User_1 = require("../entities/User");
const uuid_1 = require("uuid");
const nlp_service_1 = require("../services/nlp.service");
const MOCK_THREADS = [
    {
        title: "Books that changed your perspective on life?",
        description: "I'm looking for books that fundamentally shifted how you see the world. Books that made you question your assumptions or changed your outlook on important issues. What book changed your perspective the most and how?",
        tags: ["Philosophy", "Life", "Perspective", "Recommendations"],
    },
    {
        title: "What's your favorite epic fantasy series?",
        description: "I just finished Wheel of Time and need a new epic fantasy series to dive into. I love detailed world-building, complex magic systems, and character development over multiple books. What are your top recommendations for epic fantasy series?",
        tags: ["Fantasy", "Series", "Epic", "Recommendations"],
    },
    {
        title: "Books with unreliable narrators",
        description: "I'm fascinated by books where you can't fully trust the narrator. Books like Gone Girl, Fight Club, or The Murder of Roger Ackroyd where the narrator is deliberately misleading or has a limited perspective. What are your favorite books with unreliable narrators?",
        tags: ["Unreliable Narrator", "Fiction", "Psychological", "Recommendations"],
    },
    {
        title: "Best non-fiction books of 2023 so far?",
        description: "We're halfway through the year and I'm looking to catch up on great non-fiction. What are the best non-fiction books you've read that were published in 2023? Biographies, science, history, psychology - all topics welcome!",
        tags: ["Non-fiction", "2023", "Recommendations", "New Releases"],
    },
    {
        title: "Classic literature that's actually enjoyable to read",
        description: "I want to read more classics but some of them feel like a chore. Which classic novels are genuinely enjoyable and don't feel like homework? Looking for classics with engaging stories, relatable characters, or beautiful prose that pulls you in.",
        tags: ["Classics", "Literature", "Enjoyable", "Recommendations"],
    },
    {
        title: "Science fiction that predicted the future",
        description: "I'm interested in science fiction novels that accurately predicted future technologies or social changes. Books like Neuromancer predicting the internet or 1984 forecasting surveillance states. What sci-fi books do you think were most prescient?",
        tags: ["Science Fiction", "Predictions", "Technology", "Society"],
    },
    {
        title: "Books that helped you through difficult times",
        description: "Life has been challenging lately, and I'm looking for books that might help. What books provided you comfort, guidance, or distraction during difficult periods in your life? Fiction or non-fiction welcome.",
        tags: ["Self-help", "Comfort", "Healing", "Recommendations"],
    },
    {
        title: "Hidden gems: Books with under 1000 ratings on Goodreads",
        description: "What's your favorite under-appreciated book? I'm looking for amazing books that haven't gotten the attention they deserve. Share books you love that have fewer than 1000 ratings on Goodreads or similar platforms.",
        tags: ["Hidden Gems", "Underrated", "Recommendations"],
    },
    {
        title: "Books where the setting is almost a character",
        description: "I love books where the setting is so vivid and important it feels like another character. Books like The Secret History (Hampden College), Harry Potter (Hogwarts), or One Hundred Years of Solitude (Macondo). What books have settings that came alive for you?",
        tags: ["Setting", "Place", "Worldbuilding", "Recommendations"],
    },
    {
        title: "Books that made you laugh out loud",
        description: "I need something genuinely funny to read. What books actually made you laugh out loud, not just smile? Looking for any genre - comedy, memoir, fiction - as long as it's truly funny.",
        tags: ["Humor", "Comedy", "Funny", "Recommendations"],
    }
];
async function main() {
    try {
        // Initialize database connection
        await database_1.AppDataSource.initialize();
        console.log('Database connection established');
        // Create a default user if none exists
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        let adminUser = await userRepository.findOne({ where: { username: 'admin' } });
        if (!adminUser) {
            adminUser = new User_1.User();
            adminUser.id = (0, uuid_1.v4)();
            adminUser.username = 'admin';
            adminUser.email = 'admin@example.com';
            adminUser.password = 'hashedpassword'; // In a real app, this would be properly hashed
            await userRepository.save(adminUser);
            console.log('Created admin user');
        }
        // Get all books to associate with threads
        const bookRepository = database_1.AppDataSource.getRepository(Book_1.Book);
        const books = await bookRepository.find();
        if (books.length === 0) {
            console.log('No books found in database. Please run the book import script first.');
            return;
        }
        console.log(`Found ${books.length} books to associate with threads`);
        // Create threads
        const threadRepository = database_1.AppDataSource.getRepository(Thread_1.Thread);
        const nlpService = new nlp_service_1.NLPService();
        let createdCount = 0;
        for (const mockThread of MOCK_THREADS) {
            // Check if thread already exists
            const existingThread = await threadRepository
                .createQueryBuilder('thread')
                .where('LOWER(thread.title) = LOWER(:title)', { title: mockThread.title })
                .getOne();
            if (existingThread) {
                console.log(`Thread "${mockThread.title}" already exists, skipping`);
                continue;
            }
            // Create new thread
            const thread = new Thread_1.Thread();
            thread.title = mockThread.title;
            thread.description = mockThread.description;
            thread.tags = mockThread.tags;
            thread.upvotes = Math.floor(Math.random() * 100) + 1;
            thread.comments = Math.floor(Math.random() * 30) + 1;
            thread.createdBy = adminUser;
            // Analyze text with NLP to find themes
            const themes = await nlpService.extractThemes(thread.title + ' ' + thread.description);
            // Find related books based on themes
            let relatedBooks = [];
            if (themes.length > 0) {
                for (const book of books) {
                    if (!book.themes)
                        continue;
                    // Check if any themes match
                    const hasMatchingTheme = themes.some(theme => book.themes && book.themes.includes(theme));
                    if (hasMatchingTheme) {
                        relatedBooks.push(book);
                        // Limit to 3 related books per thread
                        if (relatedBooks.length >= 3)
                            break;
                    }
                }
            }
            // If no matches by theme, pick some random books
            if (relatedBooks.length === 0) {
                // Get 1-3 random books
                const numBooks = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < numBooks; i++) {
                    const randomIndex = Math.floor(Math.random() * books.length);
                    relatedBooks.push(books[randomIndex]);
                }
            }
            thread.books = relatedBooks;
            // Save thread
            await threadRepository.save(thread);
            createdCount++;
            console.log(`Created thread: "${thread.title}" with ${thread.books.length} related books`);
        }
        console.log(`Successfully created ${createdCount} threads`);
        // Close database connection
        await database_1.AppDataSource.destroy();
        console.log('Database connection closed');
    }
    catch (error) {
        console.error('Error creating mock threads:', error);
        process.exit(1);
    }
}
// Run the script
main();
