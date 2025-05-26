#!/bin/bash

# Database connection details
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="chapterone"

echo "🚀 Populating books and thread-book relationships..."
echo "=================================================="

# First, create the relationship table
echo "🔧 Creating thread_book relationship table..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f scripts/create_thread_book_relationships.sql > /dev/null 2>&1
echo "✅ Relationship table created"
echo ""

# Function to add a book
add_book() {
    local title="$1"
    local author="$2"
    local isbn="$3"
    local published_year="$4"
    local cover_image="$5"
    local rating="$6"
    local description="$7"
    local pace="$8"
    local tone="$9"
    local themes="${10}"
    local best_for="${11}"
    local categories="${12}"
    local professions="${13}"
    local page_count="${14}"
    
    # Escape single quotes
    title=$(echo "$title" | sed "s/'/''/g")
    author=$(echo "$author" | sed "s/'/''/g")
    description=$(echo "$description" | sed "s/'/''/g")
    
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO book (title, author, isbn, \"publishedYear\", \"coverImage\", rating, description, pace, tone, themes, \"bestFor\", categories, professions, \"pageCount\", \"createdAt\", \"updatedAt\")
        VALUES ('$title', '$author', '$isbn', '$published_year', '$cover_image', $rating, '$description', '$pace', '{$tone}', '{$themes}', '{$best_for}', '{$categories}', '{$professions}', $page_count, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Added book: $title by $author"
    else
        echo "❌ Failed to add book: $title"
    fi
}

echo "📚 Adding sample books..."
echo ""

# Finance & Economics Books
add_book "The Psychology of Money" "Morgan Housel" "9780857197689" "2020" "https://images-na.ssl-images-amazon.com/images/I/81cpDaCJJCL.jpg" 4.5 "Timeless lessons on wealth, greed, and happiness from one of the most important financial writers of our time." "Moderate" "Insightful,Practical" "Money,Psychology,Behavioral Economics" "Young Adults,Professionals" "Finance,Self-Help" "Finance,Investment" 256

add_book "Rich Dad Poor Dad" "Robert Kiyosaki" "9781612680194" "1997" "https://images-na.ssl-images-amazon.com/images/I/81bsw6fnUiL.jpg" 4.2 "What the rich teach their kids about money that the poor and middle class do not!" "Fast" "Motivational,Eye-opening" "Wealth Building,Financial Education" "Beginners,Young Adults" "Finance,Self-Help" "Finance,Entrepreneurship" 336

add_book "The Intelligent Investor" "Benjamin Graham" "9780060555665" "1949" "https://images-na.ssl-images-amazon.com/images/I/91yMGXaOTjL.jpg" 4.3 "The definitive book on value investing, a discipline that has made Warren Buffett the world's second-richest person." "Slow" "Analytical,Comprehensive" "Investing,Value Investing" "Intermediate,Advanced" "Finance,Investment" "Finance,Investment" 640

add_book "Thinking, Fast and Slow" "Daniel Kahneman" "9780374533557" "2011" "https://images-na.ssl-images-amazon.com/images/I/71T4HXnKiKL.jpg" 4.4 "A groundbreaking tour of the mind that explains the two systems that drive the way we think." "Slow" "Academic,Insightful" "Psychology,Decision Making,Behavioral Economics" "Professionals,Academics" "Psychology,Economics" "Psychology,Business" 512

# Product Management Books
add_book "Inspired" "Marty Cagan" "9781119387503" "2017" "https://images-na.ssl-images-amazon.com/images/I/71f7A1k8jCL.jpg" 4.6 "How to create tech products customers love from Silicon Valley's most respected product management thought leader." "Moderate" "Practical,Strategic" "Product Management,Technology" "Product Managers,Entrepreneurs" "Business,Technology" "Product Management,Tech" 368

add_book "The Lean Startup" "Eric Ries" "9780307887894" "2011" "https://images-na.ssl-images-amazon.com/images/I/81-QB7nDh4L.jpg" 4.3 "How today's entrepreneurs use continuous innovation to create radically successful businesses." "Fast" "Innovative,Practical" "Entrepreneurship,Innovation" "Entrepreneurs,Product Managers" "Business,Startup" "Entrepreneurship,Product Management" 336

add_book "Escaping the Build Trap" "Melissa Perri" "9781491973790" "2018" "https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg" 4.4 "How effective product management creates real value for companies and customers." "Moderate" "Strategic,Insightful" "Product Strategy,Product Management" "Product Managers,Leaders" "Business,Technology" "Product Management" 200

# UX & Design Books
add_book "Don't Make Me Think" "Steve Krug" "9780321965516" "2000" "https://images-na.ssl-images-amazon.com/images/I/71f1rtVhzQL.jpg" 4.5 "A common sense approach to web usability that has become the go-to guide for UX professionals." "Fast" "Practical,Accessible" "UX Design,Web Usability" "Designers,Developers" "Design,Technology" "UX,Web Design" 216

add_book "The Design of Everyday Things" "Don Norman" "9780465050659" "1988" "https://images-na.ssl-images-amazon.com/images/I/71yDX7CKLML.jpg" 4.3 "The ultimate guide to human-centered design that explains why some products satisfy customers while others only frustrate them." "Moderate" "Analytical,Foundational" "Design Psychology,Human-Centered Design" "Designers,Product Managers" "Design,Psychology" "Design,UX" 368

add_book "Atomic Design" "Brad Frost" "9780998296609" "2016" "https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg" 4.2 "A methodology for creating design systems that scale across teams and products." "Moderate" "Systematic,Technical" "Design Systems,Component Design" "Designers,Developers" "Design,Technology" "Design Systems,Frontend" 272

# Adventure & Exploration Books
add_book "Wild" "Cheryl Strayed" "9780307476074" "2012" "https://images-na.ssl-images-amazon.com/images/I/81cpDaCJJCL.jpg" 4.4 "A powerful, blazingly honest memoir about one woman's journey of self-discovery on the Pacific Crest Trail." "Moderate" "Emotional,Inspiring" "Self-Discovery,Adventure,Memoir" "Women,Hikers" "Memoir,Adventure" "Adventure,Self-Help" 336

add_book "Into the Wild" "Jon Krakauer" "9780385486804" "1996" "https://images-na.ssl-images-amazon.com/images/I/71T4HXnKiKL.jpg" 4.1 "The true story of Christopher McCandless, who gave up his possessions and savings to pursue a life in the wilderness." "Fast" "Gripping,Tragic" "Adventure,Survival,Biography" "Adventure Seekers,Young Adults" "Biography,Adventure" "Adventure,Biography" 224

add_book "The Lost City of Z" "David Grann" "9781400078455" "2009" "https://images-na.ssl-images-amazon.com/images/I/91yMGXaOTjL.jpg" 4.3 "A tale of deadly obsession in the Amazon about the search for a lost civilization." "Moderate" "Thrilling,Historical" "Exploration,History,Adventure" "History Buffs,Adventure Lovers" "History,Adventure" "Exploration,History" 352

add_book "Endurance" "Alfred Lansing" "9780465062881" "1959" "https://images-na.ssl-images-amazon.com/images/I/71f7A1k8jCL.jpg" 4.6 "The incredible true story of Ernest Shackleton's Antarctic expedition and the crew's fight for survival." "Moderate" "Gripping,Heroic" "Survival,Leadership,History" "Leaders,Adventure Seekers" "History,Adventure" "Leadership,Adventure" 372

# Mystery & Thriller Books
add_book "Gone Girl" "Gillian Flynn" "9780307588364" "2012" "https://images-na.ssl-images-amazon.com/images/I/81-QB7nDh4L.jpg" 4.2 "A psychological thriller about a marriage gone terribly wrong, with unreliable narrators and shocking twists." "Fast" "Dark,Twisted" "Psychological Thriller,Marriage,Deception" "Thriller Fans,Adults" "Thriller,Mystery" "Thriller,Psychology" 432

add_book "The Silent Patient" "Alex Michaelides" "9781250301697" "2019" "https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg" 4.3 "A psychological thriller about a woman who refuses to speak after allegedly murdering her husband." "Fast" "Suspenseful,Psychological" "Psychological Thriller,Mental Health" "Thriller Fans,Psychology Enthusiasts" "Thriller,Mystery" "Psychology,Thriller" 336

add_book "Project Hail Mary" "Andy Weir" "9780593135204" "2021" "https://images-na.ssl-images-amazon.com/images/I/71f1rtVhzQL.jpg" 4.7 "A science fiction thriller about an astronaut who wakes up alone on a spaceship with no memory of how he got there." "Fast" "Humorous,Scientific" "Science Fiction,Space,Problem Solving" "Sci-Fi Fans,Science Enthusiasts" "Science Fiction,Thriller" "Science,Space" 496

# Cross-genre and Productivity Books
add_book "Atomic Habits" "James Clear" "9780735211292" "2018" "https://images-na.ssl-images-amazon.com/images/I/81YkqyaFVEL.jpg" 4.6 "An easy and proven way to build good habits and break bad ones through tiny changes that deliver remarkable results." "Fast" "Practical,Motivational" "Habits,Productivity,Self-Improvement" "Everyone,Professionals" "Self-Help,Productivity" "Productivity,Psychology" 320

add_book "The 7 Habits of Highly Effective People" "Stephen Covey" "9781982137274" "1989" "https://images-na.ssl-images-amazon.com/images/I/71yDX7CKLML.jpg" 4.4 "A principle-centered approach for solving personal and professional problems." "Moderate" "Foundational,Practical" "Leadership,Personal Development" "Leaders,Professionals" "Self-Help,Business" "Leadership,Management" 384

add_book "Sapiens" "Yuval Noah Harari" "9780062316097" "2011" "https://images-na.ssl-images-amazon.com/images/I/81cpDaCJJCL.jpg" 4.5 "A brief history of humankind that challenges everything we thought we knew about being human." "Moderate" "Thought-provoking,Comprehensive" "History,Anthropology,Philosophy" "Intellectuals,Students" "History,Philosophy" "History,Philosophy" 464

# Historical Fiction
add_book "All the Light We Cannot See" "Anthony Doerr" "9781501173219" "2014" "https://images-na.ssl-images-amazon.com/images/I/91yMGXaOTjL.jpg" 4.4 "A beautiful novel about a blind French girl and a German boy whose paths collide in occupied France during WWII." "Moderate" "Beautiful,Emotional" "World War II,Coming of Age,Love" "Historical Fiction Fans,Book Clubs" "Historical Fiction,Literary Fiction" "History,Literature" 544

add_book "The Book Thief" "Markus Zusak" "9780375842207" "2005" "https://images-na.ssl-images-amazon.com/images/I/71T4HXnKiKL.jpg" 4.5 "A story about the power of words, set in Nazi Germany and narrated by Death himself." "Moderate" "Poignant,Unique" "World War II,Books,Death" "Young Adults,Historical Fiction Fans" "Historical Fiction,Young Adult" "History,Literature" 584

echo ""
echo "🔗 Creating thread-book relationships..."
echo ""

# Function to create thread-book relationships
create_relationship() {
    local thread_title="$1"
    local book_titles="$2"
    
    # Get thread ID
    thread_id=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM thread WHERE LOWER(title) LIKE LOWER('%$(echo "$thread_title" | sed "s/'/''/g")%') LIMIT 1;" | xargs)
    
    if [ -z "$thread_id" ]; then
        echo "❌ Thread not found: $thread_title"
        return
    fi
    
    echo "🔗 Adding books to thread: $thread_title"
    
    # Split book titles and create relationships
    IFS='|' read -ra BOOKS <<< "$book_titles"
    for book_title in "${BOOKS[@]}"; do
        book_id=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM book WHERE LOWER(title) = LOWER('$(echo "$book_title" | sed "s/'/''/g")') LIMIT 1;" | xargs)
        
        if [ -n "$book_id" ]; then
            # Create actual relationship in thread_book table
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                INSERT INTO thread_book (thread_id, book_id) 
                VALUES ('$thread_id', '$book_id') 
                ON CONFLICT (thread_id, book_id) DO NOTHING;
            " > /dev/null 2>&1
            echo "  ✅ Linked: $book_title"
        else
            echo "  ❌ Book not found: $book_title"
        fi
    done
}

# Create relationships based on thread content and tags
create_relationship "Psychology of Money" "The Psychology of Money|Rich Dad Poor Dad|The Intelligent Investor"
create_relationship "personal finance in your 20s" "Rich Dad Poor Dad|The Psychology of Money|Atomic Habits"
create_relationship "complex economic concepts" "Thinking, Fast and Slow|The Intelligent Investor|Sapiens"
create_relationship "Product Management Recommendations" "Inspired|The Lean Startup|Escaping the Build Trap"
create_relationship "user research and customer discovery" "Inspired|The Design of Everyday Things|Don't Make Me Think"
create_relationship "Product strategy books" "Inspired|Escaping the Build Trap|The Lean Startup"
create_relationship "UX books that changed" "Don't Make Me Think|The Design of Everyday Things|Atomic Design"
create_relationship "design systems and component" "Atomic Design|Don't Make Me Think|The Design of Everyday Things"
create_relationship "Psychology books that make you a better UX" "The Design of Everyday Things|Thinking, Fast and Slow|Don't Make Me Think"
create_relationship "Wild by Cheryl Strayed" "Wild|Into the Wild|Endurance"
create_relationship "exploration and discovery" "The Lost City of Z|Endurance|Into the Wild"
create_relationship "Adventure fiction with strong female" "Wild|All the Light We Cannot See|The Book Thief"
create_relationship "unreliable narrators" "Gone Girl|The Silent Patient|The Book Thief"
create_relationship "cozy mysteries" "The Silent Patient|Gone Girl"
create_relationship "Project Hail Mary" "Project Hail Mary|Thinking, Fast and Slow|Sapiens"
create_relationship "completely changed your worldview" "Sapiens|Thinking, Fast and Slow|The Psychology of Money"
create_relationship "building habits and productivity" "Atomic Habits|The 7 Habits of Highly Effective People|The Psychology of Money"
create_relationship "Historical fiction that feels authentic" "All the Light We Cannot See|The Book Thief|Sapiens"
create_relationship "future of work and technology" "Sapiens|The Lean Startup|Thinking, Fast and Slow"
create_relationship "learning React" "Don't Make Me Think|Atomic Design|Atomic Habits"

# Get final counts
book_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM book;" | xargs)
thread_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM thread;" | xargs)
relationship_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM thread_book;" | xargs)

echo ""
echo "=================================================="
echo "🎉 Process complete!"
echo "📚 Total books in database: $book_count"
echo "💬 Total threads in database: $thread_count"
echo "🔗 Total thread-book relationships: $relationship_count"
echo "==================================================" 