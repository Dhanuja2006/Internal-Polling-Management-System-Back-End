import express from 'express';
import {
    createPoll,
    getOrgPolls,
    getActivePolls,
    getPollById,
    getAllPollsAdmin,
    updatePoll,
    deletePoll,
    getPollResults,
    togglePollStatus,
    getRecommendedPolls
} from '../Controller/pollController.js';
import { getPollInsights } from '../Controller/insightsController.js';
import { authMiddleware, adminMiddleware } from '../Middleware/authMiddleware.js';

const pollRouter = express.Router();

pollRouter.use(authMiddleware);

// Create poll (RBAC check is inside controller based on orgId)
pollRouter.post('/', createPoll);

// Global list for admins
pollRouter.get('/', adminMiddleware, getAllPollsAdmin);

// Compatibility routes (Before parameterized routes)
pollRouter.get('/active', getActivePolls);
pollRouter.get('/recommended', getRecommendedPolls);

// Get polls for specific organization
pollRouter.get('/org/:orgId', getOrgPolls);

// Parameterized routes
pollRouter.get('/:id/results', getPollResults);
pollRouter.get('/:id/insights', getPollInsights);
pollRouter.get('/:id', getPollById);
pollRouter.put('/:id', updatePoll);
pollRouter.delete('/:id', deletePoll);
pollRouter.put('/:id/toggle', togglePollStatus);

export default pollRouter;
