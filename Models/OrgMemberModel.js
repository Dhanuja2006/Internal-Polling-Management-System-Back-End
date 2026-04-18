import mongoose from 'mongoose';

const orgMemberSchema = new mongoose.Schema({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organization',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'moderator', 'member'],
        default: 'member'
    }
}, { timestamps: true });

// Ensure a user can only be in an organization once
orgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });

const OrgMember = mongoose.model('orgmember', orgMemberSchema);

export default OrgMember;
