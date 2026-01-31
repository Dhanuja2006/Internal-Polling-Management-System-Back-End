import Vote from '../Models/VoteModel.js';
import Poll from '../Models/PollModel.js';

// Cast a vote
export const castVote = async (req, res) => {
    try {
        const { pollId, optionId } = req.body;

        // Validation
        if (!pollId || !optionId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide pollId and optionId'
            });
        }

        // Check if poll exists and is active
        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        if (!poll.isActive) {
            return res.status(400).json({
                success: false,
                message: 'This poll is not active'
            });
        }

        // Verify option exists in poll
        const optionExists = poll.options.some(
            opt => opt._id.toString() === optionId
        );

        if (!optionExists) {
            return res.status(400).json({
                success: false,
                message: 'Invalid option for this poll'
            });
        }

        // Check if user has already voted (CRITICAL BUSINESS RULE)
        const existingVote = await Vote.findOne({
            pollId,
            userId: req.user._id
        });

        if (existingVote) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted in this poll. Only one vote per user is allowed.'
            });
        }

        // Create vote
        const vote = await Vote.create({
            pollId,
            userId: req.user._id,
            optionId
        });

        res.status(201).json({
            success: true,
            message: 'Vote cast successfully',
            vote
        });
    } catch (error) {
        // Handle duplicate vote attempt (MongoDB unique index error)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted in this poll. Only one vote per user is allowed.'
            });
        }

        console.error('Cast vote error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while casting vote',
            error: error.message
        });
    }
};

// Get user's voting history
export const getMyVotes = async (req, res) => {
    try {
        const votes = await Vote.find({ userId: req.user._id })
            .populate('pollId', 'title description')
            .sort({ createdAt: -1 });

        // Format response with poll and option details
        const formattedVotes = await Promise.all(votes.map(async (vote) => {
            const poll = await Poll.findById(vote.pollId);
            const option = poll ? poll.options.find(
                opt => opt._id.toString() === vote.optionId.toString()
            ) : null;

            return {
                voteId: vote._id,
                pollId: vote.pollId._id,
                pollTitle: vote.pollId.title,
                optionId: vote.optionId,
                optionText: option ? option.optionText : 'Option not found',
                votedAt: vote.createdAt
            };
        }));

        res.status(200).json({
            success: true,
            count: formattedVotes.length,
            votes: formattedVotes
        });
    } catch (error) {
        console.error('Get my votes error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching votes',
            error: error.message
        });
    }
};

// Check if user has voted in a specific poll
export const checkVoteStatus = async (req, res) => {
    try {
        const { pollId } = req.params;

        const vote = await Vote.findOne({
            pollId,
            userId: req.user._id
        });

        res.status(200).json({
            success: true,
            hasVoted: !!vote,
            vote: vote ? {
                optionId: vote.optionId,
                votedAt: vote.createdAt
            } : null
        });
    } catch (error) {
        console.error('Check vote status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while checking vote status',
            error: error.message
        });
    }
};

// Get all votes for a poll (Admin only)
export const getPollVotes = async (req, res) => {
    try {
        const { pollId } = req.params;

        const votes = await Vote.find({ pollId })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: votes.length,
            votes
        });
    } catch (error) {
        console.error('Get poll votes error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching poll votes',
            error: error.message
        });
    }
};
