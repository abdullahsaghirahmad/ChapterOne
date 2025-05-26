"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionService = void 0;
const database_1 = require("../config/database");
const Book_1 = require("../entities/Book");
const Thread_1 = require("../entities/Thread");
const User_1 = require("../entities/User");
const reddit_service_1 = require("./reddit.service");
const openLibrary_service_1 = require("./openLibrary.service");
const nlp_service_1 = require("./nlp.service");
const uuid_1 = require("uuid");
class DataIngestionService {
    constructor() {
        this.bookRepository = database_1.AppDataSource.getRepository(Book_1.Book);
        this.threadRepository = database_1.AppDataSource.getRepository(Thread_1.Thread);
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User);
        this.nlpService = new nlp_service_1.NLPService();
        this.redditAPI = new reddit_service_1.RedditAPI();
        this.openLibraryAPI = new openLibrary_service_1.OpenLibraryAPI();
    }
    async ingestRedditData() {
        try {
            console.log('Skipping Reddit data ingestion due to user creation issues.');
            // Extract some book titles to search for in OpenLibrary
            const popularBooks = [
                { title: "The Lord of the Rings", author: "J.R.R. Tolkien" },
                { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling" },
                { title: "To Kill a Mockingbird", author: "Harper Lee" },
                { title: "1984", author: "George Orwell" },
                { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
                { title: "Pride and Prejudice", author: "Jane Austen" },
                { title: "The Catcher in the Rye", author: "J.D. Salinger" }
            ];
            for (const bookData of popularBooks) {
                // Enhance book data with Open Library
                const enhancedData = await this.enhanceBookData(bookData);
                await this.processBookData(enhancedData);
            }
        }
        catch (error) {
            console.error('Error ingesting Reddit data:', error);
            throw error;
        }
    }
    async ingestStorygraphData() {
        try {
            // Fetch trending books from Storygraph
            // Get trending books from the database instead
            const trendingBooks = await this.bookRepository.find({
                take: 5,
                order: { rating: 'DESC' }
            });
            for (const bookData of trendingBooks) {
                // Enhance book data with Open Library
                const enhancedData = await this.enhanceBookData(bookData);
                await this.processBookData(enhancedData);
            }
        }
        catch (error) {
            console.error('Error ingesting Storygraph data:', error);
            throw error;
        }
    }
    async ingestOpenLibraryData() {
        try {
            // Search for popular books
            const searchQueries = [
                'bestselling books',
                'award winning books',
                'classic literature',
                'contemporary fiction'
            ];
            for (const query of searchQueries) {
                const books = await this.openLibraryAPI.searchBooks(query);
                for (const bookData of books) {
                    await this.processBookData(bookData);
                }
            }
        }
        catch (error) {
            console.error('Error ingesting Open Library data:', error);
            throw error;
        }
    }
    async enhanceBookData(bookData) {
        // Try to get additional data from Open Library
        if (bookData.title && bookData.author) {
            const openLibraryBooks = await this.openLibraryAPI.searchBooks(`${bookData.title} ${bookData.author}`);
            if (openLibraryBooks.length > 0) {
                const openLibraryData = openLibraryBooks[0];
                return {
                    ...bookData,
                    ...openLibraryData,
                    // Use NLP to enhance the data
                    themes: await this.nlpService.extractThemes(`${bookData.title} ${bookData.description || ''}`),
                    tone: await this.nlpService.extractTone(bookData.description || ''),
                    pace: await this.nlpService.determinePace(bookData.description || '', bookData.pageCount),
                    bestFor: await this.nlpService.determineBestFor(bookData.description || '', bookData.categories || bookData.subjects, bookData.pageCount)
                };
            }
        }
        return bookData;
    }
    /**
     * Process and store book data from various sources
     */
    async processBookData(bookData) {
        try {
            // Check if book already exists
            const existingBook = await this.bookRepository.findOne({
                where: [
                    { isbn: bookData.isbn },
                    { title: bookData.title, author: bookData.author }
                ]
            });
            if (existingBook) {
                return existingBook;
            }
            // Create new book
            const book = new Book_1.Book();
            book.title = bookData.title;
            book.author = bookData.author;
            book.isbn = bookData.isbn;
            book.publishedYear = bookData.publishedYear;
            book.coverImage = bookData.coverImage;
            book.description = bookData.description;
            book.pace = bookData.pace;
            book.tone = bookData.tone;
            book.themes = bookData.themes;
            book.bestFor = bookData.bestFor;
            book.categories = bookData.categories;
            book.pageCount = bookData.pageCount;
            return await this.bookRepository.save(book);
        }
        catch (error) {
            console.error('Error processing book data:', error);
            return null;
        }
    }
    async getOrCreateRedditUser(username) {
        try {
            // First try to find the user
            const existingUser = await this.userRepository.findOne({
                where: { username }
            });
            if (existingUser) {
                return existingUser;
            }
            // If user doesn't exist, create a new one
            const userData = {
                username,
                email: `${username}@reddit.com`, // Placeholder email
                password: Math.random().toString(36).slice(-8) // Random password
            };
            const savedUser = await this.userRepository.save(userData);
            return savedUser;
        }
        catch (error) {
            console.error(`Error in getOrCreateRedditUser for username ${username}:`, error);
            throw error;
        }
    }
    extractBookMentions(title, content) {
        // Extract book mentions from title and content
        const text = `${title} ${content}`;
        const bookMentions = [];
        // Look for patterns like "Book Title" by Author
        const bookPattern = /"([^"]+)"\s+by\s+([^,.]+)/g;
        let match;
        while ((match = bookPattern.exec(text)) !== null) {
            bookMentions.push({
                title: match[1],
                author: match[2].trim()
            });
        }
        return bookMentions;
    }
    /**
     * Process and store thread data from various sources
     */
    async processThreadData(threadData) {
        try {
            // Create default admin user if none exists
            let user = await this.userRepository.findOne({
                where: { username: 'admin' }
            });
            if (!user) {
                user = new User_1.User();
                user.id = threadData.createdById || (0, uuid_1.v4)();
                user.username = 'admin';
                user.email = 'admin@example.com';
                user.password = 'hashed_password'; // In a real app, this would be properly hashed
                await this.userRepository.save(user);
            }
            // Check if thread already exists (by title and description)
            const existingThread = await this.threadRepository
                .createQueryBuilder('thread')
                .where('LOWER(thread.title) = LOWER(:title)', { title: threadData.title })
                .andWhere('LOWER(thread.description) = LOWER(:description)', { description: threadData.description })
                .getOne();
            if (existingThread) {
                return existingThread;
            }
            // Create new thread
            const thread = new Thread_1.Thread();
            thread.title = threadData.title;
            thread.description = threadData.description;
            thread.tags = threadData.tags;
            thread.upvotes = threadData.upvotes || 0;
            thread.comments = threadData.comments || 0;
            thread.createdBy = user;
            // If there are related books, associate them
            if (threadData.relatedBooks && threadData.relatedBooks.length > 0) {
                const books = await this.bookRepository
                    .createQueryBuilder('book')
                    .where('book.title IN (:...titles)', { titles: threadData.relatedBooks })
                    .getMany();
                if (books.length > 0) {
                    thread.books = books;
                }
            }
            return await this.threadRepository.save(thread);
        }
        catch (error) {
            console.error('Error processing thread data:', error);
            return null;
        }
    }
    /**
     * Fetch and process threads from Reddit
     */
    async fetchThreadsFromReddit(subreddit, limit = 20) {
        try {
            const threads = [];
            const posts = await this.redditAPI.getTopPosts(subreddit, limit);
            for (const post of posts) {
                // Skip posts that are just images or links with no content
                if (!post.selftext || post.selftext.length < 50)
                    continue;
                // Extract themes using NLP
                const themes = await this.nlpService.extractThemes(post.title + ' ' + post.selftext);
                // Create thread data
                const threadData = {
                    title: post.title,
                    description: post.selftext.substring(0, 500), // Truncate long texts
                    tags: themes.length > 0 ? themes : [subreddit],
                    upvotes: post.ups,
                    comments: post.num_comments,
                    createdById: '', // Will be set to admin user
                    source: 'reddit',
                    sourceId: post.id
                };
                // Extract book titles mentioned in the post
                const bookTitles = await this.extractBookTitles(post.title + ' ' + post.selftext);
                if (bookTitles.length > 0) {
                    threadData.relatedBooks = bookTitles;
                }
                const thread = await this.processThreadData(threadData);
                if (thread) {
                    threads.push(thread);
                }
            }
            return threads;
        }
        catch (error) {
            console.error(`Error fetching threads from r/${subreddit}:`, error);
            return [];
        }
    }
    /**
     * Extract potential book titles from text using NLP
     */
    async extractBookTitles(text) {
        try {
            // Simple approach: Look for text in quotes that might be book titles
            const quotedTextRegex = /"([^"]+)"|'([^']+)'/g;
            const matches = [...text.matchAll(quotedTextRegex)];
            const potentialTitles = matches
                .map(match => match[1] || match[2])
                .filter(title => title.length > 3 && title.length < 100); // Reasonable title length
            // Check if these titles exist in our database
            const existingBooks = await this.bookRepository
                .createQueryBuilder('book')
                .where('LOWER(book.title) IN (:...titles)', {
                titles: potentialTitles.map(t => t.toLowerCase())
            })
                .getMany();
            const existingTitles = existingBooks.map(book => book.title);
            // Return both existing titles and potential new ones (limited to avoid too many false positives)
            return [...new Set([...existingTitles, ...potentialTitles.slice(0, 3)])];
        }
        catch (error) {
            console.error('Error extracting book titles:', error);
            return [];
        }
    }
    /**
     * Generate discussion threads based on popular books
     */
    async generateDiscussionThreads() {
        try {
            const threads = [];
            const popularBooks = await this.bookRepository.find({
                take: 10,
                order: { rating: 'DESC' }
            });
            if (popularBooks.length === 0)
                return [];
            const discussionTemplates = [
                { title: "What did you think about {book}?", description: "I just finished reading {book} by {author} and I'm curious what others thought. What were your favorite moments? Did you like the ending?" },
                { title: "Book Club: {book} - Discussion Thread", description: "This month we're reading {book} by {author}. Share your thoughts, questions, and observations about this book." },
                { title: "Looking for books similar to {book}", description: "I really enjoyed {book} by {author} and I'm looking for similar books with {themes}. Any recommendations?" },
                { title: "Character Analysis: {book}", description: "Let's discuss the character development in {book} by {author}. Which characters did you connect with the most?" }
            ];
            for (const book of popularBooks) {
                // Pick a random template for each book
                const template = discussionTemplates[Math.floor(Math.random() * discussionTemplates.length)];
                const threadData = {
                    title: template.title.replace('{book}', book.title),
                    description: template.description
                        .replace('{book}', book.title)
                        .replace('{author}', book.author)
                        .replace('{themes}', book.themes?.join(', ') || 'these themes'),
                    tags: [...(book.themes || []), ...(book.categories || [])].slice(0, 5),
                    upvotes: Math.floor(Math.random() * 50) + 5,
                    comments: Math.floor(Math.random() * 20) + 1,
                    createdById: '',
                    relatedBooks: [book.title]
                };
                const thread = await this.processThreadData(threadData);
                if (thread) {
                    threads.push(thread);
                }
            }
            return threads;
        }
        catch (error) {
            console.error('Error generating discussion threads:', error);
            return [];
        }
    }
}
exports.DataIngestionService = DataIngestionService;
