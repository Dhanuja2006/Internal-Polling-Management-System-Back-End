import Vote from '../Models/VoteModel.js';
import Poll from '../Models/PollModel.js';
import OrgMember from '../Models/OrgMemberModel.js';
import catchAsync from '../Utils/catchAsync.js';
import AppError from '../Utils/AppError.js';
import { sendSuccess } from '../Utils/response.js';
import { assertObjectId, assertRequired } from '../Utils/validation.js';
import Audit from '../Models/AuditModel.js';

export const castVote = catchAsync(async (req, res) => {
    assertRequired(['pollId', 'optionId'], req.body);
    const { pollId, optionId, allowUpdate } = req.body;

    assertObjectId(pollId, 'poll id');
    assertObjectId(optionId, 'option id');

    const poll = await Poll.findById(pollId);
    if (!poll) {
        throw new AppError('Poll not found', 404);
    }

    if (!poll.isActive) {
        throw new AppError('This poll is not active', 400);
    }

    // Check scheduling
    const now = new Date();
    if (now < poll.startTime) {
        throw new AppError('This poll has not started yet', 400);
    }
    if (now > poll.endTime) {
        throw new AppError('This poll has ended', 400);
    }

    // Only check membership if the poll belongs to an organization
    if (poll.orgId) {
        const isMember = await OrgMember.findOne({ orgId: poll.orgId, userId: req.user._id });
        if (!isMember) {
            throw new AppError('You are not a member of this organization to vote on this poll', 403);
        }
    }

    const optionExists = poll.options.some((opt) => opt._id.toString() === optionId);
    if (!optionExists) {
        throw new AppError('Invalid option for this poll', 400);
    }

    const existingVote = await Vote.findOne({
        pollId,
        userId: req.user._id
    });

    if (existingVote) {
        if (allowUpdate) {
            existingVote.optionId = optionId;
            existingVote.ipAddress = req.ip;
            existingVote.userAgent = req.get('User-Agent');
            await existingVote.save();

            // Emit live update
            const io = req.app.get('io');
            if (io) {
                io.to(`poll_${pollId}`).emit('voteUpdate', {
                    pollId,
                    optionId,
                    votedAt: new Date()
                });
            }

            return sendSuccess(res, 200, {
                message: 'Vote updated successfully',
                vote: existingVote
            });
        }
        throw new AppError('You have already voted in this poll.', 409);
    }

    // Fraud detection: Check if many votes from same IP recently (Basic)
    const recentVotesFromIP = await Vote.countDocuments({
        ipAddress: req.ip,
        createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // last 10 mins
    });

    if (recentVotesFromIP > 5) {
        // Log suspicious activity
        await Audit.create({
            userId: req.user._id,
            orgId: poll.orgId,
            action: 'SUSPICIOUS_VOTING_ACTIVITY',
            details: { ip: req.ip, pollId },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
    }

    const vote = await Vote.create({
        pollId,
        userId: req.user._id,
        optionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    await Audit.create({
        userId: req.user._id,
        orgId: poll.orgId,
        action: 'CAST_VOTE',
        details: { pollId, optionId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Emit live update
    const io = req.app.get('io');
    if (io) {
        io.to(`poll_${pollId}`).emit('voteUpdate', {
            pollId,
            optionId,
            votedAt: new Date()
        });
    }

    return sendSuccess(res, 201, {
        message: 'Vote cast successfully',
        vote
    });
});

export const getMyVotes = catchAsync(async (req, res) => {
    const votes = await Vote.find({ userId: req.user._id })
        .populate('pollId', 'title description options')
        .sort({ createdAt: -1 });

    const formattedVotes = votes.map((vote) => {
        const option = vote.pollId?.options?.find((item) => item._id.toString() === vote.optionId.toString());

        return {
            voteId: vote._id,
            pollId: vote.pollId?._id,
            pollTitle: vote.pollId?.title,
            optionId: vote.optionId,
            optionText: option ? option.optionText : 'Option not found',
            votedAt: vote.createdAt
        };
    });

    return sendSuccess(res, 200, {
        count: formattedVotes.length,
        votes: formattedVotes
    });
});

export const checkVoteStatus = catchAsync(async (req, res) => {
    assertObjectId(req.params.pollId, 'poll id');

    const vote = await Vote.findOne({
        pollId: req.params.pollId,
        userId: req.user._id
    });

    return sendSuccess(res, 200, {
        hasVoted: Boolean(vote),
        vote: vote ? {
            optionId: vote.optionId,
            votedAt: vote.createdAt
        } : null
    });
});

export const getPollVotes = catchAsync(async (req, res) => {
    assertObjectId(req.params.pollId, 'poll id');

    const poll = await Poll.findById(req.params.pollId);
    if (!poll) throw new AppError('Poll not found', 404);

    // If it belongs to an org, check if user has access
    if (poll.orgId) {
        const requester = await OrgMember.findOne({ orgId: poll.orgId, userId: req.user._id });
        if (!requester || (poll.isAnonymous && requester.role === 'member')) {
            throw new AppError('Access denied', 403);
        }
    } else {
        // Global poll: only system admins or the creator can see detailed votes if anonymous
        const isCreator = poll.createdBy.toString() === req.user._id.toString();
        if (poll.isAnonymous && req.user.role !== 'admin' && !isCreator) {
             throw new AppError('Access denied', 403);
        }
    }

    const votes = await Vote.find({ pollId: req.params.pollId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

    return sendSuccess(res, 200, {
        count: votes.length,
        votes: poll.isAnonymous ? votes.map(v => ({ ...v.toObject(), userId: null })) : votes
    });
});
