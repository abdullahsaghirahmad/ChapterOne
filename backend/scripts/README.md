# Thread Management Scripts

This directory contains automation scripts for managing threads in the ChapterOne database.

## Prerequisites

- PostgreSQL database running locally
- Database named `chapterone` with `thread` table
- `psql` command-line tool available
- Bash shell environment

## Scripts

### 1. `add_sample_threads.sh`

Adds a comprehensive set of pre-defined sample threads covering various topics like finance, product management, UX, adventure, mystery, and more.

**Usage:**
```bash
./scripts/add_sample_threads.sh
```

**Features:**
- Adds 15+ diverse sample threads
- Includes realistic upvotes and comment counts
- Covers multiple genres and professional topics
- Shows progress and final statistics
- Skips duplicates automatically

**Sample Output:**
```
🚀 Adding sample threads to ChapterOne database...
📊 Current threads in database: 6
✅ Added: Books that explain complex economic concepts simply?
✅ Added: Books on user research and customer discovery?
...
📊 Threads before: 6
📊 Threads after: 21
➕ Threads added: 15
```

### 2. `add_thread.sh`

Adds individual custom threads with flexible parameters.

**Usage:**
```bash
./scripts/add_thread.sh "<title>" "<description>" "<tags>" [upvotes] [comments]
```

**Parameters:**
- `title` (required) - Thread title
- `description` (required) - Thread description
- `tags` (required) - Comma-separated tags
- `upvotes` (optional) - Number of upvotes (default: random 15-100)
- `comments` (optional) - Number of comments (default: random 5-50)

**Examples:**
```bash
# Basic usage with random upvotes/comments
./scripts/add_thread.sh "Best sci-fi books?" "Looking for recommendations" "sci-fi,recommendations"

# With specific upvotes and comments
./scripts/add_thread.sh "Fantasy series" "Epic fantasy recommendations" "fantasy,series" 25 12

# Complex example
./scripts/add_thread.sh "Books for learning React?" "I'm new to React and want to learn it properly. What are the best books?" "react,javascript,programming" 45 23
```

**Features:**
- Flexible parameter system
- Automatic quote escaping
- Random upvotes/comments if not specified
- Progress feedback
- Error handling

## Database Schema

The scripts expect a `thread` table with the following structure:

```sql
CREATE TABLE thread (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    tags VARCHAR,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

## Configuration

Database connection settings are configured at the top of each script:

```bash
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="chapterone"
```

Modify these variables if your database setup differs.

## Troubleshooting

### Permission Denied
```bash
chmod +x scripts/add_sample_threads.sh
chmod +x scripts/add_thread.sh
```

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify database name and credentials
- Check if `psql` is in your PATH

### Quote Issues
The scripts automatically escape single quotes in titles and descriptions, but if you encounter issues, ensure proper quoting:

```bash
# Good
./scripts/add_thread.sh "Books about AI's impact" "Description here" "ai,technology"

# Avoid unescaped quotes in the middle
```

## Sample Thread Categories

The `add_sample_threads.sh` script includes threads in these categories:

- **Finance & Economics** - Personal finance, investing, economic concepts
- **Product Management** - PM skills, user research, strategy
- **UX & Design** - User experience, design systems, psychology
- **Adventure & Exploration** - Travel memoirs, exploration stories
- **Mystery & Thriller** - Psychological thrillers, cozy mysteries, sci-fi mysteries
- **Cross-genre** - Life-changing books, hidden gems, productivity
- **Technology** - Programming, future of work, AI impact

## Future Enhancements

Potential improvements for these scripts:

1. **Bulk CSV Import** - Import threads from CSV files
2. **Tag Validation** - Validate tags against existing tag lists
3. **Duplicate Detection** - More sophisticated duplicate checking
4. **Thread Templates** - Pre-defined templates for common thread types
5. **Database Backup** - Automatic backup before bulk operations

## Contributing

When adding new sample threads:

1. Follow the existing format and style
2. Include realistic descriptions (100-300 words)
3. Use relevant, searchable tags
4. Vary upvotes/comments for realism
5. Cover diverse topics and perspectives 