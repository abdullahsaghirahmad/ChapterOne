import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Thread } from '../entities/Thread';

const router = Router();
const threadRepository = AppDataSource.getRepository(Thread);

// Get all threads
router.get('/', async (req, res) => {
  try {
    const threads = await threadRepository.find();
    res.json(threads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching threads', error });
  }
});

// Get thread by ID with related books
router.get('/:id', async (req, res) => {
  try {
    const thread = await threadRepository.findOneBy({ id: req.params.id });
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Fetch related books using raw SQL
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      const relatedBooks = await queryRunner.query(`
        SELECT b.* FROM book b
        INNER JOIN thread_book tb ON b.id = tb.book_id
        WHERE tb.thread_id = $1
        ORDER BY b.title
      `, [req.params.id]);
      
      const threadWithBooks = {
        ...thread,
        books: relatedBooks
      };
      
      res.json(threadWithBooks);
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching thread', error });
  }
});

// Get related books for a thread (separate endpoint)
router.get('/:id/books', async (req, res) => {
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      const relatedBooks = await queryRunner.query(`
        SELECT b.* FROM book b
        INNER JOIN thread_book tb ON b.id = tb.book_id
        WHERE tb.thread_id = $1
        ORDER BY b.title
      `, [req.params.id]);
      
      res.json(relatedBooks);
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching related books', error });
  }
});

// Create new thread
router.post('/', async (req, res) => {
  try {
    console.log('Creating thread with data:', req.body);
    const thread = threadRepository.create(req.body);
    console.log('Thread entity created:', thread);
    const result = await threadRepository.save(thread);
    console.log('Thread saved successfully:', result);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ 
      message: 'Error creating thread', 
      error: error instanceof Error ? error.message : error,
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Update thread
router.put('/:id', async (req, res) => {
  try {
    const thread = await threadRepository.findOneBy({ id: req.params.id });
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    threadRepository.merge(thread, req.body);
    const result = await threadRepository.save(thread);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error updating thread', error });
  }
});

// Delete thread
router.delete('/:id', async (req, res) => {
  try {
    const result = await threadRepository.delete(req.params.id);
    if (result.affected === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting thread', error });
  }
});

// Upvote thread
router.post('/:id/upvote', async (req, res) => {
  try {
    const thread = await threadRepository.findOneBy({ id: req.params.id });
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    thread.upvotes += 1;
    const result = await threadRepository.save(thread);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error upvoting thread', error });
  }
});

export const threadRouter = router; 