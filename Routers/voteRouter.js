import express from 'express';
import {
    castVote,
    getMyVotes,
    checkVoteStatus,
    getPollVotes
} from '../Controller/voteController.js';
import { authMiddleware } from '../Middleware/authMiddleware.js';

const voteRouter = express.Router();

voteRouter.use(authMiddleware);

voteRouter.post('/', castVote);
voteRouter.get('/my-votes', getMyVotes);
voteRouter.get('/status/:pollId', checkVoteStatus);
voteRouter.get('/poll/:pollId', getPollVotes);

export default voteRouter;
