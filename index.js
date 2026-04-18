import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './Database/connection.js';
import authRouter from './Routers/authRouter.js';
import adminRouter from './Routers/adminRouter.js';
import pollRouter from './Routers/pollRouter.js';
import voteRouter from './Routers/voteRouter.js';
import organizationRouter from './Routers/organizationRouter.js';
import env from './Config/env.js';
import { errorHandler, notFoundHandler } from './Middleware/errorMiddleware.js';
import { requestLogger } from './Middleware/requestMiddleware.js';
import { apiLimiter, authLimiter } from './Middleware/rateLimitMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// Attach io to app to use in controllers
app.set('io', io);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('joinPoll', (pollId) => {
        socket.join(`poll_${pollId}`);
        console.log(`Socket ${socket.id} joined poll_${pollId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const defaultOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...env.corsOrigins]));

app.disable('x-powered-by');
app.use(helmet());
app.use(morgan('dev'));
app.use(requestLogger);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Internal Polling Management System API is running',
        environment: env.nodeEnv,
        version: '2.0.0'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.use('/api', apiLimiter);
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/polls', pollRouter);
app.use('/api/v1/votes', voteRouter);
app.use('/api/v1/organizations', organizationRouter);

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle frontend routing - serve index.html for unknown routes if they don't start with /api
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
    try {
        await connectDB();
        const server = httpServer.listen(env.port, () => {
            console.log(`Internal Polling Management System server is running on port ${env.port}`);
        });

        // Handle server errors (e.g., EADDRINUSE)
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${env.port} is already in use. Please kill the process or use a different port.`);
            } else {
                console.error('Server error:', error);
            }
            process.exit(1);
        });

        // Graceful shutdown
        const shutdown = () => {
            console.log('Shutting down server...');
            server.close(() => {
                console.log('Server closed. Exiting process.');
                process.exit(0);
            });
            // Force exit after 5 seconds
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 5000);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        console.error('Failed to start server', error);
        process.exit(1);
    }
};

export { io };
startServer();
