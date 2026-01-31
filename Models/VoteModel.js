import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
    pollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'poll',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    optionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, { timestamps: true });

// CRITICAL: Enforce one vote per user per poll
voteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

const Vote = mongoose.model("vote", voteSchema);

export default Vote;
