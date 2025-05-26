#!/bin/bash

# Database connection details
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="chapterone"

# Function to display usage
usage() {
    echo "Usage: $0 \"<title>\" \"<description>\" \"<tags>\" [upvotes] [comments]"
    echo ""
    echo "Examples:"
    echo "  $0 \"Best sci-fi books?\" \"Looking for recommendations\" \"sci-fi,recommendations\""
    echo "  $0 \"Fantasy series\" \"Epic fantasy recommendations\" \"fantasy,series\" 25 12"
    echo ""
    echo "Parameters:"
    echo "  title       - Thread title (required)"
    echo "  description - Thread description (required)"
    echo "  tags        - Comma-separated tags (required)"
    echo "  upvotes     - Number of upvotes (optional, default: random 15-100)"
    echo "  comments    - Number of comments (optional, default: random 5-50)"
    exit 1
}

# Check if minimum required parameters are provided
if [ $# -lt 3 ]; then
    echo "❌ Error: Missing required parameters"
    usage
fi

# Get parameters
TITLE="$1"
DESCRIPTION="$2"
TAGS="$3"
UPVOTES="${4:-$((RANDOM % 86 + 15))}"  # Random between 15-100 if not provided
COMMENTS="${5:-$((RANDOM % 46 + 5))}"  # Random between 5-50 if not provided

# Escape single quotes
TITLE=$(echo "$TITLE" | sed "s/'/''/g")
DESCRIPTION=$(echo "$DESCRIPTION" | sed "s/'/''/g")

echo "🚀 Adding new thread to ChapterOne database..."
echo "=============================================="
echo "📝 Title: $TITLE"
echo "📄 Description: ${DESCRIPTION:0:100}..."
echo "🏷️  Tags: $TAGS"
echo "👍 Upvotes: $UPVOTES"
echo "💬 Comments: $COMMENTS"
echo ""

# Add the thread
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    INSERT INTO thread (title, description, tags, upvotes, comments, \"createdAt\", \"updatedAt\")
    VALUES ('$TITLE', '$DESCRIPTION', '$TAGS', $UPVOTES, $COMMENTS, NOW(), NOW());
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Successfully added thread: $TITLE"
    
    # Get the new thread count
    thread_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM thread;" | xargs)
    echo "📊 Total threads in database: $thread_count"
else
    echo "❌ Failed to add thread: $TITLE"
    echo "💡 Make sure the database is running and accessible"
    exit 1
fi

echo "==============================================" 