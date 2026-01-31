import express from 'express';
import {
    castVote,
    getMyVotes,
    checkVoteStatus,
    getPollVotes
} from '../Controller/voteController.js';
import { authMiddleware, adminMiddleware, roleAcceptedMiddleware } from '../Middleware/authMiddleware.js';

const voteRouter = express.Router();

// User routes (require authentication AND role acceptance)
voteRouter.post('/', authMiddleware, roleAcceptedMiddleware, castVote);
voteRouter.get('/my-votes', authMiddleware, roleAcceptedMiddleware, getMyVotes);
voteRouter.get('/status/:pollId', authMiddleware, roleAcceptedMiddleware, checkVoteStatus);

// Admin routes (require authentication AND role acceptance)
voteRouter.get('/poll/:pollId', authMiddleware, roleAcceptedMiddleware, adminMiddleware, getPollVotes);

export default voteRouter;
