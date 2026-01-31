import express from 'express';
import {
    createPoll,
    getAllPolls,
    getAllPollsAdmin,
    getPollById,
    updatePoll,
    deletePoll,
    getPollResults,
    togglePollStatus
} from '../Controller/pollController.js';
import { authMiddleware, adminMiddleware } from '../Middleware/authMiddleware.js';

const pollRouter = express.Router();

// Public/User routes (require authentication)
pollRouter.get('/active', authMiddleware, getAllPolls);
pollRouter.get('/:id', authMiddleware, getPollById);
pollRouter.get('/:id/results', authMiddleware, getPollResults);

// Admin routes
pollRouter.post('/', authMiddleware, adminMiddleware, createPoll);
pollRouter.get('/', authMiddleware, adminMiddleware, getAllPollsAdmin);
pollRouter.put('/:id', authMiddleware, adminMiddleware, updatePoll);
pollRouter.delete('/:id', authMiddleware, adminMiddleware, deletePoll);
pollRouter.patch('/:id/toggle', authMiddleware, adminMiddleware, togglePollStatus);

export default pollRouter;
