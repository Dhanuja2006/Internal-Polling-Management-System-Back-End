import mongoose from 'mongoose';
import AppError from './AppError.js';

export const assertRequired = (fields, source) => {
    const missing = fields.filter((field) => {
        const value = source[field];
        return value === undefined || value === null || value === '';
    });

    if (missing.length) {
        throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 400);
    }
};

export const assertObjectId = (value, label = 'id') => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(`Invalid ${label}`, 400);
    }
};

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const normalizePhone = (phone) => {
    if (phone === undefined || phone === null || phone === '') {
        return undefined;
    }

    return String(phone).trim();
};

export const sanitizePollOptions = (options) => {
    if (!Array.isArray(options) || options.length < 2) {
        throw new AppError('Please provide at least 2 poll options', 400);
    }

    const normalized = options
        .map((option) => (typeof option === 'string' ? option : option?.optionText))
        .map((option) => String(option || '').trim())
        .filter(Boolean);

    if (normalized.length < 2) {
        throw new AppError('Please provide at least 2 valid poll options', 400);
    }

    const unique = Array.from(new Set(normalized.map((option) => option.toLowerCase())));
    if (unique.length !== normalized.length) {
        throw new AppError('Poll options must be unique', 400);
    }

    return normalized.map((optionText) => ({ optionText }));
};
