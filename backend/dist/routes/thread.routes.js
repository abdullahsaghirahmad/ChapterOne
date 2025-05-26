"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.threadRouter = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const Thread_1 = require("../entities/Thread");
const router = (0, express_1.Router)();
const threadRepository = database_1.AppDataSource.getRepository(Thread_1.Thread);
// Get all threads
router.get('/', async (req, res) => {
    try {
        const threads = await threadRepository.find({
            relations: ['createdBy', 'books']
        });
        res.json(threads);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching threads', error });
    }
});
// Get thread by ID
router.get('/:id', async (req, res) => {
    try {
        const thread = await threadRepository.findOne({
            where: { id: req.params.id },
            relations: ['createdBy', 'books']
        });
        if (!thread) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        res.json(thread);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching thread', error });
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ message: 'Error upvoting thread', error });
    }
});
exports.threadRouter = router;
