import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    phone: {
        type: Number,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'reviewer'],
        default: 'user'
    },
    resettoken: {
        type: String,
    },
    resettokenexpiry: {
        type: Date,
    },
    profilePic: {
        type: String
    },
    isrRoleAccepted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });   

// Hash password before saving

userSchema.pre("save", async  function() {
    if (!this.isModified("password")) {
        return;
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        throw(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async  function(candidatePassword)  {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("user", userSchema);

export default User;