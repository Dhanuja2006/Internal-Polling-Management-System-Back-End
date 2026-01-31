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
import { authMiddleware, adminMiddleware, roleAcceptedMiddleware } from '../Middleware/authMiddleware.js';

const pollRouter = express.Router();

// Admin routes 
pollRouter.post('/', authMiddleware, roleAcceptedMiddleware, adminMiddleware, createPoll);
pollRouter.get('/', authMiddleware, roleAcceptedMiddleware, adminMiddleware, getAllPollsAdmin);

// Public/User routes 
pollRouter.get('/active', authMiddleware, roleAcceptedMiddleware, getAllPolls);

// Parameterized routes
pollRouter.get('/:id/results', authMiddleware, roleAcceptedMiddleware, getPollResults);
pollRouter.get('/:id', authMiddleware, roleAcceptedMiddleware, getPollById);
pollRouter.put('/:id', authMiddleware, roleAcceptedMiddleware, adminMiddleware, updatePoll);
pollRouter.delete('/:id', authMiddleware, roleAcceptedMiddleware, adminMiddleware, deletePoll);
pollRouter.put('/:id/toggle', authMiddleware, roleAcceptedMiddleware, adminMiddleware, togglePollStatus);

export default pollRouter;
