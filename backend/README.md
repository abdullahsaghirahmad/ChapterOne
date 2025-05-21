# ChapterOne Backend

This is the backend service for the ChapterOne book recommendation application. It provides a RESTful API for managing books, threads, and user data.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a PostgreSQL database named `chapterone`

3. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=3001

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=chapterone

   # JWT
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Data Ingestion

The application can ingest data from multiple sources:

1. Reddit communities:
   - r/52books
   - r/suggestmeabook
   - r/booksuggestions

2. Storygraph API:
   - Trending books
   - Book details
   - Reading statistics

3. Open Library:
   - Bestselling books
   - Award-winning books
   - Classic literature
   - Contemporary fiction

To run the data ingestion process:
```bash
npm run ingest
```

This will:
1. Fetch posts from Reddit communities
2. Extract book mentions and create threads
3. Fetch trending books from Storygraph
4. Fetch books from Open Library
5. Combine and deduplicate the data
6. Store everything in the database

## API Endpoints

### Books
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get book by ID
- `GET /api/books/search/:query` - Search books
- `POST /api/books` - Create new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

### Threads
- `GET /api/threads` - Get all threads
- `GET /api/threads/:id` - Get thread by ID
- `POST /api/threads` - Create new thread
- `PUT /api/threads/:id` - Update thread
- `DELETE /api/threads/:id` - Delete thread
- `POST /api/threads/:id/upvote` - Upvote thread

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run ingest` - Run data ingestion process 