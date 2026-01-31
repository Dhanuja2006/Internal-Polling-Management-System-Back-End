import jwt from 'jsonwebtoken';
import User from '../Models/UserModel.js';

// Verify JWT token and attach user to request
export const authMiddleware = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookies or Authorization header
        if (req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};

// Check if user has accepted their role
export const roleAcceptedMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }

    if (!req.user.isrRoleAccepted) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Please accept your role first to access this resource.',
            requiresRoleAcceptance: true
        });
    }

    next();
};

// Check if user is admin
export const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
};

// Check if user is regular user (not admin)
export const userMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. User privileges required.'
        });
    }
};
