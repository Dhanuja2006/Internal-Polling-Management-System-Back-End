import Poll from '../Models/PollModel.js';
import Vote from '../Models/VoteModel.js';
import OrgMember from '../Models/OrgMemberModel.js';
import catchAsync from '../Utils/catchAsync.js';
import AppError from '../Utils/AppError.js';
import { sendSuccess } from '../Utils/response.js';
import { assertObjectId, sanitizePollOptions } from '../Utils/validation.js';
import Audit from '../Models/AuditModel.js';
import { notifyNewPoll } from '../Utils/notifications.js';

// Helper to check org permission
const checkOrgPermission = async (userId, orgId, allowedRoles) => {
    const membership = await OrgMember.findOne({ userId, orgId });
    if (!membership || !allowedRoles.includes(membership.role)) {
        return false;
    }
    return true;
};

export const createPoll = catchAsync(async (req, res) => {
    const { title, description, options, visibility, isAnonymous, startTime, endTime } = req.body;
    let { orgId } = req.body;

    // Normalize orgId: handle empty strings, 'global', 'null', or 'undefined' from frontend
    if (!orgId || orgId === 'global' || orgId === '' || orgId === 'null' || orgId === 'undefined') {
        orgId = undefined;
    }

    // If orgId is provided, check org permission
    if (orgId) {
        const hasPermission = await checkOrgPermission(req.user._id, orgId, ['admin', 'moderator']);
        if (!hasPermission) {
            throw new AppError('Only organization admins or moderators can create polls for this organization', 403);
        }
    } else {
        // This is a system-wide "Global" poll. Only system administrators can create these.
        if (req.user.role !== 'admin') {
            throw new AppError('Only system administrators can create global polls', 403);
        }
    }

    if (!title || !String(title).trim()) {
        throw new AppError('Poll title is required', 400);
    }

    if (!endTime) {
        throw new AppError('End time is required', 400);
    }

    const poll = await Poll.create({
        title: String(title).trim(),
        description: description ? String(description).trim() : '',
        options: sanitizePollOptions(options),
        orgId,
        visibility: visibility || 'public',
        isAnonymous: isAnonymous || false,
        startTime: startTime || Date.now(),
        endTime,
        createdBy: req.user._id
    });

    await Audit.create({
        userId: req.user._id,
        orgId,
        action: 'CREATE_POLL',
        details: { pollId: poll._id, title },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Notify members
    notifyNewPoll(poll, orgId);

    return sendSuccess(res, 201, {
        message: 'Poll created successfully',
        poll
    });
});

export const getActivePolls = catchAsync(async (req, res) => {
    // Get all orgs user is member of
    const memberships = await OrgMember.find({ userId: req.user._id });
    const orgIds = memberships.map(m => m.orgId);

    const now = new Date();
    const polls = await Poll.find({
        $or: [
            { orgId: { $in: orgIds } },
            { orgId: { $exists: false } },
            { orgId: null }
        ],
        startTime: { $lte: now },
        endTime: { $gt: now },
        isActive: true
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    return sendSuccess(res, 200, {
        count: polls.length,
        polls
    });
});

export const getOrgPolls = catchAsync(async (req, res) => {
    const { orgId } = req.params;
    const { status } = req.query; // active, upcoming, expired

    const isMember = await OrgMember.findOne({ orgId, userId: req.user._id });
    if (!isMember) {
        throw new AppError('You are not a member of this organization', 403);
    }

    const now = new Date();
    let query = { orgId };

    if (status === 'active') {
        query.startTime = { $lte: now };
        query.endTime = { $gt: now };
        query.isActive = true;
    } else if (status === 'upcoming') {
        query.startTime = { $gt: now };
        query.isActive = true;
    } else if (status === 'expired') {
        query.endTime = { $lte: now };
    }

    const polls = await Poll.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

    return sendSuccess(res, 200, {
        count: polls.length,
        polls
    });
});

export const getPollById = catchAsync(async (req, res) => {
    assertObjectId(req.params.id, 'poll id');

    const poll = await Poll.findById(req.params.id).populate('createdBy', 'name email');
    if (!poll) {
        throw new AppError('Poll not found', 404);
    }

    // Only check membership if the poll belongs to an organization
    if (poll.orgId) {
        const isMember = await OrgMember.findOne({ orgId: poll.orgId, userId: req.user._id });
        if (!isMember) {
            throw new AppError('You are not a member of this organization', 403);
        }
    }

    let hasVoted = false;
    let userVote = null;

    const vote = await Vote.findOne({
        pollId: poll._id,
        userId: req.user._id
    });

    if (vote) {
        hasVoted = true;
        userVote = vote.optionId.toString();
    }

    return sendSuccess(res, 200, {
        poll,
        hasVoted,
        userVote
    });
});

export const updatePoll = catchAsync(async (req, res) => {
    assertObjectId(req.params.id, 'poll id');

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
        throw new AppError('Poll not found', 404);
    }

    const isCreator = poll.createdBy.toString() === req.user._id.toString();
    const isSystemAdmin = req.user.role === 'admin';
    const isOrgStaff = poll.orgId ? await checkOrgPermission(req.user._id, poll.orgId, ['admin', 'moderator']) : false;

    if (!isCreator && !isSystemAdmin && !isOrgStaff) {
        throw new AppError('You do not have permission to update this poll', 403);
    }

    if (req.body.title !== undefined) {
        if (!String(req.body.title).trim()) {
            throw new AppError('Poll title cannot be empty', 400);
        }
        poll.title = String(req.body.title).trim();
    }

    if (req.body.description !== undefined) {
        poll.description = String(req.body.description || '').trim();
    }

    if (req.body.isActive !== undefined) {
        poll.isActive = Boolean(req.body.isActive);
    }

    if (req.body.endTime !== undefined) {
        poll.endTime = new Date(req.body.endTime);
    }

    if (req.body.options !== undefined) {
        // Warning: Updating options after votes are cast might be problematic
        const voteCount = await Vote.countDocuments({ pollId: poll._id });
        if (voteCount > 0) {
            throw new AppError('Cannot update options once voting has started', 400);
        }
        poll.options = sanitizePollOptions(req.body.options);
    }

    await poll.save();

    return sendSuccess(res, 200, {
        message: 'Poll updated successfully',
        poll
    });
});

export const deletePoll = catchAsync(async (req, res) => {
    assertObjectId(req.params.id, 'poll id');

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
        throw new AppError('Poll not found', 404);
    }

    const isCreator = poll.createdBy.toString() === req.user._id.toString();
    const isSystemAdmin = req.user.role === 'admin';
    const isOrgAdmin = poll.orgId ? await checkOrgPermission(req.user._id, poll.orgId, ['admin']) : false;

    if (!isCreator && !isSystemAdmin && !isOrgAdmin) {
        throw new AppError('You do not have permission to delete this poll', 403);
    }

    await Vote.deleteMany({ pollId: poll._id });
    await Poll.findByIdAndDelete(req.params.id);

    await Audit.create({
        userId: req.user._id,
        orgId: poll.orgId,
        action: 'DELETE_POLL',
        details: { pollId: poll._id, title: poll.title },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    return sendSuccess(res, 200, {
        message: 'Poll and associated votes deleted successfully'
    });
});

export const getPollResults = catchAsync(async (req, res) => {
    assertObjectId(req.params.id, 'poll id');

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
        throw new AppError('Poll not found', 404);
    }

    // Only check membership if the poll belongs to an organization
    if (poll.orgId) {
        const isMember = await OrgMember.findOne({ orgId: poll.orgId, userId: req.user._id });
        if (!isMember) {
            throw new AppError('You are not a member of this organization', 403);
        }
    }

    const votes = await Vote.find({ pollId: poll._id }).populate('userId', 'name email');
    const voteMap = new Map();

    votes.forEach((vote) => {
        const key = vote.optionId.toString();
        voteMap.set(key, (voteMap.get(key) || 0) + 1);
    });

    const results = poll.options.map((option) => ({
        optionId: option._id,
        optionText: option.optionText,
        votes: voteMap.get(option._id.toString()) || 0
    }));

    // If anonymous, hide voter details
    const participation = poll.isAnonymous ? null : votes.map(v => ({
        userName: v.userId?.name || 'Unknown',
        optionId: v.optionId,
        votedAt: v.createdAt
    }));

    return sendSuccess(res, 200, {
        poll: {
            id: poll._id,
            title: poll.title,
            description: poll.description,
            isActive: poll.isActive,
            isAnonymous: poll.isAnonymous,
            startTime: poll.startTime,
            endTime: poll.endTime
        },
        results,
        totalVotes: votes.length,
        participation
    });
});

export const togglePollStatus = catchAsync(async (req, res) => {
    assertObjectId(req.params.id, 'poll id');

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
        throw new AppError('Poll not found', 404);
    }

    const isCreator = poll.createdBy.toString() === req.user._id.toString();
    const isSystemAdmin = req.user.role === 'admin';
    const isOrgStaff = poll.orgId ? await checkOrgPermission(req.user._id, poll.orgId, ['admin', 'moderator']) : false;

    if (!isCreator && !isSystemAdmin && !isOrgStaff) {
        throw new AppError('You do not have permission to toggle poll status', 403);
    }

    poll.isActive = !poll.isActive;
    await poll.save();

    return sendSuccess(res, 200, {
        message: `Poll ${poll.isActive ? 'activated' : 'deactivated'} successfully`,
        poll
    });
});

export const getRecommendedPolls = catchAsync(async (req, res) => {
    const memberships = await OrgMember.find({ userId: req.user._id });
    const orgIds = memberships.map(m => m.orgId);

    const myVotes = await Vote.find({ userId: req.user._id });
    const votedPollIds = myVotes.map(v => v.pollId);

    const now = new Date();
    const recommended = await Poll.find({
        $or: [
            { orgId: { $in: orgIds } },
            { orgId: { $exists: false } },
            { orgId: null }
        ],
        _id: { $nin: votedPollIds },
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gt: now }
    }).limit(5);

    return sendSuccess(res, 200, { recommended });
});

export const getAllPollsAdmin = catchAsync(async (req, res) => {
    const polls = await Poll.find()
        .populate('createdBy', 'name email')
        .populate('orgId', 'name')
        .sort({ createdAt: -1 });

    return sendSuccess(res, 200, {
        count: polls.length,
        polls
    });
});
