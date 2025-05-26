import { AppDataSource } from '../config/database';

const SAMPLE_THREADS = [
  // Finance & Economics
  {
    title: "Best books for understanding personal finance in your 20s?",
    description: "I'm 24 and just started my first real job. I want to get serious about managing my money, investing, and building wealth. What books would you recommend for someone who's completely new to personal finance? Looking for practical advice that's not too overwhelming.",
    tags: ["finance", "personal-finance", "investing", "career", "young-adults"],
    upvotes: 47,
    comments: 23
  },
  {
    title: "If you liked 'The Psychology of Money', you'll love these",
    description: "Just finished Morgan Housel's 'The Psychology of Money' and it completely changed how I think about wealth and decision-making. Looking for similar books that combine behavioral psychology with financial wisdom. What are your recommendations for books that explore the human side of money?",
    tags: ["finance", "psychology", "behavioral-economics", "recommendations", "similar-books"],
    upvotes: 62,
    comments: 31
  },
  {
    title: "Books that explain complex economic concepts simply?",
    description: "I'm trying to better understand macroeconomics, market cycles, and how the global economy works, but most books are either too academic or too simplistic. What are the best books that strike the right balance - sophisticated content but accessible writing?",
    tags: ["economics", "macroeconomics", "finance", "education", "accessible"],
    upvotes: 38,
    comments: 19
  },

  // Product Management
  {
    title: "Product Management Recommendations for New PMs",
    description: "Just landed my first Product Manager role at a tech startup. I have an engineering background but I'm new to the product side. What are the essential books every PM should read? Looking for both strategic thinking and practical day-to-day advice.",
    tags: ["product-management", "career", "tech", "startup", "strategy"],
    upvotes: 71,
    comments: 42
  },
  {
    title: "Books on user research and customer discovery?",
    description: "I'm a PM who wants to get better at understanding our users and validating product ideas. What are the best books on user research methodologies, customer interviews, and turning insights into product decisions? Both qualitative and quantitative approaches welcome.",
    tags: ["product-management", "user-research", "customer-discovery", "ux", "methodology"],
    upvotes: 29,
    comments: 16
  },
  {
    title: "Product strategy books that go beyond the basics?",
    description: "I've read the usual suspects (Inspired, Lean Startup, etc.) and I'm looking for more advanced product strategy books. Specifically interested in platform strategy, ecosystem thinking, and how to build products that create network effects.",
    tags: ["product-management", "strategy", "platforms", "advanced", "network-effects"],
    upvotes: 44,
    comments: 27
  },

  // UX & Design
  {
    title: "UX books that changed how you approach design?",
    description: "I'm a UX designer with 3 years of experience, but I feel like I'm stuck in my ways. What books fundamentally shifted your perspective on user experience design? Looking for something that will challenge my assumptions and make me a better designer.",
    tags: ["ux", "design", "user-experience", "professional-development", "perspective"],
    upvotes: 56,
    comments: 34
  },
  {
    title: "Books on design systems and component libraries?",
    description: "Our company is building a design system from scratch and I'm leading the effort. What are the best resources for understanding design system architecture, governance, and adoption? Both books and case studies welcome.",
    tags: ["design-systems", "ux", "ui", "design", "architecture"],
    upvotes: 33,
    comments: 18
  },
  {
    title: "Psychology books that make you a better UX designer?",
    description: "I want to understand human behavior and cognition better to inform my design decisions. What psychology books have been most valuable for your UX work? Interested in both cognitive psychology and behavioral economics.",
    tags: ["ux", "psychology", "cognitive-science", "behavioral-design", "human-behavior"],
    upvotes: 49,
    comments: 25
  },

  // Adventure & Exploration
  {
    title: "If you loved 'Wild' by Cheryl Strayed, read these next",
    description: "Just finished 'Wild' and I'm craving more books about solo adventures, self-discovery through travel, and people pushing their limits in nature. What are your favorite adventure memoirs that combine great storytelling with personal transformation?",
    tags: ["adventure", "memoir", "travel", "self-discovery", "nature"],
    upvotes: 83,
    comments: 47
  },
  {
    title: "Books about exploration and discovery that read like novels?",
    description: "I love reading about historical expeditions, scientific discoveries, and exploration, but I prefer narrative non-fiction that reads like a thriller. Think 'The Lost City of Z' or 'Endurance'. What are your recommendations for page-turning exploration stories?",
    tags: ["exploration", "history", "adventure", "narrative-nonfiction", "discovery"],
    upvotes: 67,
    comments: 39
  },
  {
    title: "Adventure fiction with strong female protagonists?",
    description: "Looking for adventure novels featuring badass women who go on epic journeys, face dangerous challenges, and kick ass along the way. Can be fantasy, historical fiction, or contemporary. Bonus points for diverse authors and settings.",
    tags: ["adventure", "fiction", "female-protagonists", "strong-women", "diverse"],
    upvotes: 92,
    comments: 58
  },

  // Mystery & Thriller
  {
    title: "Books with unreliable narrators that will mess with your head",
    description: "I'm obsessed with books where you can't trust the narrator and everything you think you know gets turned upside down. Think 'Gone Girl', 'The Silent Patient', or 'We Were Liars'. What are your favorite mind-bending books with unreliable narrators?",
    tags: ["mystery", "unreliable-narrator", "psychological-thriller", "plot-twist", "mind-bending"],
    upvotes: 156,
    comments: 89
  },
  {
    title: "Cozy mysteries that aren't too cozy?",
    description: "I love the small-town setting and amateur detective vibe of cozy mysteries, but I want something with a bit more edge and complexity. Not too dark or violent, but with better character development and more sophisticated plots than typical cozies.",
    tags: ["mystery", "cozy-mystery", "small-town", "amateur-detective", "character-driven"],
    upvotes: 41,
    comments: 24
  },
  {
    title: "If you liked Project Hail Mary, you'll love these sci-fi mysteries",
    description: "Just finished Project Hail Mary and loved how it combined hard science with mystery elements and humor. Looking for more sci-fi books that have that same sense of discovery, problem-solving, and optimism. Bonus if they have great character development.",
    tags: ["science-fiction", "mystery", "hard-sci-fi", "problem-solving", "optimistic"],
    upvotes: 124,
    comments: 76
  },

  // Cross-genre and unique
  {
    title: "Books that completely changed your worldview?",
    description: "What book fundamentally altered how you see the world, society, or yourself? I'm looking for books that challenge assumptions and offer new perspectives on life. Any genre welcome - fiction, philosophy, science, history, whatever moved you.",
    tags: ["philosophy", "worldview", "perspective", "life-changing", "transformative"],
    upvotes: 203,
    comments: 127
  },
  {
    title: "Hidden gems from 2023 that deserve more attention",
    description: "What are the best books you read this year that didn't get much buzz? I'm looking for those under-the-radar titles that blew you away but somehow flew under everyone's radar. Any genre, fiction or non-fiction.",
    tags: ["hidden-gems", "2023", "underrated", "recommendations", "new-releases"],
    upvotes: 78,
    comments: 52
  },
  {
    title: "Books that are perfect for a long flight?",
    description: "I have a 14-hour flight coming up and need something that will keep me completely absorbed. Looking for page-turners that make time fly by - could be thriller, fantasy, historical fiction, or compelling non-fiction. What books have made your flights disappear?",
    tags: ["travel-reading", "page-turner", "long-read", "absorbing", "flight"],
    upvotes: 95,
    comments: 63
  }
];

async function createSampleThreads() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Get the raw connection for SQL queries
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    let createdCount = 0;

    for (const thread of SAMPLE_THREADS) {
      try {
        // Check if thread already exists
        const existingThread = await queryRunner.query(
          'SELECT id FROM thread WHERE LOWER(title) = LOWER($1)',
          [thread.title]
        );

        if (existingThread.length > 0) {
          console.log(`Thread "${thread.title}" already exists, skipping`);
          continue;
        }

        // Insert thread using raw SQL
        const result = await queryRunner.query(`
          INSERT INTO thread (title, description, tags, upvotes, comments, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id, title
        `, [
          thread.title,
          thread.description,
          thread.tags.join(','), // Convert array to comma-separated string
          thread.upvotes,
          thread.comments
        ]);

        console.log(`✅ Created thread: "${result[0].title}"`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating thread "${thread.title}":`, error instanceof Error ? error.message : error);
      }
    }

    await queryRunner.release();
    console.log(`\n🎉 Successfully created ${createdCount} sample threads!`);
    
    // Close database connection
    await AppDataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error creating sample threads:', error);
    process.exit(1);
  }
}

// Run the script
createSampleThreads(); 