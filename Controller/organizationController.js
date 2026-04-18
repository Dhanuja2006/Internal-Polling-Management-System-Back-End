import Organization from '../Models/OrganizationModel.js';
import OrgMember from '../Models/OrgMemberModel.js';
import catchAsync from '../Utils/catchAsync.js';
import AppError from '../Utils/AppError.js';
import { sendSuccess } from '../Utils/response.js';
import crypto from 'crypto';
import Audit from '../Models/AuditModel.js';

export const createOrganization = catchAsync(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        throw new AppError('Organization name is required', 400);
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const organization = await Organization.create({
        name,
        description,
        inviteCode,
        createdBy: req.user._id
    });

    // Add creator as Admin
    await OrgMember.create({
        orgId: organization._id,
        userId: req.user._id,
        role: 'admin'
    });

    await Audit.create({
        userId: req.user._id,
        orgId: organization._id,
        action: 'CREATE_ORGANIZATION',
        details: { name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    return sendSuccess(res, 201, {
        message: 'Organization created successfully',
        organization
    });
});

export const joinOrganization = catchAsync(async (req, res) => {
    const { inviteCode } = req.body;

    if (!inviteCode) {
        throw new AppError('Invite code is required', 400);
    }

    const organization = await Organization.findOne({ inviteCode });
    if (!organization) {
        throw new AppError('Invalid invite code', 404);
    }

    const existingMember = await OrgMember.findOne({
        orgId: organization._id,
        userId: req.user._id
    });

    if (existingMember) {
        throw new AppError('You are already a member of this organization', 400);
    }

    const member = await OrgMember.create({
        orgId: organization._id,
        userId: req.user._id,
        role: 'member'
    });

    await Audit.create({
        userId: req.user._id,
        orgId: organization._id,
        action: 'JOIN_ORGANIZATION',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    return sendSuccess(res, 200, {
        message: 'Joined organization successfully',
        organization
    });
});

export const getMyOrganizations = catchAsync(async (req, res) => {
    const memberships = await OrgMember.find({ userId: req.user._id }).populate('orgId');
    const organizations = memberships.map(m => ({
        ...m.orgId.toObject(),
        role: m.role
    }));

    return sendSuccess(res, 200, { organizations });
});

export const getOrganizationMembers = catchAsync(async (req, res) => {
    const { orgId } = req.params;

    // Check if user is member
    const isMember = await OrgMember.findOne({ orgId, userId: req.user._id });
    if (!isMember) {
        throw new AppError('You are not a member of this organization', 403);
    }

    const members = await OrgMember.find({ orgId }).populate('userId', 'name email role');
    return sendSuccess(res, 200, { members });
});

export const updateMemberRole = catchAsync(async (req, res) => {
    const { orgId, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'moderator', 'member'].includes(role)) {
        throw new AppError('Invalid role', 400);
    }

    // Check if requester is admin of the org
    const requester = await OrgMember.findOne({ orgId, userId: req.user._id });
    if (!requester || requester.role !== 'admin') {
        throw new AppError('Only organization admins can update roles', 403);
    }

    const member = await OrgMember.findOneAndUpdate(
        { orgId, userId },
        { role },
        { new: true }
    );

    if (!member) {
        throw new AppError('Member not found', 404);
    }

    await Audit.create({
        userId: req.user._id,
        orgId,
        action: 'UPDATE_MEMBER_ROLE',
        details: { memberUserId: userId, newRole: role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    return sendSuccess(res, 200, {
        message: 'Member role updated successfully',
        member
    });
});

export const leaveOrganization = catchAsync(async (req, res) => {
    const { orgId } = req.params;

    const membership = await OrgMember.findOne({ orgId, userId: req.user._id });
    if (!membership) {
        throw new AppError('You are not a member of this organization', 404);
    }

    if (membership.role === 'admin') {
        const otherAdmins = await OrgMember.countDocuments({ orgId, role: 'admin', userId: { $ne: req.user._id } });
        if (otherAdmins === 0) {
            throw new AppError('You cannot leave as the only admin. Assign someone else first or delete the organization.', 400);
        }
    }

    await OrgMember.deleteOne({ _id: membership._id });

    await Audit.create({
        userId: req.user._id,
        orgId,
        action: 'LEAVE_ORGANIZATION',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    return sendSuccess(res, 200, { message: 'Left organization successfully' });
});

export const getOrgLogs = catchAsync(async (req, res) => {
    const { orgId } = req.params;

    const requester = await OrgMember.findOne({ orgId, userId: req.user._id });
    if (!requester || requester.role !== 'admin') {
        throw new AppError('Only organization admins can view logs', 403);
    }

    const logs = await Audit.find({ orgId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(100);

    return sendSuccess(res, 200, { logs });
});
