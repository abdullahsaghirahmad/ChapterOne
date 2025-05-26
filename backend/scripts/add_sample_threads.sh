#!/bin/bash

# Database connection details
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="chapterone"

echo "🚀 Adding sample threads to ChapterOne database..."
echo "=================================================="

# Function to add a thread
add_thread() {
    local title="$1"
    local description="$2"
    local tags="$3"
    local upvotes="$4"
    local comments="$5"
    
    # Escape single quotes in the description
    description=$(echo "$description" | sed "s/'/''/g")
    title=$(echo "$title" | sed "s/'/''/g")
    
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO thread (title, description, tags, upvotes, comments, \"createdAt\", \"updatedAt\")
        VALUES ('$title', '$description', '$tags', $upvotes, $comments, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Added: $title"
    else
        echo "❌ Failed: $title"
    fi
}

# Check current thread count
current_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM thread;" | xargs)
echo "📊 Current threads in database: $current_count"
echo ""

# Add remaining threads (we already have 6, so adding the rest)

# Economics
add_thread "Books that explain complex economic concepts simply?" "I'm trying to better understand macroeconomics, market cycles, and how the global economy works, but most books are either too academic or too simplistic. What are the best books that strike the right balance - sophisticated content but accessible writing?" "economics,macroeconomics,finance,education,accessible" 38 19

# Product Management
add_thread "Books on user research and customer discovery?" "I'm a PM who wants to get better at understanding our users and validating product ideas. What are the best books on user research methodologies, customer interviews, and turning insights into product decisions? Both qualitative and quantitative approaches welcome." "product-management,user-research,customer-discovery,ux,methodology" 29 16

add_thread "Product strategy books that go beyond the basics?" "I've read the usual suspects (Inspired, Lean Startup, etc.) and I'm looking for more advanced product strategy books. Specifically interested in platform strategy, ecosystem thinking, and how to build products that create network effects." "product-management,strategy,platforms,advanced,network-effects" 44 27

# UX & Design
add_thread "Books on design systems and component libraries?" "Our company is building a design system from scratch and I'm leading the effort. What are the best resources for understanding design system architecture, governance, and adoption? Both books and case studies welcome." "design-systems,ux,ui,design,architecture" 33 18

add_thread "Psychology books that make you a better UX designer?" "I want to understand human behavior and cognition better to inform my design decisions. What psychology books have been most valuable for your UX work? Interested in both cognitive psychology and behavioral economics." "ux,psychology,cognitive-science,behavioral-design,human-behavior" 49 25

# Adventure & Exploration
add_thread "Books about exploration and discovery that read like novels?" "I love reading about historical expeditions, scientific discoveries, and exploration, but I prefer narrative non-fiction that reads like a thriller. Think The Lost City of Z or Endurance. What are your recommendations for page-turning exploration stories?" "exploration,history,adventure,narrative-nonfiction,discovery" 67 39

add_thread "Adventure fiction with strong female protagonists?" "Looking for adventure novels featuring badass women who go on epic journeys, face dangerous challenges, and kick ass along the way. Can be fantasy, historical fiction, or contemporary. Bonus points for diverse authors and settings." "adventure,fiction,female-protagonists,strong-women,diverse" 92 58

# Mystery & Thriller
add_thread "Cozy mysteries that aren't too cozy?" "I love the small-town setting and amateur detective vibe of cozy mysteries, but I want something with a bit more edge and complexity. Not too dark or violent, but with better character development and more sophisticated plots than typical cozies." "mystery,cozy-mystery,small-town,amateur-detective,character-driven" 41 24

add_thread "If you liked Project Hail Mary, you will love these sci-fi mysteries" "Just finished Project Hail Mary and loved how it combined hard science with mystery elements and humor. Looking for more sci-fi books that have that same sense of discovery, problem-solving, and optimism. Bonus if they have great character development." "science-fiction,mystery,hard-sci-fi,problem-solving,optimistic" 124 76

# Cross-genre and unique
add_thread "Books that completely changed your worldview?" "What book fundamentally altered how you see the world, society, or yourself? I'm looking for books that challenge assumptions and offer new perspectives on life. Any genre welcome - fiction, philosophy, science, history, whatever moved you." "philosophy,worldview,perspective,life-changing,transformative" 203 127

add_thread "Hidden gems from 2023 that deserve more attention" "What are the best books you read this year that didn't get much buzz? I'm looking for those under-the-radar titles that blew you away but somehow flew under everyone's radar. Any genre, fiction or non-fiction." "hidden-gems,2023,underrated,recommendations,new-releases" 78 52

add_thread "Books that are perfect for a long flight?" "I have a 14-hour flight coming up and need something that will keep me completely absorbed. Looking for page-turners that make time fly by - could be thriller, fantasy, historical fiction, or compelling non-fiction. What books have made your flights disappear?" "travel-reading,page-turner,long-read,absorbing,flight" 95 63

# Additional diverse threads
add_thread "Books about building habits and productivity systems?" "I'm trying to build better habits and create systems that actually stick. What are the best books on habit formation, productivity, and personal systems? Looking for evidence-based approaches rather than just motivational fluff." "productivity,habits,self-improvement,systems,psychology" 89 45

add_thread "Historical fiction that feels authentic and immersive?" "I love historical fiction that transports you completely to another time and place. What are your favorite historical novels that feel meticulously researched and authentic? Any time period welcome, but bonus points for lesser-known historical settings." "historical-fiction,authentic,immersive,research,time-period" 76 38

add_thread "Books about the future of work and technology?" "With AI and automation changing everything, I want to understand where work is heading. What are the best books about the future of work, technology's impact on jobs, and how to prepare for the changing economy?" "future-of-work,technology,ai,automation,economy" 54 29

# Check final count
echo ""
echo "🔄 Checking final thread count..."
final_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM thread;" | xargs)
added_count=$((final_count - current_count))

echo "=================================================="
echo "🎉 Process complete!"
echo "📊 Threads before: $current_count"
echo "📊 Threads after: $final_count"
echo "➕ Threads added: $added_count"
echo "==================================================" 