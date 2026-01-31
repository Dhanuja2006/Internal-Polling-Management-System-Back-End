import express from 'express';
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './Database/connection.js';
import authRouter from './Routers/authRouter.js';
import cookieParser from 'cookie-parser';
import adminRouter from './Routers/adminRouter.js';
import pollRouter from './Routers/pollRouter.js';
import voteRouter from './Routers/voteRouter.js';

dotenv.config();

const port = process.env.PORT || 8080;
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.get("/", (req, res) => {
    res.status(200).json({ msg: "Internal Polling Management System API is running", version: "1.0.0" });
});

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/polls", pollRouter);
app.use("/api/v1/votes", voteRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(port, () => {
    connectDB();
    console.log("Internal Polling Management System server is running on port", port);
});