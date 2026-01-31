import Poll from '../Models/PollModel.js';
import Vote from '../Models/VoteModel.js';

// Create a new poll (Admin only)
export const createPoll = async (req, res) => {
    try {
        const { title, description, options } = req.body;

        // Validation
        if (!title || !options || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a title and at least 2 options'
            });
        }

        // Format options
        const formattedOptions = options.map(opt => ({
            optionText: typeof opt === 'string' ? opt : opt.optionText,
            votes: 0
        }));

        // Create poll
        const poll = await Poll.create({
            title,
            description,
            options: formattedOptions,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Poll created successfully',
            poll
        });
    } catch (error) {
        console.error('Create poll error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating poll',
            error: error.message
        });
    }
};

// Get all active polls
export const getAllPolls = async (req, res) => {
    try {
        const polls = await Poll.find({ isActive: true })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: polls.length,
            polls
        });
    } catch (error) {
        console.error('Get all polls error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching polls',
            error: error.message
        });
    }
};

// Get all polls (including inactive) - Admin only
export const getAllPollsAdmin = async (req, res) => {
    try {
        const polls = await Poll.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: polls.length,
            polls
        });
    } catch (error) {
        console.error('Get all polls admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching polls',
            error: error.message
        });
    }
};

// Get single poll by ID
export const getPollById = async (req, res) => {
    try {
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid poll ID format'
            });
        }

        const poll = await Poll.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        // Check if user has voted
        let hasVoted = false;
        let userVote = null;

        if (req.user) {
            const vote = await Vote.findOne({
                pollId: poll._id,
                userId: req.user._id
            });

            if (vote) {
                hasVoted = true;
                userVote = vote.optionId.toString();
            }
        }

        res.status(200).json({
            success: true,
            poll,
            hasVoted,
            userVote
        });
    } catch (error) {
        console.error('Get poll by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching poll',
            error: error.message
        });
    }
};

// Update poll (Admin only)
export const updatePoll = async (req, res) => {
    try {
        const { title, description, isActive } = req.body;

        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        // Update fields
        if (title) poll.title = title;
        if (description !== undefined) poll.description = description;
        if (isActive !== undefined) poll.isActive = isActive;

        await poll.save();

        res.status(200).json({
            success: true,
            message: 'Poll updated successfully',
            poll
        });
    } catch (error) {
        console.error('Update poll error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating poll',
            error: error.message
        });
    }
};

// Delete poll (Admin only)
export const deletePoll = async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        // Delete all votes associated with this poll
        await Vote.deleteMany({ pollId: poll._id });

        // Delete the poll
        await Poll.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Poll and associated votes deleted successfully'
        });
    } catch (error) {
        console.error('Delete poll error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting poll',
            error: error.message
        });
    }
};

// Get poll results
export const getPollResults = async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        // Get all votes for this poll
        const votes = await Vote.find({ pollId: poll._id });

        // Calculate results
        const results = poll.options.map(option => {
            const voteCount = votes.filter(
                vote => vote.optionId.toString() === option._id.toString()
            ).length;

            return {
                optionId: option._id,
                optionText: option.optionText,
                votes: voteCount
            };
        });

        const totalVotes = votes.length;

        res.status(200).json({
            success: true,
            poll: {
                id: poll._id,
                title: poll.title,
                description: poll.description
            },
            results,
            totalVotes
        });
    } catch (error) {
        console.error('Get poll results error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching poll results',
            error: error.message
        });
    }
};

// Toggle poll active status (Admin only)
export const togglePollStatus = async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        poll.isActive = !poll.isActive;
        await poll.save();

        res.status(200).json({
            success: true,
            message: `Poll ${poll.isActive ? 'activated' : 'deactivated'} successfully`,
            poll
        });
    } catch (error) {
        console.error('Toggle poll status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while toggling poll status',
            error: error.message
        });
    }
};
