import { Router } from 'express';
import { LLMService } from '../services/llm.service';

const router = Router();
const llmService = new LLMService();

/**
 * Generate description for a book
 */
router.post('/generate-description', async (req, res) => {
  try {
    const { title, author, existingDescription } = req.body;

    if (!title || !author) {
      return res.status(400).json({ 
        error: 'Title and author are required',
        success: false 
      });
    }

    console.log(`[LLM_ROUTES] Generating description for "${title}" by ${author}`);

    const description = await llmService.generateDescription(title, author, existingDescription);

    res.json({ 
      description,
      success: true,
      generated: true 
    });

  } catch (error) {
    console.error('[LLM_ROUTES] Error generating description:', error);
    res.status(500).json({ 
      error: 'Failed to generate description',
      success: false 
    });
  }
});

/**
 * Generate quote for a book
 */
router.post('/generate-quote', async (req, res) => {
  try {
    const { title, author, description } = req.body;

    if (!title || !author) {
      return res.status(400).json({ 
        error: 'Title and author are required',
        success: false 
      });
    }

    console.log(`[LLM_ROUTES] Generating quote for "${title}" by ${author}`);

    const quote = await llmService.generateQuote(title, author, description);

    res.json({ 
      quote,
      success: true,
      generated: true 
    });

  } catch (error) {
    console.error('[LLM_ROUTES] Error generating quote:', error);
    res.status(500).json({ 
      error: 'Failed to generate quote',
      success: false 
    });
  }
});

/**
 * Enhance book content (description + quote + metadata)
 */
router.post('/enhance-book', async (req, res) => {
  try {
    const { title, author, existingDescription, genres, publishedYear } = req.body;

    if (!title || !author) {
      return res.status(400).json({ 
        error: 'Title and author are required',
        success: false 
      });
    }

    console.log(`[LLM_ROUTES] Enhancing book content for "${title}" by ${author}`);

    // Generate description and quote in parallel
    const [description, quote] = await Promise.all([
      llmService.generateDescription(title, author, existingDescription),
      llmService.generateQuote(title, author, existingDescription)
    ]);

    res.json({
      description,
      quote,
      success: true,
      enhanced: true,
      metadata: {
        title,
        author,
        genres,
        publishedYear
      }
    });

  } catch (error) {
    console.error('[LLM_ROUTES] Error enhancing book:', error);
    res.status(500).json({ 
      error: 'Failed to enhance book content',
      success: false 
    });
  }
});

/**
 * Analyze query for book search enhancement
 */
router.post('/analyze-query', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required',
        success: false 
      });
    }

    console.log(`[LLM_ROUTES] Analyzing query: "${query}"`);

    const analysis = await llmService.analyzeQuery(query);

    res.json(analysis);

  } catch (error) {
    console.error('[LLM_ROUTES] Error analyzing query:', error);
    res.status(500).json({ 
      error: 'Failed to analyze query',
      success: false 
    });
  }
});

export default router;