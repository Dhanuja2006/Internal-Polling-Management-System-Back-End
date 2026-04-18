import AppError from '../Utils/AppError.js';
import env from '../Config/env.js';

const buildErrorPayload = (error) => {
    if (error.name === 'ValidationError') {
        const details = Object.values(error.errors).map((item) => item.message);
        return new AppError('Validation failed', 400, details);
    }

    if (error.code === 11000) {
        const duplicateFields = Object.keys(error.keyPattern || {});
        const fieldLabel = duplicateFields.length ? duplicateFields.join(', ') : 'resource';
        return new AppError(`Duplicate value for ${fieldLabel}`, 409);
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return new AppError('Authentication token is invalid or expired', 401);
    }

    if (error.name === 'CastError') {
        return new AppError(`Invalid ${error.path}`, 400);
    }

    if (typeof error.message === 'string' && error.message.startsWith('CORS policy:')) {
        return new AppError(error.message, 403);
    }

    return error;
};

export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
};

export const errorHandler = (error, req, res, next) => {
    const normalizedError = buildErrorPayload(error);
    const statusCode = normalizedError.statusCode || 500;
    const message = normalizedError.message || 'Internal server error';

    if (statusCode >= 500) {
        console.error('[ERROR]', {
            method: req.method,
            path: req.originalUrl,
            message: error.message,
            stack: error.stack
        });
    }

    res.status(statusCode).json({
        success: false,
        message,
        details: normalizedError.details,
        ...(env.isProduction ? {} : { stack: statusCode >= 500 ? error.stack : undefined })
    });
};
