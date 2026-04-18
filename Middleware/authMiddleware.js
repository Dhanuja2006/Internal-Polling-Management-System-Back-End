import jwt from 'jsonwebtoken';
import User from '../Models/UserModel.js';
import env from '../Config/env.js';
import AppError from '../Utils/AppError.js';
import catchAsync from '../Utils/catchAsync.js';

export const authMiddleware = catchAsync(async (req, res, next) => {
    let token;

    if (req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new AppError('Not authorized, no token provided', 401);
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
        throw new AppError('User not found', 401);
    }

    next();
});

export const roleAcceptedMiddleware = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('User not authenticated', 401));
    }

    if (!req.user.isrRoleAccepted) {
        return next(
            new AppError('Access denied. Please accept your role first to access this resource.', 403, {
                requiresRoleAcceptance: true
            })
        );
    }

    next();
};

export const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    return next(new AppError('Access denied. Admin privileges required.', 403));
};

export const userMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        return next();
    }

    return next(new AppError('Access denied. User privileges required.', 403));
};
