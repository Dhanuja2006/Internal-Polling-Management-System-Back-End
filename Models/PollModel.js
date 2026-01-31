import mongoose from "mongoose";

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
            trim: true
        },
        votes: {
            type: Number,
            default: 0
        }
    }],
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

// Ensure at least 2 options
pollSchema.pre('save', function (next) {
    if (this.options.length < 2) {
        next(new Error('Poll must have at least 2 options'));
    }
    next();
});

const Poll = mongoose.model("poll", pollSchema);

export default Poll;
