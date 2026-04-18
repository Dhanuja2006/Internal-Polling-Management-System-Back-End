import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Poll title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    options: [{
        optionText: {
            type: String,
            required: [true, 'Option text is required'],
            trim: true,
            minlength: [1, 'Option text cannot be empty'],
            maxlength: [120, 'Option text cannot exceed 120 characters']
        }
    }],
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organization'
    },
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }
}, { timestamps: true });

pollSchema.pre('save', async function () {
    if (this.options.length < 2) {
        throw new Error('Poll must have at least 2 options');
    }
    if (this.endTime <= this.startTime) {
        throw new Error('End time must be after start time');
    }
});

const Poll = mongoose.model('poll', pollSchema);

export default Poll;
