import express from 'express';
import {
    castVote,
    getMyVotes,
    checkVoteStatus,
    getPollVotes
} from '../Controller/voteController.js';
import { authMiddleware, adminMiddleware } from '../Middleware/authMiddleware.js';

const voteRouter = express.Router();

// User routes
voteRouter.post('/', authMiddleware, castVote);
voteRouter.get('/my-votes', authMiddleware, getMyVotes);
voteRouter.get('/status/:pollId', authMiddleware, checkVoteStatus);

// Admin routes
voteRouter.get('/poll/:pollId', authMiddleware, adminMiddleware, getPollVotes);

export default voteRouter;
